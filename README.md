# E-Commerce Campaign Asset Generator - MVP 2.0

A full-stack MERN application for generating AI-driven e-commerce campaign assets with CSV data integration, automatic SKU matching, and dynamic text population.

## 🎯 Core Features

### ✅ Implemented Features

#### 1. **CSV Upload & Parsing**
- Upload product data via CSV files
- Automatic column mapping for common variations (SKU, Brand, Product Name, Prices, etc.)
- Support for multiple CSV formats with intelligent header detection
- Real-time CSV data preview and validation

#### 2. **Campaign Management**
- Campaign name and platform selection (Lazada, Shopee, Sasa, General)
- Platform-specific template recommendations
- Campaign data persistence across sessions

#### 3. **Automatic SKU Matching**
- Intelligent image-to-SKU matching using multiple strategies:
  - Exact SKU match in filename
  - SKU contained in filename
  - Filename contained in SKU
- Automatic image renaming to SKU format
- Match rate reporting and unmatched item tracking

#### 4. **Dynamic Text Population**
- Automatic text generation from CSV data:
  - Product names
  - Brand information
  - Original and discounted prices
  - Discount percentage badges
- Smart text positioning and styling
- Support for multiple text elements per product

#### 5. **Font Upload System**
- Support for custom font uploads (TTF, WOFF, WOFF2)
- Font management and storage per session
- Ready for dynamic font application in templates

#### 6. **Enhanced File Management**
- Multi-file upload support:
  - Product images (up to 10)
  - Icons (up to 5)
  - Frame templates (1)
  - CSV files (1)
  - Custom fonts (up to 5)
- File validation and size limits (50MB per file)
- Session-based file organization

#### 7. **Smart Layout Engine**
- CSV-aware layout generation
- Dynamic text element creation based on product data
- Multiple layout types:
  - Grid Layout (with CSV data)
  - Banner Layout (with hero product data)
  - Story Format (vertical with product info)
  - Carousel (multi-slide with data)

#### 8. **Visual Editor**
- Drag-and-drop canvas editing with Fabric.js
- Click-to-add products with automatic CSV data population
- Real-time preview of product information
- Undo/redo functionality
- Export to PNG

## 🏗️ Architecture

### Backend Stack
- **Node.js** + **Express.js** - REST API server
- **Multer** - File upload handling
- **Sharp** - Image processing
- **PapaParse** - CSV parsing with column mapping
- **UUID** - Session management

### Frontend Stack
- **React** - UI framework
- **Hero UI** - Component library
- **Tailwind CSS** - Styling
- **Fabric.js** - Canvas manipulation
- **Axios** - API communication

## 📁 Project Structure

```
ecom-saas-mvp-2/
├── backend/
│   ├── server.js                 # Express server with all endpoints
│   ├── utils/
│   │   ├── fileHandler.js        # File upload, CSV parsing, SKU matching
│   │   └── smartLayout.js        # Layout generation with CSV data
│   └── uploads/                  # Session-based file storage
│       └── [sessionId]/
│           ├── products/         # Product images (renamed to SKU)
│           ├── icons/            # Icon files
│           ├── frame/            # Frame template
│           ├── fonts/            # Custom fonts
│           ├── processed/        # Generated assets
│           ├── products.csv      # Uploaded CSV file
│           └── session.json      # Session metadata
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── UploadWizard.jsx  # Multi-tab upload with CSV & fonts
    │   │   ├── EditorCanvas.jsx  # Canvas editor with CSV data
    │   │   ├── ProductList.jsx   # Product management
    │   │   ├── HomePage.jsx      # Landing page
    │   │   └── AppLayout.jsx     # App shell
    │   └── services/
    │       └── api.js            # API service with all endpoints
    └── public/
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ecom-saas-mvp-2
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the backend server**
```bash
cd backend
npm start
```
Server runs on `http://localhost:5000`

2. **Start the frontend development server**
```bash
cd frontend
npm start
```
Frontend runs on `http://localhost:3000`

## 📊 CSV File Format

### Required/Recommended Columns

The system automatically maps common column variations. Use any of these column names:

| Standard Field | Accepted Variations |
|---------------|-------------------|
| SKU | `sku`, `product_sku`, `item_sku`, `code`, `product_code` |
| Brand | `brand`, `brand_name`, `manufacturer` |
| Product Name | `product_name`, `name`, `title`, `product_title`, `item_name` |
| Full Price | `full_price`, `original_price`, `price`, `msrp`, `retail_price` |
| Discounted Price | `discounted_price`, `sale_price`, `promo_price`, `special_price` |
| Discount % | `discount_percent`, `discount`, `discount_%`, `off` |
| Description | `description`, `product_description`, `details` |
| Category | `category`, `product_category`, `type` |

