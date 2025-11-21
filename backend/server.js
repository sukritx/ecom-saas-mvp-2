const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { FileHandler } = require('./utils/fileHandler');
const SmartLayout = require('./utils/smartLayout');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for multipart form data
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 30 // Maximum 30 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 
      'text/csv', 'application/vnd.ms-excel',
      'font/ttf', 'font/woff', 'font/woff2', 
      'application/x-font-ttf', 'application/x-font-woff'
    ];
    const allowedExtensions = /\.(jpg|jpeg|png|webp|svg|csv|ttf|woff|woff2)$/i;
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images, CSV, and fonts are allowed.`), false);
    }
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI-Driven E-Commerce Campaign Asset Generator API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Generate new session ID
app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

// File upload endpoint
app.post('/api/upload', upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'icons', maxCount: 5 },
  { name: 'frame', maxCount: 1 },
  { name: 'csvFile', maxCount: 1 },
  { name: 'fonts', maxCount: 5 }
]), async (req, res) => {
  try {
    const { campaignName, platform } = req.body;
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Validate that at least one file was uploaded
    const hasFiles = req.files.productImages || req.files.icons || req.files.frame || req.files.csvFile || req.files.fonts;
    if (!hasFiles) {
      return res.status(400).json({ error: 'At least one file must be uploaded' });
    }

    const campaignData = {
      campaignName: campaignName || 'Untitled Campaign',
      platform: platform || 'general'
    };

    const result = await FileHandler.upload(req.files, sessionId, campaignData);
    
    res.json({
      success: true,
      sessionId: result.sessionId,
      files: result.files,
      message: result.message
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Get session files endpoint
app.get('/api/files/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const files = await FileHandler.getSessionFiles(sessionId);
    
    res.json({
      success: true,
      data: files
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(404).json({ 
      error: 'Session not found',
      message: error.message 
    });
  }
});

// Get layout recommendations endpoint
app.get('/api/layouts/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session files
    const sessionFiles = await FileHandler.getSessionFiles(sessionId);
    
    // Load image buffers for analysis
    const products = [];
    for (const product of sessionFiles.products) {
      try {
        const fs = require('fs');
        const imageBuffer = fs.readFileSync(path.join(__dirname, 'uploads', sessionId, 'products', product.fileName));
        const analysis = await SmartLayout.analyzeImage(imageBuffer, product.fileName);
        analysis.url = product.url;
        products.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze product ${product.fileName}:`, error);
      }
    }

    const frame = sessionFiles.frame ? {
      url: sessionFiles.frame.url,
      fileName: sessionFiles.frame.fileName
    } : null;

    const icons = sessionFiles.icons.map(icon => ({
      url: icon.url,
      fileName: icon.fileName
    }));

    // Generate layout recommendations
    const layouts = await SmartLayout.generateLayoutRecommendations(products, frame, icons);
    
    res.json({
      success: true,
      sessionId,
      layouts,
      productCount: products.length,
      hasFrame: !!frame,
      iconCount: icons.length
    });

  } catch (error) {
    console.error('Layout generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate layouts',
      message: error.message 
    });
  }
});

// Process files endpoint
app.post('/api/process', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session files and generate initial layouts
    const sessionFiles = await FileHandler.getSessionFiles(sessionId);
    
    // Load image buffers and analyze
    const processedProducts = [];
    for (const product of sessionFiles.products) {
      try {
        const fs = require('fs');
        const imageBuffer = fs.readFileSync(path.join(__dirname, 'uploads', sessionId, 'products', product.fileName));
        const analysis = await SmartLayout.analyzeImage(imageBuffer, product.fileName);
        
        processedProducts.push({
          id: `product_${processedProducts.length + 1}`,
          name: product.fileName,
          url: product.url,
          analysis,
          layoutConfig: null // Will be assigned later
        });
      } catch (error) {
        console.warn(`Failed to process product ${product.fileName}:`, error);
      }
    }

    const result = {
      success: true,
      sessionId,
      products: processedProducts,
      csvData: sessionFiles.csvData || [],
      summary: {
        totalProducts: processedProducts.length,
        hasCsvData: !!(sessionFiles.csvData && sessionFiles.csvData.length > 0),
        hasFrame: !!sessionFiles.frame,
        iconCount: sessionFiles.icons.length
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      error: 'Processing failed',
      message: error.message 
    });
  }
});

