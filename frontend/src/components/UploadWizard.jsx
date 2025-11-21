import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Progress, Chip, Tabs, Tab } from '@heroui/react';
import { CloudArrowUpIcon, PhotoIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const UploadWizard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || '';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState({
    products: [],
    icons: [],
    frame: null
  });

  // Initialize session if none exists
  const ensureSession = useCallback(async () => {
    let currentSessionId = localStorage.getItem('sessionId');
    if (!currentSessionId) {
      try {
        const response = await apiService.createSession();
        currentSessionId = response.sessionId;
        localStorage.setItem('sessionId', currentSessionId);
        setSessionId(currentSessionId);
      } catch (error) {
        console.error('Failed to create session:', error);
        alert('Failed to create upload session. Please try again.');
      }
    }
    return currentSessionId;
  }, []);

  const handleFileUpload = async (event, type) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const currentSessionId = await ensureSession();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 50MB`);
          continue;
        }

        try {
          const result = await apiService.uploadFile(currentSessionId, file, type);
          
          if (result.success) {
            setUploadedFiles(prev => {
              const newFiles = { ...prev };
              if (type === 'frame') {
                newFiles.frame = result.data;
              } else {
                newFiles[type] = [...newFiles[type], result.data];
              }
              return newFiles;
            });
          } else {
            console.error('Upload failed for', file.name, result.error);
          }
        } catch (error) {
          console.error('Upload error for', file.name, error);
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }
    } catch (error) {
      console.error('Upload process failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (type, index = null) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      if (index !== null) {
        newFiles[type].splice(index, 1);
      } else {
        newFiles[type] = null;
      }
      return newFiles;
    });
  };

  const clearAllFiles = () => {
    setUploadedFiles({
      products: [],
      icons: [],
      frame: null
    });
  };

  const renderFilePreview = (file, index, type) => {
    if (type === 'frame') {
      return (
        <div key="frame" className="relative">
          <img 
            src={file.url} 
            alt="Frame" 
            className="w-full h-24 object-cover rounded-lg border"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={() => removeFile('frame')}
            >
              Remove
            </Button>
          </div>
          <p className="text-xs text-center mt-1 truncate">{file.originalName}</p>
        </div>
      );
    }

    return (
      <div key={index} className="relative">
        <img 
          src={file.url} 
          alt={`Product ${index + 1}`} 
          className="w-full h-24 object-cover rounded-lg border"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={() => removeFile(type, index)}
          >
            Remove
          </Button>
        </div>
        <p className="text-xs text-center mt-1 truncate">{file.originalName}</p>
      </div>
    );
  };

  return (
    <div className="upload-wizard space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Assets</h1>
        <p className="text-gray-600">
          Upload your product images, frame templates, and icons to get started
        </p>
        {sessionId && (
          <Chip size="sm" color="primary" variant="flat" className="mt-2">
            Session: {sessionId.substring(0, 12)}...
          </Chip>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardBody>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading files...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Upload Sections */}
      <Card>
        <CardBody>
          <Tabs 
            selectedKey={activeTab} 
            onSelectionChange={setActiveTab}
            aria-label="Upload sections"
            className="mb-6"
          >
            <Tab key="products" title={
              <div className="flex items-center space-x-2">
                <PhotoIcon className="h-5 w-5" />
                <span>Products</span>
                <Chip size="sm" variant="flat">{uploadedFiles.products.length}</Chip>
              </div>
            }>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="products-upload" className="cursor-pointer">
                        <Button color="primary" variant="flat" as="span">
                          Select Product Images
                        </Button>
                        <input
                          id="products-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'products')}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        PNG, JPG, WEBP up to 50MB each
                      </p>
                    </div>
                  </div>
                </div>

                {/* Products Preview */}
                {uploadedFiles.products.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Products ({uploadedFiles.products.length})
                    </h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {uploadedFiles.products.map((file, index) => 
                        renderFilePreview(file, index, 'products')
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="frame" title={
              <div className="flex items-center space-x-2">
                <SwatchIcon className="h-5 w-5" />
                <span>Frame</span>
                <Chip size="sm" variant="flat">{uploadedFiles.frame ? 1 : 0}</Chip>
              </div>
            }>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frame Template (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="frame-upload" className="cursor-pointer">
                        <Button color="primary" variant="flat" as="span">
                          Select Frame Template
                        </Button>
                        <input
                          id="frame-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'frame')}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        PNG, JPG, WEBP up to 50MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Frame Preview */}
                {uploadedFiles.frame && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Frame</h4>
                    <div className="max-w-xs">
                      {renderFilePreview(uploadedFiles.frame, null, 'frame')}
                    </div>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="icons" title={
              <div className="flex items-center space-x-2">
                <PhotoIcon className="h-5 w-5" />
                <span>Icons</span>
                <Chip size="sm" variant="flat">{uploadedFiles.icons.length}</Chip>
              </div>
            }>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icons (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="icons-upload" className="cursor-pointer">
                        <Button color="primary" variant="flat" as="span">
                          Select Icons
                        </Button>
                        <input
                          id="icons-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'icons')}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        PNG, JPG, WEBP up to 50MB each
                      </p>
                    </div>
                  </div>
                </div>

                {/* Icons Preview */}
                {uploadedFiles.icons.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Icons ({uploadedFiles.icons.length})
                    </h4>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                      {uploadedFiles.icons.map((file, index) => 
                        renderFilePreview(file, index, 'icons')
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button 
              variant="flat" 
              color="danger" 
              onPress={clearAllFiles}
              disabled={isUploading || (
                uploadedFiles.products.length === 0 && 
                uploadedFiles.icons.length === 0 && 
                !uploadedFiles.frame
              )}
            >
              Clear All
            </Button>

            <div className="space-x-4">
              <Button 
                variant="flat" 
                onPress={() => window.location.href = '/products'}
                disabled={isUploading}
              >
                View Products
              </Button>
              <Button 
                color="primary" 
                onPress={() => {
                  if (uploadedFiles.products.length === 0) {
                    alert('Please upload at least one product image');
                    return;
                  }
                  window.location.href = '/editor';
                }}
                disabled={isUploading || uploadedFiles.products.length === 0}
              >
                Proceed to Editor
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default UploadWizard;