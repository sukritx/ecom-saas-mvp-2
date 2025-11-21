import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth headers if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add session ID if available
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 413) {
      throw new Error('File too large. Please reduce the file size and try again.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Session Management
  createSession: async () => {
    try {
      const response = await apiClient.post('/api/session');
      return response.data;
    } catch (error) {
      throw new Error('Failed to create session: ' + error.message);
    }
  },

  // File Upload
  uploadFile: async (sessionId, file, category, campaignData = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('sessionId', sessionId);
      
      if (campaignData.campaignName) {
        formData.append('campaignName', campaignData.campaignName);
      }
      if (campaignData.platform) {
        formData.append('platform', campaignData.platform);
      }

      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });

      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Bulk Upload
  bulkUpload: async (sessionId, formData) => {
    try {
      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Session-ID': sessionId
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Bulk upload progress: ${percentCompleted}%`);
        },
      });

      return response.data;
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw new Error('Bulk upload failed: ' + (error.response?.data?.message || error.message));
    }
  },

  // Process uploaded files
  processFiles: async (sessionId) => {
    try {
      const response = await apiClient.post('/api/process', { sessionId });
      return response.data;
    } catch (error) {
      throw new Error('Failed to process files: ' + error.message);
    }
  },

  // Get layout recommendations
  getLayoutRecommendations: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/layouts/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get layout recommendations: ' + error.message);
    }
  },

  // Generate campaign assets
  generateCampaign: async (sessionId, layoutConfig) => {
    try {
      const response = await apiClient.post('/api/generate', {
        sessionId,
        layout: layoutConfig
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to generate campaign: ' + error.message);
    }
  },

  // Download generated assets
  downloadAssets: async (sessionId, format = 'zip') => {
    try {
      const response = await apiClient.get(`/api/download/${sessionId}`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download assets: ' + error.message);
    }
  },

  // Get session status
  getSessionStatus: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get session status: ' + error.message);
    }
  },

  // Get uploaded files for session
  getSessionFiles: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/files/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get session files: ' + error.message);
    }
  },

  // Delete session and all files
  deleteSession: async (sessionId) => {
    try {
      const response = await apiClient.delete(`/api/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to delete session: ' + error.message);
    }
  },

  // Campaign Management
  createCampaign: async (sessionId, campaignName, platform) => {
    try {
      const response = await apiClient.post('/api/campaign', {
        sessionId,
        campaignName,
        platform
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to create campaign: ' + error.message);
    }
  },

  getCampaign: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/campaign/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get campaign: ' + error.message);
    }
  },

  // CSV Data Management
  getCSVData: async (sessionId) => {
    try {
      const response = await apiClient.get(`/api/csv/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get CSV data: ' + error.message);
    }
  },

  // Product Matching
  matchProducts: async (sessionId) => {
    try {
      const response = await apiClient.post('/api/match-products', { sessionId });
      return response.data;
    } catch (error) {
      throw new Error('Failed to match products: ' + error.message);
    }
  },

  // Template Analysis
  analyzeTemplate: async (sessionId, templateType = null) => {
    try {
      const response = await apiClient.post('/api/analyze-template', {
        sessionId,
        templateType
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to analyze template: ' + error.message);
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error('Health check failed: ' + error.message);
    }
  },

  // Get server info
  getServerInfo: async () => {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get server info: ' + error.message);
    }
  }
};

// File handling utilities
export const fileUtils = {
  // Convert file to base64
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  },

  // Validate file type
  isValidImageFile: (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    return validTypes.includes(file.type);
  },

  // Validate file size (50MB limit)
  isValidFileSize: (file, maxSizeMB = 50) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  // Format file size for display
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Create downloadable URL from blob
  createDownloadUrl: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Get image dimensions
  getImageDimensions: (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
};

export default apiService;