const { buildUploader } = require('../services/fileUploadService');
const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

/**
 * Upload Middleware
 * Provides pre-configured multer instances for different upload types
 */

// Profile picture uploader - used in userRoutes
const uploadProfilePicture = buildUploader('profiles');

// Document uploader - general purpose
const uploadDocument = buildUploader('documents');

// ─── Verification Document Uploader ─────────────────────────────────────────
// Custom validation for verification documents: strict type/size rules
const verificationStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/verification/');
    },
    filename: (req, file, cb) => {
        const userId = req.user?._id || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `lawyer-${userId}-${file.fieldname}-${timestamp}${ext}`);
    }
});

const verificationFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new AppError(
            `File type not allowed. Accepted: JPEG, PNG, PDF. Got: ${file.mimetype}`,
            400
        ), false);
    }
    cb(null, true);
};

const uploadVerificationDocs = multer({
    storage: verificationStorage,
    fileFilter: verificationFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,  // 5MB max per file
        files: 7                     // max total files per request
    }
}).fields([
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'barAssociationId', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'additionalCertificates', maxCount: 5 }
]);

// Wrapper to provide friendly errors from multer
const handleVerificationUpload = (req, res, next) => {
    uploadVerificationDocs(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new AppError('File too large. Maximum size is 5MB per file.', 400));
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return next(new AppError('Too many files. Maximum 7 files allowed.', 400));
            }
            return next(new AppError(`Upload error: ${err.message}`, 400));
        }
        if (err) return next(err);
        next();
    });
};

module.exports = {
    uploadProfilePicture,
    uploadDocument,
    handleVerificationUpload
};