// Generate campaign endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { sessionId, layout } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session files
    const sessionFiles = await FileHandler.getSessionFiles(sessionId);
    
    // Generate final campaign assets (simplified implementation)
    const generatedAssets = [];
    
    // Create mock generated assets based on the layout
    if (layout && layout.type) {
      const assetId = `asset_${Date.now()}`;
      const baseUrl = `/uploads/${sessionId}/processed`;
      
      generatedAssets.push({
        id: assetId,
        type: layout.type,
        name: `${layout.name || 'Campaign Asset'}.png`,
        url: `${baseUrl}/${assetId}.png`,
        thumbnailUrl: `${baseUrl}/${assetId}_thumb.png`,
        width: layout.recommendedSize?.width || 1200,
        height: layout.recommendedSize?.height || 1200,
        format: 'png',
        size: Math.floor(Math.random() * 500000) + 100000, // Mock size
        layout: layout,
        created: new Date().toISOString()
      });
    }

    // If no specific layout, create assets for all recommended layouts
    if (!layout) {
      try {
        const layoutsResponse = await fetch(`http://localhost:${PORT}/api/layouts/${sessionId}`);
        if (layoutsResponse.ok) {
          const layoutsData = await layoutsResponse.json();
          for (const layoutOption of layoutsData.layouts) {
            const assetId = `asset_${layoutOption.type}_${Date.now()}`;
            generatedAssets.push({
              id: assetId,
              type: layoutOption.type,
              name: `${layoutOption.name}.png`,
              url: `/uploads/${sessionId}/processed/${assetId}.png`,
              thumbnailUrl: `/uploads/${sessionId}/processed/${assetId}_thumb.png`,
              width: layoutOption.recommendedSize?.width || 1200,
              height: layoutOption.recommendedSize?.height || 1200,
              format: 'png',
              size: Math.floor(Math.random() * 500000) + 100000,
              layout: layoutOption,
              created: new Date().toISOString()
            });
          }
        }
      } catch (layoutError) {
        console.warn('Could not fetch layouts for auto-generation:', layoutError);
      }
    }

    res.json({
      success: true,
      sessionId,
      assets: generatedAssets,
      count: generatedAssets.length,
      message: generatedAssets.length > 0 
        ? `Generated ${generatedAssets.length} campaign asset(s)` 
        : 'No assets generated'
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Generation failed',
      message: error.message 
    });
  }
});

// Session management endpoints
app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const status = await FileHandler.getSessionStatus(sessionId);
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ 
      error: 'Failed to get session status',
      message: error.message 
    });
  }
});

app.delete('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const success = await FileHandler.cleanupSession(sessionId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Session not found'
      });
    }

  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete session',
      message: error.message 
    });
  }
});

// Download assets endpoint
app.get('/api/download/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { format = 'zip' } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // For now, return a simple response since we haven't implemented actual file generation
    res.json({
      success: true,
      message: 'Download functionality not fully implemented yet',
      downloadUrl: `/uploads/${sessionId}/download.zip`,
      format,
      estimatedSize: '0 bytes'
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed',
      message: error.message 
    });
  }
});

// Campaign management endpoints
app.post('/api/campaign', async (req, res) => {
  try {
    const { sessionId, campaignName, platform } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!campaignName) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    // Update session with campaign data
    const fs = require('fs');
    const sessionPath = path.join(__dirname, 'uploads', sessionId, 'session.json');
    
    if (!fs.existsSync(sessionPath)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    sessionData.campaignName = campaignName;
    sessionData.platform = platform || 'general';
    sessionData.updatedAt = new Date().toISOString();

    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

    res.json({
      success: true,
      message: 'Campaign data updated',
      campaign: {
        sessionId,
        campaignName,
        platform: sessionData.platform
      }
    });

  } catch (error) {
    console.error('Campaign update error:', error);
    res.status(500).json({ 
      error: 'Failed to update campaign',
      message: error.message 
    });
  }
});

