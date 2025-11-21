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
   * @param {Array} csvData - CSV product data (optional)
   * @returns {Promise<Array>} Layout recommendations
   */
  static async generateLayoutRecommendations(products, frameInfo, icons, csvData = null) {
    try {
      const layouts = [];

      // Grid Layout
      layouts.push({
        type: 'grid',
        name: 'Product Grid',
        description: 'Organized grid layout perfect for catalogs',
        recommendedSize: { width: 1200, height: 1200 },
        elements: await this.createGridElements(products, frameInfo, csvData),
        priority: this.calculateGridPriority(products.length)
      });

      // Banner Layout
      layouts.push({
        type: 'banner',
        name: 'Campaign Banner',
        description: 'Wide banner layout for social media',
        recommendedSize: { width: 1200, height: 630 },
        elements: await this.createBannerElements(products, frameInfo, icons, csvData),
        priority: 4
      });

      // Story Layout
      layouts.push({
        type: 'story',
        name: 'Story Format',
        description: 'Vertical layout for Instagram Stories',
        recommendedSize: { width: 1080, height: 1920 },
        elements: await this.createStoryElements(products, frameInfo, icons, csvData),
        priority: 3
      });

      // Carousel Layout
      layouts.push({
        type: 'carousel',
        name: 'Product Carousel',
        description: 'Multiple slides for product showcases',
        recommendedSize: { width: 1080, height: 1080 },
        slides: await this.createCarouselSlides(products, frameInfo, csvData),
        priority: 5
      });

      // Sort by priority and return
      return layouts.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      throw new Error(`Failed to generate layout recommendations: ${error.message}`);
    }
  }

  /**
   * Match product image to CSV data by SKU or filename
   * @param {Object} product - Product image object
   * @param {Array} csvData - CSV product data
   * @returns {Object|null} Matched CSV row or null
   */
  static matchProductToCSV(product, csvData) {
    if (!csvData || csvData.length === 0) return null;

    const fileName = product.fileName || product.name || '';
    const fileNameLower = fileName.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, '');

    // Try to find matching CSV row
    for (const row of csvData) {
      if (row.sku && fileNameLower.includes(row.sku.toLowerCase())) {
        return row;
      }
      if (row.sku && row.sku.toLowerCase().includes(fileNameLower)) {
        return row;
      }
    }

    return null;
  }

  /**
   * Create text elements from CSV data
   * @param {Object} csvRow - CSV data row
   * @param {Object} position - Position configuration
   * @returns {Array} Text elements
   */
  static createTextElementsFromCSV(csvRow, position) {
    const elements = [];

    if (!csvRow) return elements;

    // Product name
    if (csvRow.product_name) {
      elements.push({
        type: 'text',
        content: csvRow.product_name,
        dataField: 'product_name',
        position: {
          x: position.x,
          y: position.y,
          width: position.width,
          height: 8
        },
        style: {
          fontSize: 16,
          color: '#000000',
          fontWeight: 'bold',
          textAlign: 'center'
        },
        zIndex: 10
      });
    }

    // Brand
    if (csvRow.brand) {
      elements.push({
        type: 'text',
        content: csvRow.brand,
        dataField: 'brand',
        position: {
          x: position.x,
          y: position.y + 8,
          width: position.width,
          height: 5
        },
        style: {
          fontSize: 12,
          color: '#666666',
          textAlign: 'center'
        },
        zIndex: 10
      });
    }

    // Price information
    if (csvRow.discounted_price || csvRow.full_price) {
      const priceY = position.y + (csvRow.brand ? 13 : 8);
      
      if (csvRow.discounted_price && csvRow.full_price) {
        // Show both prices with strikethrough on full price
        elements.push({
          type: 'text',
          content: `${csvRow.full_price}`,
          dataField: 'full_price',
          position: {
            x: position.x,
            y: priceY,
            width: position.width / 2,
            height: 5
          },
          style: {
            fontSize: 14,
            color: '#999999',
            textDecoration: 'line-through',
            textAlign: 'right'
          },
          zIndex: 10
        });

        elements.push({
          type: 'text',
          content: `${csvRow.discounted_price}`,
          dataField: 'discounted_price',
          position: {
            x: position.x + position.width / 2,
            y: priceY,
            width: position.width / 2,
            height: 5
          },
          style: {
            fontSize: 16,
            color: '#E53E3E',
            fontWeight: 'bold',
            textAlign: 'left'
          },
          zIndex: 10
        });
      } else {
        // Show single price
        const price = csvRow.discounted_price || csvRow.full_price;
        elements.push({
          type: 'text',
          content: `${price}`,
          dataField: csvRow.discounted_price ? 'discounted_price' : 'full_price',
          position: {
            x: position.x,
            y: priceY,
            width: position.width,
            height: 5
          },
          style: {
            fontSize: 16,
            color: '#000000',
            fontWeight: 'bold',
            textAlign: 'center'
          },
          zIndex: 10
        });
      }
    }

    // Discount badge
    if (csvRow.discount_percent) {
      elements.push({
        type: 'badge',
        content: `-${csvRow.discount_percent}%`,
        dataField: 'discount_percent',
        position: {
          x: position.x + position.width - 15,
          y: position.y - 5,
          width: 15,
          height: 8
        },
        style: {
          fontSize: 14,
          color: '#FFFFFF',
          backgroundColor: '#E53E3E',
          fontWeight: 'bold',
          textAlign: 'center',
          borderRadius: '4px'
        },
        zIndex: 11
      });
    }

    return elements;
  }

  /**
   * Create grid layout elements
   * @param {Array} products - Product images
   * @param {Object} frameInfo - Frame info
   * @param {Array} csvData - CSV product data (optional)
   * @returns {Promise<Array>} Layout elements
   */
  static async createGridElements(products, frameInfo, csvData = null) {
    const elements = [];
    const gridSize = Math.ceil(Math.sqrt(products.length));
    
    for (let i = 0; i < products.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      const cellWidth = 96 / gridSize;
      const cellHeight = 96 / gridSize;
      const x = (col * (100 / gridSize)) + 2;
      const y = (row * (100 / gridSize)) + 2;

      // Product image
      elements.push({
        type: 'image',
        source: products[i].url,
        position: {
          x: x,
          y: y,
          width: cellWidth * 0.9,
          height: cellHeight * 0.6
        },
        zIndex: 1
      });

      // Add CSV data text if available
      if (csvData) {
        const csvRow = this.matchProductToCSV(products[i], csvData);
        if (csvRow) {
          const textElements = this.createTextElementsFromCSV(csvRow, {
            x: x,
            y: y + cellHeight * 0.6,
            width: cellWidth * 0.9,
            height: cellHeight * 0.3
          });
          elements.push(...textElements);
        }
      }
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
   * @param {Array} csvData - CSV product data (optional)
   * @returns {Promise<Array>} Layout elements
   */
  static async createBannerElements(products, frameInfo, icons, csvData = null) {
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
        position: { x: 60, y: 10, width: 35, height: 60 },
        zIndex: 1
      });

      // Add CSV data for hero product
      if (csvData) {
        const csvRow = this.matchProductToCSV(products[0], csvData);
        if (csvRow) {
          const textElements = this.createTextElementsFromCSV(csvRow, {
            x: 60,
            y: 72,
            width: 35,
            height: 20
          });
          elements.push(...textElements);
        }
      }
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
   * @param {Array} csvData - CSV product data (optional)
   * @returns {Promise<Array>} Layout elements
   */
  static async createStoryElements(products, frameInfo, icons, csvData = null) {
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
        position: { x: 10, y: 15, width: 80, height: 50 },
        zIndex: 1
      });

      // Add CSV data text
      if (csvData) {
        const csvRow = this.matchProductToCSV(products[0], csvData);
        if (csvRow) {
          const textElements = this.createTextElementsFromCSV(csvRow, {
            x: 10,
            y: 68,
            width: 80,
            height: 20
          });
          elements.push(...textElements);
        } else {
          // Default text if no CSV data
          elements.push({
            type: 'text',
            content: 'Your Product Title Here',
            position: { x: 10, y: 70, width: 80, height: 10 },
            style: { fontSize: 24, color: '#000000', fontWeight: 'bold', textAlign: 'center' },
            zIndex: 2
          });
        }
      } else {
        // Default text if no CSV data
        elements.push({
          type: 'text',
          content: 'Your Product Title Here',
          position: { x: 10, y: 70, width: 80, height: 10 },
          style: { fontSize: 24, color: '#000000', fontWeight: 'bold', textAlign: 'center' },
          zIndex: 2
        });
      }
    }

    return elements;
  }

  /**
   * Create carousel slide layouts
   * @param {Array} products - Product images
   * @param {Object} frameInfo - Frame info
   * @param {Array} csvData - CSV product data (optional)
   * @returns {Promise<Array>} Carousel slides
   */
  static async createCarouselSlides(products, frameInfo, csvData = null) {
    const slides = [];

    // Title slide
    slides.push({
      type: 'title',
      elements: [
        {
          type: 'text',
          content: 'Product Collection',
          position: { x: 10, y: 40, width: 80, height: 20 },
          style: { fontSize: 36, color: '#000000', fontWeight: 'bold', textAlign: 'center' },
          zIndex: 1
        }
      ]
    });

    // Product slides
    for (let i = 0; i < products.length; i++) {
      const slideElements = [
        {
          type: 'image',
          source: products[i].url,
          position: { x: 10, y: 15, width: 80, height: 55 },
          zIndex: 1
        }
      ];

      // Add CSV data if available
      if (csvData) {
        const csvRow = this.matchProductToCSV(products[i], csvData);
        if (csvRow) {
          const textElements = this.createTextElementsFromCSV(csvRow, {
            x: 10,
            y: 72,
            width: 80,
            height: 20
          });
          slideElements.push(...textElements);
        } else {
          // Default text
          slideElements.push({
            type: 'text',
            content: `Product ${i + 1}`,
            position: { x: 10, y: 75, width: 80, height: 10 },
            style: { fontSize: 18, color: '#333333', textAlign: 'center' },
            zIndex: 2
          });
        }
      } else {
        // Default text
        slideElements.push({
          type: 'text',
          content: `Product ${i + 1}`,
          position: { x: 10, y: 75, width: 80, height: 10 },
          style: { fontSize: 18, color: '#333333', textAlign: 'center' },
          zIndex: 2
        });
      }

      slides.push({
        type: 'product',
        elements: slideElements
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