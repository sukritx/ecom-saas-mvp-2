const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class SmartLayout {
  /**
   * Analyze image to extract key information
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} fileName - Name of the file
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeImage(imageBuffer, fileName) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      // Basic image analysis
      const analysis = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        aspectRatio: metadata.width / metadata.height,
        fileName: fileName,
        dominantColor: null,
        brightness: null,
        complexity: null,
        recommendedUse: this.determineRecommendedUse(metadata),
        layoutPriority: this.calculateLayoutPriority(metadata)
      };

      // Calculate brightness (basic implementation)
      analysis.brightness = await this.calculateBrightness(imageBuffer);
      
      // Calculate complexity (edge detection approximation)
      analysis.complexity = await this.calculateComplexity(imageBuffer);

      // Get dominant color (simplified)
      analysis.dominantColor = await this.getDominantColor(imageBuffer);

      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * Determine recommended use based on image properties
   * @param {Object} metadata - Sharp metadata
   * @returns {string} Recommended use
   */
  static determineRecommendedUse(metadata) {
    const { width, height } = metadata;
    const aspectRatio = width / height;

    if (aspectRatio > 1.5) {
      return 'banner'; // Wide format
    } else if (aspectRatio < 0.8) {
      return 'vertical'; // Tall format
    } else {
      return 'square'; // Square format
    }
  }

  /**
   * Calculate layout priority (1-5 scale)
   * @param {Object} metadata - Sharp metadata
   * @returns {number} Priority score
   */
  static calculateLayoutPriority(metadata) {
    const { width, height } = metadata;
    const totalPixels = width * height;
    
    // Higher resolution = higher priority
    if (totalPixels > 2000000) return 5; // >2MP
    if (totalPixels > 1000000) return 4; // >1MP
    if (totalPixels > 500000) return 3;  // >500K
    if (totalPixels > 200000) return 2;  // >200K
    return 1; // Low resolution
  }

  /**
   * Calculate image brightness
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<number>} Brightness value (0-255)
   */
  static async calculateBrightness(imageBuffer) {
    try {
      const { data, info } = await sharp(imageBuffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate average brightness
      let total = 0;
      for (let i = 0; i < data.length; i += info.channels) {
        total += data[i];
      }
      
      return total / (data.length / info.channels);
    } catch (error) {
      console.warn('Could not calculate brightness:', error);
      return 128; // Default middle value
    }
  }

  /**
   * Calculate image complexity (edge density)
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<number>} Complexity score
   */
  static async calculateComplexity(imageBuffer) {
    try {
      // Simplified complexity calculation
      const { data, info } = await sharp(imageBuffer)
        .grayscale()
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      let edges = 0;
      const width = info.width;
      const height = info.height;

      // Simple edge detection
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const current = data[idx];
          
          // Check differences with neighbors
          const right = data[idx + 1];
          const bottom = data[idx + width];
          
          if (Math.abs(current - right) > 30 || Math.abs(current - bottom) > 30) {
            edges++;
          }
        }
      }

      return edges / (width * height); // Normalized edge density
    } catch (error) {
      console.warn('Could not calculate complexity:', error);
      return 0.1; // Default low complexity
    }
  }

  /**
   * Get dominant color (simplified)
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<string>} Hex color code
   */
  static async getDominantColor(imageBuffer) {
    try {
      // Resize to small image for analysis
      const { data, info } = await sharp(imageBuffer)
        .resize(10, 10, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / info.channels;

      for (let i = 0; i < data.length; i += info.channels) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      r = Math.round(r / pixelCount);
      g = Math.round(g / pixelCount);
      b = Math.round(b / pixelCount);

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      console.warn('Could not calculate dominant color:', error);
      return '#808080'; // Default gray
    }
  }

  /**
   * Generate smart layout recommendations
   * @param {Array} products - Array of product images
   * @param {Object} frameInfo - Frame image info
   * @param {Array} icons - Array of icon images
   * @returns {Promise<Array>} Layout recommendations
   */
  static async generateLayoutRecommendations(products, frameInfo, icons) {
    try {
      const layouts = [];

      // Grid Layout
      layouts.push({
        type: 'grid',
        name: 'Product Grid',
        description: 'Organized grid layout perfect for catalogs',
        recommendedSize: { width: 1200, height: 1200 },
        elements: await this.createGridElements(products, frameInfo),
        priority: this.calculateGridPriority(products.length)
      });

      // Banner Layout
      layouts.push({
        type: 'banner',
        name: 'Campaign Banner',
        description: 'Wide banner layout for social media',
        recommendedSize: { width: 1200, height: 630 },
        elements: await this.createBannerElements(products, frameInfo, icons),
        priority: 4
      });

      // Story Layout
      layouts.push({
        type: 'story',
        name: 'Story Format',
        description: 'Vertical layout for Instagram Stories',
        recommendedSize: { width: 1080, height: 1920 },
        elements: await this.createStoryElements(products, frameInfo, icons),
        priority: 3
      });

      // Carousel Layout
      layouts.push({
        type: 'carousel',
        name: 'Product Carousel',
        description: 'Multiple slides for product showcases',
        recommendedSize: { width: 1080, height: 1080 },
        slides: await this.createCarouselSlides(products, frameInfo),
        priority: 5
      });

      // Sort by priority and return
      return layouts.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      throw new Error(`Failed to generate layout recommendations: ${error.message}`);
    }
  }

  /**
   * Create grid layout elements
   * @param {Array} products - Product images
   * @param {Object} frameInfo - Frame info
   * @returns {Promise<Array>} Layout elements
   */
  static async createGridElements(products, frameInfo) {
    const elements = [];
    const gridSize = Math.ceil(Math.sqrt(products.length));
    
    for (let i = 0; i < products.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      elements.push({
        type: 'image',
        source: products[i].url,
        position: {
          x: (col * (100 / gridSize)) + 2,
          y: (row * (100 / gridSize)) + 2,
          width: (96 / gridSize),
          height: (96 / gridSize)
        },
        zIndex: 1
      });
    }

    // Add frame if available
    if (frameInfo) {
      elements.push({
        type: 'frame',
        source: frameInfo.url,
        position: { x: 0, y: 0, width: 100, height: 100 },
        zIndex: 0
      });
    }

    return elements;
  }

  /**
   * Create banner layout elements
   * @param {Array} products - Product images
   * @param {Object} frameInfo - Frame info
   * @param {Array} icons - Icon images
   * @returns {Promise<Array>} Layout elements
   */
  static async createBannerElements(products, frameInfo, icons) {
    const elements = [];
    
    // Frame background
    if (frameInfo) {
      elements.push({
        type: 'frame',
        source: frameInfo.url,
        position: { x: 0, y: 0, width: 100, height: 100 },
        zIndex: 0
      });
    }

    // Hero product
    if (products.length > 0) {
      elements.push({
        type: 'image',
        source: products[0].url,
        position: { x: 60, y: 10, width: 35, height: 80 },
        zIndex: 1
      });
    }

    // Additional products
    for (let i = 1; i < Math.min(products.length, 4); i++) {
      elements.push({
        type: 'image',
        source: products[i].url,
        position: { x: 5, y: 20 + (i - 1) * 18, width: 15, height: 15 },
        zIndex: 1
      });
    }

    // Icons
    if (icons.length > 0) {
      for (let i = 0; i < Math.min(icons.length, 3); i++) {
        elements.push({
          type: 'icon',
          source: icons[i].url,
          position: { x: 25, y: 20 + i * 25, width: 8, height: 8 },
          zIndex: 2
        });
      }
    }

    return elements;
  }

  /**
   * Create story layout elements
   * @param {Array} products - Product images
   * @param {Object} frameInfo - Frame info
   * @param {Array} icons - Icon images
   * @returns {Promise<Array>} Layout elements
   */
  static async createStoryElements(products, frameInfo, icons) {
    const elements = [];

    // Frame background
    if (frameInfo) {
      elements.push({
        type: 'frame',
        source: frameInfo.url,
        position: { x: 0, y: 0, width: 100, height: 100 },
        zIndex: 0
      });
    }

    // Product showcase
    if (products.length > 0) {
      elements.push({
        type: 'image',
        source: products[0].url,
        position: { x: 10, y: 15, width: 80, height: 60 },
        zIndex: 1
      });
    }

    // Text overlay area
    elements.push({
      type: 'text',
      content: 'Your Product Title Here',
      position: { x: 10, y: 80, width: 80, height: 15 },
      style: { fontSize: 24, color: '#FFFFFF', fontWeight: 'bold' },
      zIndex: 2
    });

    return elements;
  }

  /**
   * Create carousel slide layouts
   * @param {Array} products - Product images
   * @param {Object} frameInfo - Frame info
   * @returns {Promise<Array>} Carousel slides
   */
  static async createCarouselSlides(products, frameInfo) {
    const slides = [];

    // Title slide
    slides.push({
      type: 'title',
      elements: [
        {
          type: 'text',
          content: 'Product Collection',
          position: { x: 10, y: 40, width: 80, height: 20 },
          style: { fontSize: 36, color: '#000000', fontWeight: 'bold' },
          zIndex: 1
        }
      ]
    });

    // Product slides
    for (let i = 0; i < products.length; i++) {
      slides.push({
        type: 'product',
        elements: [
          {
            type: 'image',
            source: products[i].url,
            position: { x: 10, y: 20, width: 80, height: 60 },
            zIndex: 1
          },
          {
            type: 'text',
            content: `Product ${i + 1}`,
            position: { x: 10, y: 85, width: 80, height: 10 },
            style: { fontSize: 18, color: '#333333' },
            zIndex: 2
          }
        ]
      });
    }

    return slides;
  }

  /**
   * Calculate grid priority based on number of products
   * @param {number} productCount - Number of products
   * @returns {number} Priority score
   */
  static calculateGridPriority(productCount) {
    if (productCount >= 9) return 5;
    if (productCount >= 6) return 4;
    if (productCount >= 4) return 3;
    if (productCount >= 2) return 2;
    return 1;
  }
}

module.exports = SmartLayout;