app.get('/api/campaign/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const fs = require('fs');
    const sessionPath = path.join(__dirname, 'uploads', sessionId, 'session.json');
    
    if (!fs.existsSync(sessionPath)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

    res.json({
      success: true,
      campaign: {
        sessionId,
        campaignName: sessionData.campaignName,
        platform: sessionData.platform || 'general',
        uploadDate: sessionData.uploadDate,
        updatedAt: sessionData.updatedAt
      }
    });

  } catch (error) {
    console.error('Campaign fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaign',
      message: error.message 
    });
  }
});

// CSV data endpoint
app.get('/api/csv/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionFiles = await FileHandler.getSessionFiles(sessionId);

    if (!sessionFiles.csvData || sessionFiles.csvData.length === 0) {
      return res.status(404).json({ 
        error: 'No CSV data found',
        message: 'Please upload a CSV file first'
      });
    }

    res.json({
      success: true,
      sessionId,
      csvData: sessionFiles.csvData,
      rowCount: sessionFiles.csvData.length,
      hasData: true
    });

  } catch (error) {
    console.error('CSV fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch CSV data',
      message: error.message 
    });
  }
});

// Product matching endpoint
app.post('/api/match-products', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionFiles = await FileHandler.getSessionFiles(sessionId);

    if (!sessionFiles.csvData || sessionFiles.csvData.length === 0) {
      return res.status(400).json({ 
        error: 'No CSV data found',
        message: 'Please upload a CSV file first'
      });
    }

    if (!sessionFiles.products || sessionFiles.products.length === 0) {
      return res.status(400).json({ 
        error: 'No product images found',
        message: 'Please upload product images first'
      });
    }

    // Perform matching
    const matchingResults = FileHandler.matchImagesToProducts(
      sessionFiles.products,
      sessionFiles.csvData
    );

    // Optionally rename files
    if (matchingResults.matched.length > 0) {
      const renamedFiles = await FileHandler.renameImagesToSKU(sessionId, matchingResults.matched);
      matchingResults.renamedFiles = renamedFiles;
    }

    res.json({
      success: true,
      sessionId,
      matching: matchingResults,
      message: `Matched ${matchingResults.matched.length} of ${sessionFiles.products.length} images`
    });

  } catch (error) {
    console.error('Product matching error:', error);
    res.status(500).json({ 
      error: 'Failed to match products',
      message: error.message 
    });
  }
});

// Template analysis endpoint
app.post('/api/analyze-template', async (req, res) => {
  try {
    const { sessionId, templateType } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionFiles = await FileHandler.getSessionFiles(sessionId);
    const fs = require('fs');
    const sessionPath = path.join(__dirname, 'uploads', sessionId, 'session.json');
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

    // Analyze which template works best for this campaign
    const analysis = {
      platform: sessionData.platform || 'general',
      campaignName: sessionData.campaignName,
      productCount: sessionFiles.products.length,
      hasFrame: !!sessionFiles.frame,
      iconCount: sessionFiles.icons.length,
      hasCsvData: !!(sessionFiles.csvData && sessionFiles.csvData.length > 0),
      recommendedTemplates: []
    };

    // Template recommendations based on platform and data
    if (sessionData.platform === 'lazada' || sessionData.platform === 'shopee') {
      analysis.recommendedTemplates.push({
        type: 'ecommerce-grid',
        name: 'E-commerce Product Grid',
        reason: 'Optimized for marketplace platforms',
        priority: 1
      });
    }

    if (sessionFiles.csvData && sessionFiles.csvData.length > 0) {
      analysis.recommendedTemplates.push({
        type: 'data-driven',
        name: 'Data-Driven Layout',
        reason: 'CSV data available for dynamic text',
        priority: 2
      });
    }

    if (sessionFiles.frame) {
      analysis.recommendedTemplates.push({
        type: 'framed-showcase',
        name: 'Framed Product Showcase',
        reason: 'Custom frame detected',
        priority: 3
      });
    }

    res.json({
      success: true,
      sessionId,
      analysis
    });

  } catch (error) {
    console.error('Template analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze template',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: 'File too large',
      message: 'Maximum file size is 50MB' 
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ 
      error: 'Too many files',
      message: 'Maximum 20 files allowed' 
    });
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌐 CORS enabled for: http://localhost:3000`);
});

module.exports = app;