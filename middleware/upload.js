const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../services/logger');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine subdirectory based on file type or route
    let subDir = 'general';
    
    if (req.path.includes('invoice')) {
      subDir = 'invoices';
    } else if (req.path.includes('marketing') || req.path.includes('content')) {
      subDir = 'assets';
    } else if (req.path.includes('product')) {
      subDir = 'products';
    } else if (req.path.includes('attendance') || req.path.includes('beat-tracker')) {
      subDir = 'attendance';
    }

    const dest = path.join(uploadsDir, subDir);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov']
  };

  const fileExt = path.extname(file.originalname).toLowerCase();
  const fileType = file.mimetype;

  if (allowedTypes[fileType] && allowedTypes[fileType].includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileType} not allowed. Allowed types: ${Object.keys(allowedTypes).join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files at once
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err.message);
        return res.status(400).json({ 
          message: err.message || 'File upload failed',
          error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err.message);
        return res.status(400).json({ 
          message: err.message || 'File upload failed',
          error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message
        });
      }
      next();
    });
  };
};

// Helper to get file URL
const getFileUrl = (req, filePath) => {
  if (!filePath) return null;
  
  // If already a full URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }

  // Remove uploads directory from path
  const relativePath = filePath.replace(uploadsDir, '').replace(/\\/g, '/');
  return `/uploads${relativePath}`;
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  getFileUrl
};

