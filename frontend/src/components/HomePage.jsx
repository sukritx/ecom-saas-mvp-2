import React from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, PhotoIcon, RectangleGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
  return (
    <div className="home-page space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-4">
          <SparklesIcon className="h-12 w-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Campaign Generator
        </h1>
        <div className="flex justify-center space-x-4 mt-6">
          <Link to="/upload">
            <button className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
              <PhotoIcon className="h-5 w-5 mr-2" />
              Create Campaign
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


    </div>
  );
};

export default HomePage;