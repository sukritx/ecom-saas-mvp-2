import React from 'react';
import { HeroUIProvider } from '@heroui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import HomePage from './components/HomePage';
import UploadWizard from './components/UploadWizard';
import EditorCanvas from './components/EditorCanvas';
import ProductList from './components/ProductList';
import './App.css';

function App() {
  return (
    <HeroUIProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<AppLayout><UploadWizard /></AppLayout>} />
            <Route path="/editor" element={<AppLayout><EditorCanvas /></AppLayout>} />
            <Route path="/products" element={<AppLayout><ProductList /></AppLayout>} />
          </Routes>
        </div>
      </Router>
    </HeroUIProvider>
  );
}

export default App;