### Example CSV

```csv
SKU,Brand,Product Name,Full Price,Discounted Price,Discount Percent
SKU001,BrandA,Premium Product 1,99.99,79.99,20
SKU002,BrandB,Deluxe Item 2,149.99,119.99,20
SKU003,BrandA,Standard Product 3,49.99,39.99,20
```

## 🔌 API Endpoints

### Session Management
- `POST /api/session` - Create new session
- `GET /api/session/:sessionId` - Get session status
- `DELETE /api/session/:sessionId` - Delete session

### File Upload
- `POST /api/upload` - Upload files (products, icons, frame, CSV, fonts)
- `GET /api/files/:sessionId` - Get all session files

### Campaign Management
- `POST /api/campaign` - Create/update campaign
- `GET /api/campaign/:sessionId` - Get campaign details

### CSV & Product Matching
- `GET /api/csv/:sessionId` - Get parsed CSV data
- `POST /api/match-products` - Match images to CSV SKUs

### Layout & Templates
- `GET /api/layouts/:sessionId` - Get layout recommendations
- `POST /api/analyze-template` - Analyze best template for campaign
- `POST /api/process` - Process files and generate layouts
- `POST /api/generate` - Generate final campaign assets

## 🎨 Usage Workflow

### 1. Campaign Setup
1. Navigate to Upload Wizard
2. Enter campaign name (e.g., "Black Friday 2025")
3. Select e-commerce platform (Lazada, Shopee, etc.)

### 2. Upload CSV Data
1. Go to "Campaign" tab
2. Upload CSV file with product data
3. System automatically parses and validates data

### 3. Upload Product Images
1. Go to "Products" tab
2. Upload product images (name files with SKU for auto-matching)
3. System matches images to CSV data by SKU

### 4. Upload Additional Assets (Optional)
- **Frame Tab**: Upload custom frame template
- **Icons Tab**: Upload promotional icons
- **Fonts Tab**: Upload custom fonts (TTF, WOFF, WOFF2)

### 5. Generate & Edit
1. Click "Proceed to Editor"
2. Click "Generate" to create layout recommendations
3. Select a template to load
4. Click products to add with automatic CSV data
5. Customize layout with drag-and-drop
6. Export final design

## 🔧 Key Features Explained

### SKU Matching Algorithm
The system uses a three-strategy approach:
1. **Exact Match**: Filename exactly matches SKU
2. **Contains Match**: Filename contains the SKU
3. **Reverse Contains**: SKU contains the filename

Example:
- Image: `SKU123.jpg` → Matches SKU: `SKU123`
- Image: `product-SKU123-photo.jpg` → Matches SKU: `SKU123`
- Image: `123.jpg` → Matches SKU: `PROD-123-XL`

### Dynamic Text Generation
When a product with CSV data is added to canvas:
- **Product Name**: Bold, centered, 24px
- **Brand**: Gray, centered, 16px
- **Original Price**: Strikethrough if discounted
- **Sale Price**: Red, bold, prominent
- **Discount Badge**: Red background, white text, positioned on image

### Template-Campaign Analysis
System recommends templates based on:
- Platform type (marketplace vs general)
- Presence of CSV data
- Number of products
- Availability of frame/icons

## 🐛 Troubleshooting

### CSV Not Loading
- Ensure CSV file has headers in first row
- Check column names match accepted variations
- Verify file encoding is UTF-8

### Images Not Matching SKUs
- Rename image files to include SKU code
- Check SKU format in CSV matches filename
- Use exact SKU as filename for best results

### Upload Fails
- Check file size (max 50MB per file)
- Verify file types (images: JPG/PNG/WEBP, fonts: TTF/WOFF/WOFF2)
- Ensure stable internet connection

## 📈 Future Enhancements

- [ ] AI-powered image background removal
- [ ] Batch export for multiple products
- [ ] Template marketplace
- [ ] Multi-language support
- [ ] Advanced font styling in editor
- [ ] Video asset generation
- [ ] Social media format presets
- [ ] Collaborative editing

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For issues and questions:
- Create an issue on GitHub
- Contact: support@example.com

---

**Built with ❤️ using MERN Stack**
