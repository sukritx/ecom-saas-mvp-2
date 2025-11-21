import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Card, CardHeader, CardBody, Button, Input, Select, SelectItem, Chip, Tabs, Tab, Slider } from '@heroui/react';
import { 
  ArrowPathIcon, 
  ArrowDownTrayIcon, 
  RectangleGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { apiService, fileUtils } from '../services/api';

const EditorCanvas = () => {
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || '';
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    products: [],
    icons: [],
    frame: null
  });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 1200 });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvas.current) {
      fabricCanvas.current = new fabric.Canvas(canvasRef.current, {
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: '#ffffff'
      });

      // Save initial state
      saveCanvasState();
    }

    return () => {
      if (fabricCanvas.current) {
        try {
          fabricCanvas.current.dispose();
        } catch (error) {
          // Canvas element may already be removed by React
          console.warn('Error disposing Fabric canvas:', error);
        }
      }
    };
  }, [canvasSize]);

  // Load uploaded files
  useEffect(() => {
    const loadFiles = async () => {
      if (!sessionId) return;

      try {
        const files = await apiService.getSessionFiles(sessionId);
        setUploadedFiles(files);
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    };

    loadFiles();
  }, [sessionId]);

  // Save canvas state for undo/redo
  const saveCanvasState = () => {
    if (!fabricCanvas.current) return;

    const state = JSON.stringify(fabricCanvas.current.toJSON());
    const newHistory = canvasHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(state);
    
    setCanvasHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const undo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const state = canvasHistory[newIndex];
      
      fabricCanvas.current.loadFromJSON(state, () => {
        fabricCanvas.current.renderAll();
        setCurrentHistoryIndex(newIndex);
      });
    }
  };

  // Redo function
  const redo = () => {
    if (currentHistoryIndex < canvasHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const state = canvasHistory[newIndex];
      
      fabricCanvas.current.loadFromJSON(state, () => {
        fabricCanvas.current.renderAll();
        setCurrentHistoryIndex(newIndex);
      });
    }
  };

  // Add image to canvas
  const addImageToCanvas = async (imageUrl) => {
    if (!fabricCanvas.current) return;

    try {
      setIsLoading(true);
      fabric.Image.fromURL(imageUrl, (img) => {
        // Scale image to fit canvas
        const canvasWidth = fabricCanvas.current.width;
        const canvasHeight = fabricCanvas.current.height;
        const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height, 0.5);
        
        img.set({
          left: canvasWidth / 2 - (img.width * scale) / 2,
          top: canvasHeight / 2 - (img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: true
        });

        fabricCanvas.current.add(img);
        fabricCanvas.current.setActiveObject(img);
        fabricCanvas.current.renderAll();
        saveCanvasState();
        setIsLoading(false);
      }, { crossOrigin: 'anonymous' });
    } catch (error) {
      console.error('Failed to add image:', error);
      setIsLoading(false);
    }
  };

  // Load layout template
  const loadTemplate = async (template) => {
    if (!fabricCanvas.current) return;

    try {
      setIsLoading(true);
      setSelectedTemplate(template);

      // Clear canvas
      fabricCanvas.current.clear();
      fabricCanvas.current.backgroundColor = '#ffffff';

      // Add elements based on template
      if (template.elements) {
        for (const element of template.elements) {
          await addTemplateElement(element);
        }
      }

      fabricCanvas.current.renderAll();
      saveCanvasState();
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load template:', error);
      setIsLoading(false);
    }
  };

  // Add template element
  const addTemplateElement = async (element) => {
    return new Promise((resolve) => {
      if (element.type === 'image' || element.type === 'frame') {
        fabric.Image.fromURL(element.source, (img) => {
          const canvasWidth = fabricCanvas.current.width;
          const canvasHeight = fabricCanvas.current.height;
          
          img.set({
            left: (element.position.x / 100) * canvasWidth,
            top: (element.position.y / 100) * canvasHeight,
            width: (element.position.width / 100) * canvasWidth,
            height: (element.position.height / 100) * canvasHeight,
            selectable: element.type !== 'frame'
          });

          fabricCanvas.current.add(img);
          resolve();
        }, { crossOrigin: 'anonymous' });
      } else if (element.type === 'text') {
        const text = new fabric.Text(element.content, {
          left: (element.position.x / 100) * fabricCanvas.current.width,
          top: (element.position.y / 100) * fabricCanvas.current.height,
          fontSize: element.style?.fontSize || 24,
          fill: element.style?.color || '#000000',
          fontWeight: element.style?.fontWeight || 'normal',
          width: (element.position.width / 100) * fabricCanvas.current.width,
          textAlign: 'left'
        });

        fabricCanvas.current.add(text);
        resolve();
      }
    });
  };

  // Generate templates from uploaded files
  const generateTemplates = async () => {
    if (!sessionId || uploadedFiles.products.length === 0) return;

    try {
      setIsLoading(true);
      const recommendations = await apiService.getLayoutRecommendations(sessionId);
      setTemplates(recommendations);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to generate templates:', error);
      setIsLoading(false);
    }
  };

  // Export canvas as image
  const exportCanvas = () => {
    if (!fabricCanvas.current) return;

    const dataURL = fabricCanvas.current.toDataURL({
      format: 'png',
      quality: 1.0
    });

    // Create download
    const link = document.createElement('a');
    link.download = `campaign-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear canvas
  const clearCanvas = () => {
    if (!fabricCanvas.current) return;
    
    fabricCanvas.current.clear();
    fabricCanvas.current.backgroundColor = '#ffffff';
    fabricCanvas.current.renderAll();
    saveCanvasState();
  };

  return (
    <div className="editor-canvas space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visual Editor</h1>
          <p className="text-gray-600 mt-1">
            Create and customize your campaign assets with drag-and-drop editing
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="flat"
            size="sm"
            onPress={undo}
            disabled={currentHistoryIndex <= 0}
          >
            Undo
          </Button>
          <Button
            variant="flat"
            size="sm"
            onPress={redo}
            disabled={currentHistoryIndex >= canvasHistory.length - 1}
          >
            Redo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Tools & Assets */}
        <div className="lg:col-span-1 space-y-4">
          {/* Canvas Controls */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Canvas</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <Input
                  type="number"
                  value={canvasSize.width}
                  onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <Input
                  type="number"
                  value={canvasSize.height}
                  onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                  size="sm"
                />
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="flat" onPress={clearCanvas}>
                  Clear
                </Button>
                <Button size="sm" color="primary" onPress={exportCanvas}>
                  Export
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold">Templates</h3>
              <Button size="sm" variant="flat" onPress={generateTemplates}>
                Generate
              </Button>
            </CardHeader>
            <CardBody>
              {templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template, index) => (
                    <Button
                      key={index}
                      variant={selectedTemplate === template ? 'solid' : 'flat'}
                      color="primary"
                      size="sm"
                      className="w-full justify-start"
                      onPress={() => loadTemplate(template)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs opacity-70">{template.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No templates generated yet</p>
              )}
            </CardBody>
          </Card>

          {/* Uploaded Files */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Assets</h3>
            </CardHeader>
            <CardBody>
              <Tabs size="sm" aria-label="Asset types">
                <Tab key="products" title="Products">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {uploadedFiles.products.map((file, index) => (
                      <div
                        key={index}
                        className="cursor-pointer hover:opacity-75"
                        onClick={() => addImageToCanvas(file.url)}
                      >
                        <img
                          src={file.url}
                          alt={`Product ${index + 1}`}
                          className="w-full aspect-square object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </Tab>
                
                <Tab key="icons" title="Icons">
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {uploadedFiles.icons.map((file, index) => (
                      <div
                        key={index}
                        className="cursor-pointer hover:opacity-75"
                        onClick={() => addImageToCanvas(file.url)}
                      >
                        <img
                          src={file.url}
                          alt={`Icon ${index + 1}`}
                          className="w-full aspect-square object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </Tab>
                
                <Tab key="frame" title="Frame">
                  {uploadedFiles.frame && (
                    <div
                      className="cursor-pointer hover:opacity-75 mt-2"
                      onClick={() => addImageToCanvas(uploadedFiles.frame.url)}
                    >
                      <img
                        src={uploadedFiles.frame.url}
                        alt="Frame"
                        className="w-full aspect-square object-cover rounded border"
                      />
                    </div>
                  )}
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        {/* Main Canvas Area */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardBody className="flex flex-col items-center justify-center min-h-[600px]">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="h-6 w-6 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full"
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditorCanvas;