const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const Papa = require('papaparse');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'text/csv', 'application/vnd.ms-excel', 'font/ttf', 'font/woff', 'font/woff2', 'application/x-font-ttf', 'application/x-font-woff'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|ttf|woff|woff2)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, CSV, and font files are allowed.'), false);
    }
  }
});

class FileHandler {
  /**
   * Create session directory structure
   * @param {string} sessionId - Unique session identifier
   * @returns {Object} Directory paths
   */
  static createSessionDirectories(sessionId) {
    const baseDir = path.join(__dirname, '..', 'uploads', sessionId);
    const directories = {
      base: baseDir,
      products: path.join(baseDir, 'products'),
      icons: path.join(baseDir, 'icons'),
      frame: path.join(baseDir, 'frame'),
      processed: path.join(baseDir, 'processed'),
      fonts: path.join(baseDir, 'fonts')
    };

    // Create all directories
    Object.values(directories).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    return directories;
  }

  /**
   * Parse CSV file using PapaParse with enhanced column mapping
   * @param {Buffer|string} csvData - CSV file buffer or path
   * @returns {Promise<Object>} Parsed CSV data with column mapping
   */
  static async parseProductCSV(csvData) {
    return new Promise((resolve, reject) => {
      try {
        let csvString;
        if (Buffer.isBuffer(csvData)) {
          csvString = csvData.toString('utf8');
        } else if (typeof csvData === 'string' && fs.existsSync(csvData)) {
          csvString = fs.readFileSync(csvData, 'utf8');
        } else {
          csvString = csvData;
        }

        const result = Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
          transform: (value) => value.trim()
        });

        if (result.errors.length > 0) {
          console.warn('CSV parsing warnings:', result.errors);
        }

        // Map common column variations
        const columnMapping = {
          sku: ['sku', 'product_sku', 'item_sku', 'code', 'product_code'],
          brand: ['brand', 'brand_name', 'manufacturer'],
          product_name: ['product_name', 'name', 'title', 'product_title', 'item_name'],
          full_price: ['full_price', 'original_price', 'price', 'msrp', 'retail_price'],
          discounted_price: ['discounted_price', 'sale_price', 'promo_price', 'special_price'],
          discount_percent: ['discount_percent', 'discount', 'discount_%', 'off'],
          description: ['description', 'product_description', 'details'],
          category: ['category', 'product_category', 'type'],
          image_url: ['image_url', 'image', 'product_image', 'photo']
        };

        // Normalize data with column mapping
        const normalizedData = result.data.map((row, index) => {
          const normalizedRow = { _rowIndex: index };
          
          for (const [standardKey, variations] of Object.entries(columnMapping)) {
            for (const variation of variations) {
              if (row[variation] !== undefined && row[variation] !== '') {
                normalizedRow[standardKey] = row[variation];
                break;
              }
            }
          }

          // Keep original columns too
          Object.assign(normalizedRow, row);
          
          return normalizedRow;
        });

        resolve({
          success: true,
          data: normalizedData,
          columns: result.meta.fields,
          rowCount: normalizedData.length,
          columnMapping
        });

      } catch (error) {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  }

  /**
   * Match uploaded images to CSV SKUs
   * @param {Array} images - Array of uploaded image objects
   * @param {Array} csvData - Parsed CSV data
   * @returns {Object} Matched and unmatched items
   */
  static matchImagesToProducts(images, csvData) {
    const matched = [];
    const unmatched = [];
    const unmatchedImages = [];

    // Create SKU lookup map
    const skuMap = new Map();
    csvData.forEach((product, index) => {
      if (product.sku) {
        skuMap.set(product.sku.toLowerCase(), { ...product, csvIndex: index });
      }
    });

    // Try to match each image to a SKU
    images.forEach(image => {
      const originalName = image.originalName || image.fileName;
      const nameWithoutExt = path.basename(originalName, path.extname(originalName));
      
      // Try different matching strategies
      let matchedProduct = null;
      
      // Strategy 1: Exact SKU match
      if (skuMap.has(nameWithoutExt.toLowerCase())) {
        matchedProduct = skuMap.get(nameWithoutExt.toLowerCase());
      }
      
      // Strategy 2: SKU contained in filename
      if (!matchedProduct) {
        for (const [sku, product] of skuMap.entries()) {
          if (nameWithoutExt.toLowerCase().includes(sku)) {
            matchedProduct = product;
            break;
          }
        }
      }

      // Strategy 3: Filename contained in SKU
      if (!matchedProduct) {
        for (const [sku, product] of skuMap.entries()) {
          if (sku.includes(nameWithoutExt.toLowerCase())) {
            matchedProduct = product;
            break;
          }
        }
      }

      if (matchedProduct) {
        matched.push({
          image,
          product: matchedProduct,
          matchedSku: matchedProduct.sku
        });
      } else {
        unmatchedImages.push(image);
      }
    });

    // Find unmatched CSV products
    const matchedSkus = new Set(matched.map(m => m.matchedSku.toLowerCase()));
    csvData.forEach(product => {
      if (product.sku && !matchedSkus.has(product.sku.toLowerCase())) {
        unmatched.push(product);
      }
    });

    return {
      matched,
      unmatchedProducts: unmatched,
      unmatchedImages,
      matchRate: images.length > 0 ? (matched.length / images.length * 100).toFixed(1) : 0
    };
  }

  /**
   * Rename image files to match SKU
   * @param {string} sessionId - Session identifier
   * @param {Array} matchedItems - Array of matched image-product pairs
   * @returns {Promise<Array>} Renamed file information
   */
  static async renameImagesToSKU(sessionId, matchedItems) {
    const directories = this.createSessionDirectories(sessionId);
    const renamedFiles = [];

    for (const item of matchedItems) {
      const { image, product } = item;
      const oldPath = image.path;
      const extension = path.extname(image.fileName);
      const newFileName = `${product.sku}${extension}`;
      const newPath = path.join(directories.products, newFileName);

      try {
        if (fs.existsSync(oldPath) && oldPath !== newPath) {
          fs.renameSync(oldPath, newPath);
          renamedFiles.push({
            originalName: image.originalName,
            oldFileName: image.fileName,
            newFileName,
            sku: product.sku,
            url: `/uploads/${sessionId}/products/${newFileName}`
          });
        }
      } catch (error) {
        console.error(`Failed to rename ${image.fileName}:`, error);
      }
    }

    return renamedFiles;
  }

  /**
   * Process and save font file
   * @param {Object} file - Font file from multer
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Font file information
   */
  static async processFontFile(file, sessionId) {
    try {
      const directories = this.createSessionDirectories(sessionId);
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fontName = path.basename(file.originalname, fileExtension);
      const fileName = `${fontName}${fileExtension}`;
      const filePath = path.join(directories.fonts, fileName);

      // Save font file
      fs.writeFileSync(filePath, file.buffer);

      const stats = fs.statSync(filePath);

      return {
        fileName,
        originalName: file.originalname,
        fontName,
        path: filePath,
        size: stats.size,
        mimetype: file.mimetype,
        format: fileExtension.replace('.', ''),
        sessionId,
        url: `/uploads/${sessionId}/fonts/${fileName}`
      };
    } catch (error) {
      throw new Error(`Failed to process font file: ${error.message}`);
    }
  }

  /**
   * Process and save uploaded file
   * @param {Object} file - File object from multer
   * @param {string} sessionId - Session identifier
   * @param {string} category - File category (products, icons, frame)
   * @returns {Promise<Object>} File information
   */
  static async processAndSaveFile(file, sessionId, category) {
    try {
      const directories = this.createSessionDirectories(sessionId);
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(directories[category], fileName);

      // Process image with sharp (resize, optimize)
      let processedImage;
      if (file.mimetype !== 'image/svg+xml') {
        processedImage = await sharp(file.buffer)
          .resize(2048, 2048, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85 })
          .toBuffer();
      } else {
        processedImage = file.buffer;
      }

      // Save processed file
      fs.writeFileSync(filePath, processedImage);

      // Get file stats
      const stats = fs.statSync(filePath);

      return {
        fileName,
        originalName: file.originalname,
        path: filePath,
        size: stats.size,
        mimetype: file.mimetype,
        category,
        sessionId,
        url: `/uploads/${sessionId}/${category}/${fileName}`
      };
    } catch (error) {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Read and parse CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} Parsed CSV data
   */
  static async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const products = [];
      const stream = fs.createReadStream(filePath);
      const csv = require('csv-parser');
      
      stream
        .pipe(csv())
        .on('data', (data) => products.push(data))
        .on('end', () => resolve(products))
        .on('error', reject);
    });
  }

  /**
   * Validate file upload configuration
   * @param {string} category - File category
   * @param {number} maxFiles - Maximum number of files
   * @returns {Object} Multer configuration
   */
  static getMulterConfig(category, maxFiles = 10) {
    return {
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: maxFiles
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file type for ${category}. Only images are allowed.`), false);
        }
      }
    };
  }

  /**
   * Clean up session files
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} Success status
   */
  static async cleanupSession(sessionId) {
    try {
      const sessionDir = path.join(__dirname, '..', 'uploads', sessionId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cleanup session:', error);
      return false;
    }
  }

  /**
   * Get file information
   * @param {string} filePath - Path to file
   * @returns {Object} File information
   */
  static getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Handle file upload from multipart form
   * @param {Object} files - Files object from multer
   * @param {string} sessionId - Session identifier
   * @param {Object} campaignData - Campaign information (name, platform)
   * @returns {Promise<Object>} Upload result
   */
  static async upload(files, sessionId, campaignData = {}) {
    try {
      const directories = this.createSessionDirectories(sessionId);
      const uploadedFiles = {
        products: [],
        icons: [],
        frame: [],
        fonts: [],
        csv: null,
        csvData: null,
        matchingResults: null,
        campaignName: campaignData.campaignName || 'Untitled Campaign',
        platform: campaignData.platform || 'general'
      };

      // Process product images
      if (files.productImages) {
        const products = Array.isArray(files.productImages) ? files.productImages : [files.productImages];
        for (const file of products) {
          const result = await this.processAndSaveFile(file, sessionId, 'products');
          uploadedFiles.products.push(result);
        }
      }

      // Process icons
      if (files.icons) {
        const icons = Array.isArray(files.icons) ? files.icons : [files.icons];
        for (const file of icons) {
          const result = await this.processAndSaveFile(file, sessionId, 'icons');
          uploadedFiles.icons.push(result);
        }
      }

      // Process frame
      if (files.frame) {
        const frame = Array.isArray(files.frame) ? files.frame[0] : files.frame;
        const result = await this.processAndSaveFile(frame, sessionId, 'frame');
        uploadedFiles.frame = result;
      }

      // Process font files
      if (files.fonts) {
        const fonts = Array.isArray(files.fonts) ? files.fonts : [files.fonts];
        for (const file of fonts) {
          const result = await this.processFontFile(file, sessionId);
          uploadedFiles.fonts.push(result);
        }
      }

      // Process CSV file with enhanced parsing
      if (files.csvFile) {
        const csvFile = Array.isArray(files.csvFile) ? files.csvFile[0] : files.csvFile;
        const csvExtension = path.extname(csvFile.originalname);
        const csvFileName = `products${csvExtension}`;
        const csvPath = path.join(directories.base, csvFileName);
        
        fs.writeFileSync(csvPath, csvFile.buffer);
        
        uploadedFiles.csv = {
          fileName: csvFileName,
          originalName: csvFile.originalname,
          path: csvPath,
          size: csvFile.size,
          mimetype: csvFile.mimetype,
          sessionId,
          url: `/uploads/${sessionId}/${csvFileName}`
        };

        // Parse CSV data with enhanced parser
        const parsedCSV = await this.parseProductCSV(csvFile.buffer);
        uploadedFiles.csvData = parsedCSV;

        // Match images to CSV SKUs if both exist
        if (uploadedFiles.products.length > 0 && parsedCSV.success) {
          const matchingResults = this.matchImagesToProducts(
            uploadedFiles.products,
            parsedCSV.data
          );
          uploadedFiles.matchingResults = matchingResults;

          // Optionally auto-rename matched images to SKU
          if (matchingResults.matched.length > 0) {
            const renamedFiles = await this.renameImagesToSKU(sessionId, matchingResults.matched);
            uploadedFiles.renamedFiles = renamedFiles;
            
            // Update product file references
            renamedFiles.forEach(renamed => {
              const productIndex = uploadedFiles.products.findIndex(
                p => p.fileName === renamed.oldFileName
              );
              if (productIndex !== -1) {
                uploadedFiles.products[productIndex].fileName = renamed.newFileName;
                uploadedFiles.products[productIndex].url = renamed.url;
                uploadedFiles.products[productIndex].sku = renamed.sku;
              }
            });
          }
        }
      }

      // Save session info
      const sessionInfo = {
        sessionId,
        campaignName: uploadedFiles.campaignName,
        platform: uploadedFiles.platform,
        uploadDate: new Date().toISOString(),
        files: uploadedFiles
      };

      const sessionInfoPath = path.join(directories.base, 'session.json');
      fs.writeFileSync(sessionInfoPath, JSON.stringify(sessionInfo, null, 2));

      return {
        success: true,
        sessionId,
        files: uploadedFiles,
        message: 'Files uploaded successfully'
      };

    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Get all files for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session files structure
   */
  static async getSessionFiles(sessionId) {
    try {
      const directories = this.createSessionDirectories(sessionId);
      const sessionInfoPath = path.join(directories.base, 'session.json');
      
      // Check if session exists
      if (!fs.existsSync(sessionInfoPath)) {
        throw new Error('Session not found');
      }

      // Read session info
      const sessionInfo = JSON.parse(fs.readFileSync(sessionInfoPath, 'utf8'));
      
      const fileStructure = {
        sessionId,
        campaignName: sessionInfo.campaignName,
        uploadDate: sessionInfo.uploadDate,
        products: [],
        icons: [],
        frame: null,
        csv: sessionInfo.files?.csv || null,
        csvData: sessionInfo.files?.csvData || []
      };

      // Get product files
      if (fs.existsSync(directories.products)) {
        const productFiles = fs.readdirSync(directories.products);
        for (const fileName of productFiles) {
          if (fileName !== '.gitkeep') {
            const filePath = path.join(directories.products, fileName);
            const stats = fs.statSync(filePath);
            fileStructure.products.push({
              fileName,
              url: `/uploads/${sessionId}/products/${fileName}`,
              size: stats.size,
              uploaded: stats.birthtime
            });
          }
        }
      }

      // Get icon files
      if (fs.existsSync(directories.icons)) {
        const iconFiles = fs.readdirSync(directories.icons);
        for (const fileName of iconFiles) {
          if (fileName !== '.gitkeep') {
            const filePath = path.join(directories.icons, fileName);
            const stats = fs.statSync(filePath);
            fileStructure.icons.push({
              fileName,
              url: `/uploads/${sessionId}/icons/${fileName}`,
              size: stats.size,
              uploaded: stats.birthtime
            });
          }
        }
      }

      // Get frame file
      if (fs.existsSync(directories.frame)) {
        const frameFiles = fs.readdirSync(directories.frame);
        for (const fileName of frameFiles) {
          if (fileName !== '.gitkeep') {
            const filePath = path.join(directories.frame, fileName);
            const stats = fs.statSync(filePath);
            fileStructure.frame = {
              fileName,
              url: `/uploads/${sessionId}/frame/${fileName}`,
              size: stats.size,
              uploaded: stats.birthtime
            };
            break; // Only one frame file
          }
        }
      }

      return fileStructure;

    } catch (error) {
      throw new Error(`Failed to get session files: ${error.message}`);
    }
  }

  /**
   * Get session status
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session status
   */
  static async getSessionStatus(sessionId) {
    try {
      const directories = this.createSessionDirectories(sessionId);
      const sessionInfoPath = path.join(directories.base, 'session.json');
      
      if (!fs.existsSync(sessionInfoPath)) {
        return {
          sessionId,
          exists: false,
          status: 'not_found'
        };
      }

      const sessionInfo = JSON.parse(fs.readFileSync(sessionInfoPath, 'utf8'));
      
      return {
        sessionId,
        exists: true,
        status: 'active',
        campaignName: sessionInfo.campaignName,
        uploadDate: sessionInfo.uploadDate,
        fileCounts: {
          products: sessionInfo.files?.products?.length || 0,
          icons: sessionInfo.files?.icons?.length || 0,
          hasFrame: !!sessionInfo.files?.frame,
          hasCsv: !!sessionInfo.files?.csv
        }
      };

    } catch (error) {
      throw new Error(`Failed to get session status: ${error.message}`);
    }
  }
}

module.exports = {
  FileHandler,
  upload
};