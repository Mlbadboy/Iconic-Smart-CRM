const fs = require('fs');
const path = require('path');
const multer = require('multer');
const logger = require('./logger');

// Local storage directory for company logos and favicons
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'company-assets');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]);

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === 'favicon' ? 'favicon' : 'logo';
    const companyCode = (req.body.code || req.params.id || 'comp').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${companyCode}-${prefix}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Allowed: PNG, JPEG, SVG, WEBP, ICO (Max 2MB)'), false);
  }
};

const uploadAsset = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB limit
  }
});

/**
 * Generates public asset URL for stored file
 */
function getAssetUrl(filename) {
  if (!filename) return null;
  // If already a full URL (e.g. S3 / CDN), return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return `/uploads/company-assets/${path.basename(filename)}`;
}

module.exports = {
  uploadAsset,
  getAssetUrl,
  UPLOAD_DIR
};
