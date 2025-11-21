# AI-Driven E-Commerce Campaign Asset Generator MVP

A full-stack web application that transforms product images into professional marketing campaigns using AI-powered layout generation and computer vision technology.

## 🚀 Features

- **Smart Upload Wizard**: Upload products, frame templates, and icons with automatic categorization
- **AI Layout Generation**: Automatic generation of multiple layout options (grids, banners, stories, carousels)
- **Visual Editor**: Drag-and-drop canvas editor powered by Fabric.js
- **Asset Management**: Organize and manage uploaded files with advanced filtering and search
- **Session Management**: Persistent sessions with unique IDs for each user session
- **Responsive Design**: Built with HeroUI for a modern, responsive interface

## 🏗️ Project Structure

```
ecom-saas-mvp-2/
├── backend/                     # Express.js backend
│   ├── package.json            # Backend dependencies
│   ├── server.js               # Main server entry point
│   ├── utils/                  # Utility modules
│   │   ├── fileHandler.js      # File upload and processing
│   │   └── smartLayout.js      # AI layout algorithms
│   └── uploads/                # Dynamic upload directories
│       └── {sessionId}/        # Session-specific directories
│           ├── products/       # Product images
│           ├── icons/          # Icon assets
│           ├── frame/          # Frame templates
│           └── processed/      # Processed assets
├── frontend/                   # React frontend
│   ├── package.json           # Frontend dependencies
│   ├── public/
│   │   └── index.html         # HTML template
│   └── src/
│       ├── index.js           # React entry point
│       ├── App.js             # Main App component
│       ├── App.css            # Global styles
│       ├── components/        # React components
│       │   ├── AppLayout.jsx  # Layout wrapper
│       │   ├── HomePage.jsx   # Landing page
│       │   ├── UploadWizard.jsx # File upload interface
│       │   ├── EditorCanvas.jsx # Visual editor
│       │   └── ProductList.jsx # Asset management
│       └── services/          # API services
│           └── api.js         # API client
└── README.md                  # This file
```

## 🛠️ Technology Stack

### Backend
- **Express.js**: Web framework
- **Multer**: File upload middleware
- **Sharp**: Image processing
- **CSV Parser**: Product data parsing
- **CORS**: Cross-origin resource sharing
- **UUID**: Unique identifier generation

### Frontend
- **React 18**: User interface library
- **HeroUI**: Modern UI component library
- **React Router**: Client-side routing
- **Fabric.js**: Canvas manipulation library
- **Axios**: HTTP client
- **Heroicons**: Icon library
- **JSZip**: File compression

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npm start
```

The backend server will start on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

The frontend development server will start on `http://localhost:3000`

## 🚀 Quick Start

1. **Start the Backend**
   ```bash
   cd backend
   npm install
   npm run dev  # Development mode with nodemon
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Open Your Browser**
   Navigate to `http://localhost:3000` to access the application.

## 🔧 API Endpoints

### Session Management
- `POST /api/session` - Create new session
- `GET /api/session/:id` - Get session status
- `DELETE /api/session/:id` - Delete session

### File Upload
- `POST /api/upload` - Upload files (products, icons, frame)
- `GET /api/files/:sessionId` - Get session files
- `DELETE /api/files/:sessionId/:fileName` - Delete specific file

### Processing
- `POST /api/process` - Process uploaded files
- `GET /api/layouts/:sessionId` - Get AI layout recommendations
- `POST /api/generate` - Generate campaign assets

### Utilities
- `GET /api/health` - Health check
- `GET /` - Server information

## 🎯 Usage Guide

### 1. Upload Assets
- Navigate to the Upload page
- Upload your product images (required)
- Optionally upload frame templates and icons
- Files are automatically organized by session

### 2. View Products
- Check your uploaded assets
- Use filters and search to find specific files
- Preview and manage your assets

### 3. Generate Layouts
- Go to the Editor page
- Click "Generate" to get AI-powered layout recommendations
- Choose from various templates (grid, banner, story, carousel)

### 4. Edit and Export
- Use the drag-and-drop editor to customize layouts
- Add text, adjust positioning, modify styling
- Export your final campaign assets

## 🔐 Session Management

The application uses session-based file management:

- Each user session gets a unique ID
- Files are organized in session-specific directories
- Sessions persist until manually cleared
- New sessions can be generated from the navigation bar

## 🎨 Customization

### Adding New Layout Types
Edit `backend/utils/smartLayout.js` to add new layout algorithms:

```javascript
static async createCustomLayout(products, frameInfo, icons) {
  // Your custom layout logic here
  return layoutElements;
}
```

### Extending the Editor
Add new tools in `frontend/src/components/EditorCanvas.jsx`:

```javascript
const addCustomTool = () => {
  // Your custom tool implementation
};
```

## 🐛 Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (max 50MB)
   - Ensure file type is supported (JPG, PNG, WEBP, SVG)
   - Verify backend server is running

2. **Canvas Not Loading**
   - Check browser console for Fabric.js errors
   - Ensure images are loaded with proper CORS headers

3. **Session Issues**
   - Clear browser localStorage
   - Generate new session from navigation

### Development Mode
Use these commands for development:

```bash
# Backend with auto-reload
cd backend && npm run dev

# Frontend with auto-reload
cd frontend && npm start
```

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## 🔒 Security Features

- File type validation
- File size limits (50MB)
- CORS protection
- Session-based access
- Input sanitization

## 🎯 Performance Optimizations

- Image compression with Sharp
- Lazy loading for large file lists
- Canvas virtualization for better performance
- Efficient state management with React hooks

## 🚀 Deployment

### Backend Deployment
1. Set environment variables
2. Build and deploy to your preferred platform
3. Configure CORS for your frontend domain

### Frontend Deployment
1. Build the production bundle: `npm run build`
2. Deploy the `build` folder to your hosting service
3. Set `REACT_APP_API_URL` environment variable for production API

## 📄 License

This project is created as an MVP demonstration. Please refer to the license file for usage terms.

## 🤝 Contributing

This is an MVP project. For contributions, please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue with detailed steps to reproduce

---

**Built with ❤️ for AI-powered e-commerce campaign generation**