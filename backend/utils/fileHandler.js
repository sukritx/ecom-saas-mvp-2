const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and SVG are allowed.'), false);
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
      processed: path.join(baseDir, 'processed')
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
   * @param {string} campaignName - Campaign name
   * @returns {Promise<Object>} Upload result
   */
  static async upload(files, sessionId, campaignName) {
    try {
      const directories = this.createSessionDirectories(sessionId);
      const uploadedFiles = {
        products: [],
        icons: [],
        frame: [],
        csv: null,
        campaignName
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

      // Process CSV file
      if (files.csvFile) {
        const csvFile = Array.isArray(files.csvFile) ? files.csvFile[0] : files.csvFile;
        const csvExtension = path.extname(csvFile.originalname);
        const csvFileName = `${uuidv4()}${csvExtension}`;
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

        // Parse CSV data
        const csvData = await this.parseCSV(csvPath);
        uploadedFiles.csvData = csvData;
      }

      // Save session info
      const sessionInfo = {
        sessionId,
        campaignName,
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