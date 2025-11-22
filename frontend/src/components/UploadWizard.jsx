import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Progress, Chip } from '@heroui/react';
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  SwatchIcon, 
  DocumentTextIcon, 
  PaintBrushIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

const STEPS = [
  { id: 'campaign', title: 'Campaign & CSV', icon: DocumentTextIcon },
  { id: 'products', title: 'Products', icon: PhotoIcon },
  { id: 'frame', title: 'Frames', icon: SwatchIcon },
  { id: 'icons', title: 'Icons', icon: PhotoIcon },
  { id: 'fonts', title: 'Fonts', icon: PaintBrushIcon },
  { id: 'review', title: 'Review', icon: CheckCircleIcon }
];

const UploadWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('sessionId') || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
        
        // Basic validation
        if (type === 'csv' && !file.name.endsWith('.csv')) {
          alert(`${file.name} is not a CSV file`);
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
          }
        } catch (error) {
          console.error('Upload error:', error);
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

  const handleNext = () => {
    if (currentStep === 0 && !campaignData.campaignName) {
      alert('Please enter a campaign name');
      return;
    }
    if (currentStep === 1 && uploadedFiles.products.length === 0) {
      if (!window.confirm('No products uploaded. Are you sure you want to proceed?')) return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleFinish = () => {
    localStorage.setItem('campaignData', JSON.stringify(campaignData));
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    window.location.href = '/editor';
  };

  const renderFilePreview = (file, index, type) => {
    if (!file) return null;

    const isImage = type !== 'csv' && type !== 'fonts';
    
    return (
      <div key={index || type} className="relative group border rounded-lg p-2 bg-white shadow-sm hover:shadow-md transition-all">
        {isImage ? (
          <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100 mb-2">
            <img 
              src={file.url || URL.createObjectURL(file.file)} 
              alt={file.originalName} 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square w-full flex items-center justify-center bg-gray-50 rounded-md mb-2">
            {type === 'csv' ? (
              <DocumentTextIcon className="w-8 h-8 text-green-600" />
            ) : (
              <PaintBrushIcon className="w-8 h-8 text-purple-600" />
            )}
          </div>
        )}
        
        <div className="text-xs truncate font-medium text-gray-700 px-1">
          {file.originalName || file.name}
        </div>
        
        <button
          onClick={() => removeFile(type, index)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Campaign & CSV
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Campaign Name"
                placeholder="Enter campaign name"
                value={campaignData.campaignName}
                onChange={(e) => setCampaignData(prev => ({ ...prev, campaignName: e.target.value }))}
                isRequired
                variant="bordered"
              />
              <Input
                label="Platform"
                placeholder="e.g. Lazada, Shopee"
                value={campaignData.platform}
                onChange={(e) => setCampaignData(prev => ({ ...prev, platform: e.target.value }))}
                variant="bordered"
              />
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">Upload Product Data (CSV)</h3>
              <p className="text-xs text-gray-500 mb-4">Optional: Upload CSV for automatic data mapping</p>
              
              <label className="cursor-pointer">
                <Button color="primary" variant="flat" as="span" isLoading={isUploading}>
                  Choose CSV File
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'csv')}
                  disabled={isUploading}
                />
              </label>
            </div>

            {uploadedFiles.csv && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded CSV</h4>
                <div className="w-48">
                  {renderFilePreview(uploadedFiles.csv, null, 'csv')}
                </div>
              </div>
            )}
          </div>
        );

      case 1: // Products
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
              <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">Upload Product Images</h3>
              <p className="text-xs text-gray-500 mb-4">Supported: JPG, PNG, WEBP</p>
              
              <label className="cursor-pointer">
                <Button color="primary" variant="flat" as="span" isLoading={isUploading}>
                  Select Images
                </Button>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'products')}
                  disabled={isUploading}
                />
              </label>
            </div>

            {uploadedFiles.products.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Uploaded Products ({uploadedFiles.products.length})
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {uploadedFiles.products.map((file, index) => 
                    renderFilePreview(file, index, 'products')
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Frames
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
              <SwatchIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">Upload Frame Template</h3>
              <p className="text-xs text-gray-500 mb-4">Optional: Upload a frame overlay</p>
              
              <label className="cursor-pointer">
                <Button color="primary" variant="flat" as="span" isLoading={isUploading}>
                  Select Frame
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'frame')}
                  disabled={isUploading}
                />
              </label>
            </div>

            {uploadedFiles.frame && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Frame</h4>
                <div className="w-48">
                  {renderFilePreview(uploadedFiles.frame, null, 'frame')}
                </div>
              </div>
            )}
          </div>
        );

      case 3: // Icons
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
              <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">Upload Icons</h3>
              <p className="text-xs text-gray-500 mb-4">Optional: Badges, logos, or decorative elements</p>
              
              <label className="cursor-pointer">
                <Button color="primary" variant="flat" as="span" isLoading={isUploading}>
                  Select Icons
                </Button>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'icons')}
                  disabled={isUploading}
                />
              </label>
            </div>

            {uploadedFiles.icons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
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
        );

      case 4: // Fonts
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
              <PaintBrushIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">Upload Fonts</h3>
              <p className="text-xs text-gray-500 mb-4">Optional: TTF, WOFF, WOFF2</p>
              
              <label className="cursor-pointer">
                <Button color="primary" variant="flat" as="span" isLoading={isUploading}>
                  Select Fonts
                </Button>
                <input
                  type="file"
                  multiple
                  accept=".ttf,.woff,.woff2"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'fonts')}
                  disabled={isUploading}
                />
              </label>
            </div>

            {uploadedFiles.fonts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
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
        );

      case 5: // Review
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Summary</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Campaign Name</p>
                  <p className="font-medium text-gray-900">{campaignData.campaignName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Platform</p>
                  <p className="font-medium text-gray-900">{campaignData.platform}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <PhotoIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Products</span>
                  </div>
                  <span className="font-semibold text-gray-900">{uploadedFiles.products.length}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <SwatchIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Frame</span>
                  </div>
                  <span className="font-semibold text-gray-900">{uploadedFiles.frame ? 'Yes' : 'No'}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <PhotoIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">Icons</span>
                  </div>
                  <span className="font-semibold text-gray-900">{uploadedFiles.icons.length}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">CSV Data</span>
                  </div>
                  <span className="font-semibold text-gray-900">{uploadedFiles.csv ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10" />
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center bg-white px-2">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isActive || isCompleted ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white text-gray-400'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <Card className="min-h-[400px]">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{STEPS[currentStep].title}</h2>
        </CardHeader>
        
        <CardBody className="p-6">
          {isUploading && (
            <div className="mb-6">
              <Progress 
                size="sm" 
                value={uploadProgress} 
                color="primary" 
                className="max-w-md mx-auto"
                label="Uploading..."
              />
            </div>
          )}
          
          {renderStepContent()}
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="flat"
          color="default"
          onPress={handleBack}
          disabled={currentStep === 0 || isUploading}
          startContent={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Back
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button
            color="success"
            onPress={handleFinish}
            disabled={isUploading}
            endContent={<CheckCircleIcon className="w-4 h-4" />}
          >
            Generate Products
          </Button>
        ) : (
          <Button
            color="primary"
            onPress={handleNext}
            disabled={isUploading}
            endContent={<ArrowRightIcon className="w-4 h-4" />}
          >
            Next Step
          </Button>
        )}
      </div>
    </div>
  );
};

export default UploadWizard;
