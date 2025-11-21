import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Chip, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { 
  PhotoIcon, 
  TrashIcon, 
  EyeIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

const ProductList = () => {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || '';
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    products: [],
    icons: [],
    frame: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Load files on component mount
  useEffect(() => {
    loadFiles();
  }, [sessionId]);

  const loadFiles = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const files = await apiService.getSessionFiles(sessionId);
      setUploadedFiles(files);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort files
  const getFilteredFiles = () => {
    let allFiles = [];

    if (filterType === 'all' || filterType === 'products') {
      allFiles = [...allFiles, ...uploadedFiles.products.map(f => ({ ...f, type: 'product' }))];
    }
    if (filterType === 'all' || filterType === 'icons') {
      allFiles = [...allFiles, ...uploadedFiles.icons.map(f => ({ ...f, type: 'icon' }))];
    }
    if (filterType === 'all' || filterType === 'frame') {
      if (uploadedFiles.frame) {
        allFiles = [...allFiles, { ...uploadedFiles.frame, type: 'frame' }];
      }
    }

    // Filter by search term
    if (searchTerm) {
      allFiles = allFiles.filter(file => 
        file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort files
    allFiles.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.originalName.localeCompare(b.originalName);
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        case 'date':
          return new Date(b.created || 0) - new Date(a.created || 0);
        default:
          return 0;
      }
    });

    return allFiles;
  };

  const deleteFile = async (file, type) => {
    try {
      // Remove from local state immediately for better UX
      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        if (type === 'frame') {
          newFiles.frame = null;
        } else {
          newFiles[type] = newFiles[type].filter(f => f.fileName !== file.fileName);
        }
        return newFiles;
      });

      // TODO: Add API call to delete file from server
      console.log('File deleted:', file);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Reload files to sync with server
      loadFiles();
    }
  };

  const viewFile = (file) => {
    setSelectedFile(file);
    onOpen();
  };

  const getFileTypeIcon = (type) => {
    switch (type) {
      case 'product':
        return <PhotoIcon className="h-5 w-5 text-blue-500" />;
      case 'icon':
        return <Cog6ToothIcon className="h-5 w-5 text-green-500" />;
      case 'frame':
        return <DocumentArrowUpIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <PhotoIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileTypeChip = (type) => {
    const colors = {
      product: 'primary',
      icon: 'success',
      frame: 'warning'
    };
    
    return (
      <Chip size="sm" color={colors[type]} variant="flat">
        {type}
      </Chip>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileStats = () => {
    const stats = {
      total: uploadedFiles.products.length + uploadedFiles.icons.length + (uploadedFiles.frame ? 1 : 0),
      products: uploadedFiles.products.length,
      icons: uploadedFiles.icons.length,
      frame: uploadedFiles.frame ? 1 : 0,
      totalSize: 0
    };

    // Calculate total size
    uploadedFiles.products.forEach(f => stats.totalSize += f.size);
    uploadedFiles.icons.forEach(f => stats.totalSize += f.size);
    if (uploadedFiles.frame) stats.totalSize += uploadedFiles.frame.size;

    return stats;
  };

  const filteredFiles = getFilteredFiles();
  const stats = getFileStats();

  return (
    <div className="product-list space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Assets</h1>
          <p className="text-gray-600 mt-1">
            Manage your uploaded products, icons, and frame templates
          </p>
        </div>
        <Button 
          color="primary" 
          startContent={<ArrowPathIcon className="h-5 w-5" />}
          onPress={loadFiles}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Files</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.products}</div>
            <div className="text-sm text-gray-600">Products</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.icons}</div>
            <div className="text-sm text-gray-600">Icons</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.frame}</div>
            <div className="text-sm text-gray-600">Frames</div>
          </CardBody>
        </Card>
      </div>

      {/* File Size Summary */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold">Total Storage Used: </span>
              <span className="text-xl font-bold text-primary">
                {formatFileSize(stats.totalSize)}
              </span>
            </div>
            {stats.totalSize > 50 * 1024 * 1024 && (
              <Chip color="warning" variant="flat">
                Warning: Close to 50MB limit
              </Chip>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<PhotoIcon className="h-5 w-5 text-gray-400" />}
            />
            
            <Select
              label="Filter by type"
              selectedKeys={[filterType]}
              onSelectionChange={(keys) => setFilterType(Array.from(keys)[0])}
            >
              <SelectItem key="all">All Files</SelectItem>
              <SelectItem key="products">Products Only</SelectItem>
              <SelectItem key="icons">Icons Only</SelectItem>
              <SelectItem key="frame">Frame Only</SelectItem>
            </Select>

            <Select
              label="Sort by"
              selectedKeys={[sortBy]}
              onSelectionChange={(keys) => setSortBy(Array.from(keys)[0])}
            >
              <SelectItem key="name">Name</SelectItem>
              <SelectItem key="size">Size</SelectItem>
              <SelectItem key="type">Type</SelectItem>
              <SelectItem key="date">Date Added</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Files Grid */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Files ({filteredFiles.length})
          </h3>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <ArrowPathIcon className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading files...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search or filters.' : 'Upload some files to get started.'}
              </p>
              <div className="mt-6">
                <Button color="primary" onPress={() => window.location.href = '/upload'}>
                  Upload Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file, index) => (
                <div key={`${file.fileName}-${index}`} className="group relative">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardBody className="p-4">
                      {/* File Preview */}
                      <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={file.url}
                          alt={file.originalName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* File Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getFileTypeIcon(file.type)}
                          {getFileTypeChip(file.type)}
                        </div>
                        
                        <h4 className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                          {file.originalName}
                        </h4>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Size: {formatFileSize(file.size)}</div>
                          {file.mimetype && <div>Type: {file.mimetype}</div>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<EyeIcon className="h-4 w-4" />}
                          onPress={() => viewFile(file)}
                        >
                          View
                        </Button>
                        
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          startContent={<TrashIcon className="h-4 w-4" />}
                          onPress={() => deleteFile(file, file.type)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* File Preview Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          {selectedFile && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3>{selectedFile.originalName}</h3>
                <div className="flex items-center space-x-2">
                  {getFileTypeIcon(selectedFile.type)}
                  {getFileTypeChip(selectedFile.type)}
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="max-w-md mx-auto">
                    <img
                      src={selectedFile.url}
                      alt={selectedFile.originalName}
                      className="w-full h-auto rounded-lg border"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">File Name:</span>
                      <p className="text-gray-600">{selectedFile.originalName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Size:</span>
                      <p className="text-gray-600">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <p className="text-gray-600">{selectedFile.mimetype}</p>
                    </div>
                    <div>
                      <span className="font-medium">URL:</span>
                      <p className="text-gray-600 break-all">{selectedFile.url}</p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button color="primary" onPress={onClose}>
                  Use in Editor
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ProductList;