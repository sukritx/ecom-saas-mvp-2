import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || '';
  });

  const generateNewSession = () => {
    const newSessionId = 'session-' + Date.now();
    localStorage.setItem('sessionId', newSessionId);
    setSessionId(newSessionId);
  };

  return (
    <div className="app-layout min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="font-bold text-xl text-blue-500">AI Campaign Generator</h1>
            </div>
            
            <div className="hidden sm:flex items-center space-x-8">
              <Link 
                to="/" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-blue-500'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/upload" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/upload' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-blue-500'
                }`}
              >
                Upload
              </Link>
              <Link 
                to="/products" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/products' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-blue-500'
                }`}
              >
                Products
              </Link>
              <Link 
                to="/editor" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/editor' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-blue-500'
                }`}
              >
                Editor
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {sessionId && (
                <span className="text-sm text-gray-500">
                  Session: {sessionId.substring(0, 12)}...
                </span>
              )}
              <button 
                onClick={generateNewSession}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                New Session
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>AI-Driven E-Commerce Campaign Asset Generator MVP</p>
          <p className="text-sm mt-1">Built with React, Tailwind CSS, and Express.js</p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;