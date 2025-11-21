import React from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, PhotoIcon, RectangleGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
  return (
    <div className="home-page space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <SparklesIcon className="h-16 w-16 text-blue-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">
          AI-Driven E-Commerce Campaign Asset Generator
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Transform your product images into professional marketing campaigns using AI-powered layout generation and computer vision technology.
        </p>
        <div className="flex justify-center space-x-4 mt-6">
          <Link to="/upload">
            <button className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
              <PhotoIcon className="h-5 w-5 mr-2" />
              Get Started
            </button>
          </Link>
          <Link to="/products">
            <button className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
              <RectangleGroupIcon className="h-5 w-5 mr-2" />
              View Products
            </button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <PhotoIcon className="h-8 w-8 text-blue-500" />
            <h3 className="text-lg font-semibold">Smart Upload</h3>
          </div>
          <p className="text-gray-600">
            Upload products, frame templates, and icons. Our AI automatically analyzes and categorizes your assets.
          </p>
          <div className="mt-3">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              Computer Vision
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Cog6ToothIcon className="h-8 w-8 text-blue-500" />
            <h3 className="text-lg font-semibold">AI Layout Generation</h3>
          </div>
          <p className="text-gray-600">
            Automatically generate multiple layout options including grids, banners, stories, and carousels.
          </p>
          <div className="mt-3">
            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
              Smart Algorithms
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <RectangleGroupIcon className="h-8 w-8 text-blue-500" />
            <h3 className="text-lg font-semibold">Visual Editor</h3>
          </div>
          <p className="text-gray-600">
            Fine-tune your designs with our drag-and-drop editor. Perfect positioning and professional results.
          </p>
          <div className="mt-3">
            <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
              Drag & Drop
            </span>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg p-8 mt-12">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-500">1</span>
            </div>
            <h3 className="font-semibold mb-2">Upload Assets</h3>
            <p className="text-gray-600 text-sm">Upload your product images, frame templates, and icons</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-500">2</span>
            </div>
            <h3 className="font-semibold mb-2">AI Analysis</h3>
            <p className="text-gray-600 text-sm">Our AI analyzes your assets and generates smart layout recommendations</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-500">3</span>
            </div>
            <h3 className="font-semibold mb-2">Choose Template</h3>
            <p className="text-gray-600 text-sm">Select from multiple AI-generated layout options</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-500">4</span>
            </div>
            <h3 className="font-semibold mb-2">Export Campaign</h3>
            <p className="text-gray-600 text-sm">Fine-tune in the editor and export ready-to-use assets</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Create Amazing Campaigns?</h2>
        <p className="text-lg mb-6 opacity-90">
          Start generating professional marketing assets in minutes, not hours.
        </p>
        <Link to="/upload">
          <button className="bg-white text-blue-500 px-6 py-3 font-medium rounded-lg hover:bg-gray-100 transition-colors">
            Start Creating Now
          </button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;