import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Progress, Chip, Tabs, Tab, Select, SelectItem } from '@heroui/react';
import { CloudArrowUpIcon, PhotoIcon, SwatchIcon, DocumentTextIcon, PaintBrushIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const PLATFORMS = [
  { value: 'lazada', label: 'Lazada' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'sasa', label: 'Sasa' },
  { value: 'general', label: 'General' }
];

const UploadWizard = () => {
  const [activeTab, setActiveTab] = useState('campaign');
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || '';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState({
    campaignName: '',
    platform: 'general'
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    products: [],
    icons: [],
    frame: null,
    csv: null,
    csvData: null,
    fonts: [],
    matchingResults: null
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
        
        // Validate file type based on upload type
        if (type === 'csv') {
          if (!file.name.endsWith('.csv')) {
            alert(`${file.name} is not a CSV file`);
            continue;
          }
        } else if (type === 'fonts') {
          if (!file.name.match(/\.(ttf|woff|woff2)$/i)) {
            alert(`${file.name} is not a valid font file (TTF, WOFF, WOFF2)`);
            continue;
          }
        } else {
          if (!file.type.startsWith('image/')) {
            alert(`${file.name} is not an image file`);
            continue;
          }
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 50MB`);
          continue;
        }

        try {
          const result = await apiService.uploadFile(currentSessionId, file, type, campaignData);
          
          if (result.success) {
            setUploadedFiles(prev => {
              const newFiles = { ...prev };
              if (type === 'frame') {
                newFiles.frame = result.data;
              } else if (type === 'csv') {
                newFiles.csv = result.data;
                newFiles.csvData = result.csvData;
                newFiles.matchingResults = result.matchingResults;
              } else {
                newFiles[type] = [...(newFiles[type] || []), result.data];
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

  const handleBulkUpload = async () => {
    if (!campaignData.campaignName) {
      alert('Please enter a campaign name');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const currentSessionId = await ensureSession();
      
      // Prepare form data for bulk upload
      const formData = new FormData();
      formData.append('campaignName', campaignData.campaignName);
      formData.append('platform', campaignData.platform);
      formData.append('sessionId', currentSessionId);

      // Add all files
      uploadedFiles.products.forEach(file => {
        if (file.file) formData.append('productImages', file.file);
      });
      uploadedFiles.icons.forEach(file => {
        if (file.file) formData.append('icons', file.file);
      });
      if (uploadedFiles.frame?.file) {
        formData.append('frame', uploadedFiles.frame.file);
      }
      if (uploadedFiles.csv?.file) {
        formData.append('csvFile', uploadedFiles.csv.file);
      }
      uploadedFiles.fonts.forEach(file => {
        if (file.file) formData.append('fonts', file.file);
      });

      setUploadProgress(50);

      const result = await apiService.bulkUpload(currentSessionId, formData);
      
      if (result.success) {
        setUploadedFiles(prev => ({
          ...prev,
          ...result.files,
          matchingResults: result.files.matchingResults
        }));
        setUploadProgress(100);
        alert('All files uploaded successfully!');
      }
    } catch (error) {
      console.error('Bulk upload failed:', error);
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
      frame: null,
      csv: null,
      csvData: null,
      fonts: [],
      matchingResults: null
    });
  };

  const renderFilePreview = (file, index, type) => {
    if (type === 'frame') {
      return (
        <div key="frame" className="relative">
          <img 
            src={file.url || URL.createObjectURL(file.file)} 
            alt="Frame" 
            className="w-full h-24 object-cover rounded-lg border"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={() => removeFile('frame')}
            >
              Remove
            </Button>
          </div>
          <p className="text-xs text-center mt-1 truncate">{file.originalName || file.name}</p>
        </div>
      );
    }

    if (type === 'csv') {
      return (
        <div key="csv" className="relative p-4 bg-green-50 rounded-lg border border-green-200">
          <DocumentTextIcon className="h-8 w-8 text-green-600 mx-auto" />
          <p className="text-sm text-center mt-2 font-medium text-green-800">{file.originalName || file.name}</p>
          {uploadedFiles.csvData && (
            <p className="text-xs text-center text-green-600 mt-1">
              {uploadedFiles.csvData.rowCount || uploadedFiles.csvData.length} products loaded
            </p>
          )}
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="mt-2 w-full"
            onPress={() => removeFile('csv')}
          >
            Remove
          </Button>
        </div>
      );
    }

    if (type === 'fonts') {
      return (
        <div key={index} className="relative p-3 bg-purple-50 rounded-lg border border-purple-200">
          <PaintBrushIcon className="h-6 w-6 text-purple-600 mx-auto" />
          <p className="text-xs text-center mt-1 truncate font-medium text-purple-800">
            {file.originalName || file.fontName || file.name}
          </p>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="mt-2 w-full"
            onPress={() => removeFile('fonts', index)}
          >
            Remove
          </Button>
        </div>
      );
    }

    return (
      <div key={index} className="relative">
        <img 
          src={file.url || URL.createObjectURL(file.file)} 
          alt={`${type} ${index + 1}`} 
          className="w-full h-24 object-cover rounded-lg border"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={() => removeFile(type, index)}
          >
            Remove
          </Button>
        </div>
        <p className="text-xs text-center mt-1 truncate">{file.originalName || file.name}</p>
        {file.sku && (
          <Chip size="sm" color="success" variant="flat" className="mt-1">
            SKU: {file.sku}
          </Chip>
        )}
      </div>
    );
  };

  return (
    <div className="upload-wizard space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Asset Generator</h1>
        <p className="text-gray-600">
          Upload your product data, images, and assets to generate campaign materials
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

      {/* Matching Results */}
      {uploadedFiles.matchingResults && (
        <Card className="bg-blue-50 border-blue-200">
          <CardBody>
            <h3 className="font-semibold text-blue-800 mb-2">SKU Matching Results</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{uploadedFiles.matchingResults.matched?.length || 0}</p>
                <p className="text-gray-600">Matched</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{uploadedFiles.matchingResults.unmatchedImages?.length || 0}</p>
                <p className="text-gray-600">Unmatched Images</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{uploadedFiles.matchingResults.matchRate || 0}%</p>
                <p className="text-gray-600">Match Rate</p>
              </div>
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
            {/* Campaign Tab */}
            <Tab key="campaign" title={
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="h-5 w-5" />
                <span>Campaign</span>
              </div>
            }>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Input
                      label="Campaign Name"
                      placeholder="e.g., Black Friday 2025"
                      value={campaignData.campaignName}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, campaignName: e.target.value }))}
                      isRequired
                    />
                  </div>
                  <div>
                    <Select
                      label="E-commerce Platform"
                      placeholder="Select platform"
                      selectedKeys={[campaignData.platform]}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, platform: e.target.value }))}
                    >
                      {PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* CSV Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Data (CSV)
                  </label>
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors bg-green-50">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-green-400" />
                    <div className="mt-4">
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <Button color="success" variant="flat" as="span">
                          Upload CSV File
                        </Button>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'csv')}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        CSV with columns: SKU, Brand, Product Name, Full Price, Discounted Price, etc.
                      </p>
                    </div>
                  </div>

                  {/* CSV Preview */}
                  {uploadedFiles.csv && (
                    <div className="mt-4 max-w-xs">
                      {renderFilePreview(uploadedFiles.csv, null, 'csv')}
                    </div>
                  )}
                </div>
              </div>
            </Tab>

            {/* Products Tab */}
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
                  <p className="text-xs text-gray-500 mb-2">
                    Name your files with SKU codes for automatic matching (e.g., SKU123.jpg)
                  </p>
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

            {/* Frame Tab */}
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

            {/* Icons Tab */}
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

            {/* Fonts Tab */}
            <Tab key="fonts" title={
              <div className="flex items-center space-x-2">
                <PaintBrushIcon className="h-5 w-5" />
                <span>Fonts</span>
                <Chip size="sm" variant="flat">{uploadedFiles.fonts.length}</Chip>
              </div>
            }>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Fonts (Optional)
                  </label>
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors bg-purple-50">
                    <PaintBrushIcon className="mx-auto h-12 w-12 text-purple-400" />
                    <div className="mt-4">
                      <label htmlFor="fonts-upload" className="cursor-pointer">
                        <Button color="secondary" variant="flat" as="span">
                          Upload Fonts
                        </Button>
                        <input
                          id="fonts-upload"
                          type="file"
                          multiple
                          accept=".ttf,.woff,.woff2"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'fonts')}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        TTF, WOFF, WOFF2 font files
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fonts Preview */}
                {uploadedFiles.fonts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Fonts ({uploadedFiles.fonts.length})
                    </h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {uploadedFiles.fonts.map((file, index) => 
                        renderFilePreview(file, index, 'fonts')
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
                uploadedFiles.fonts.length === 0 &&
                !uploadedFiles.frame &&
                !uploadedFiles.csv
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
                  if (!campaignData.campaignName) {
                    alert('Please enter a campaign name');
                    setActiveTab('campaign');
                    return;
                  }
                  if (uploadedFiles.products.length === 0) {
                    alert('Please upload at least one product image');
                    setActiveTab('products');
                    return;
                  }
                  // Store campaign data in localStorage for editor
                  localStorage.setItem('campaignData', JSON.stringify(campaignData));
                  localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
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
