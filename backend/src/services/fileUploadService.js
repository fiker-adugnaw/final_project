const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

/**
 * File Upload Service
 * Handles all file uploads for the AI Legal Assistance Platform
 * Primary storage: Cloudinary (cloud)
 * Fallback: Local disk (development)
 */

// ─── Configuration ─────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = {
    // Documents
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    // Images
    'image/jpeg': 'JPG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'PNG'
};

const UPLOAD_FOLDERS = {
    documents: 'legal-platform/documents',
    profiles: 'legal-platform/profiles',
    lawyer_credentials: 'legal-platform/credentials',
    volunteer_credentials: 'legal-platform/credentials',
    forum_attachments: 'legal-platform/forum',
    chat_attachments: 'legal-platform/chat'
};

// ─── Cloudinary Setup ──────────────────────────────────────────────────────────

let cloudinary = null;
let cloudinaryStorage = null;

const getCloudinary = () => {
    if (cloudinary) return cloudinary;

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.warn('[FileUploadService] Cloudinary credentials not configured — falling back to local storage.');
        return null;
    }

    try {
        const { v2: cld } = require('cloudinary');
        cld.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });
        cloudinary = cld;
        return cloudinary;
    } catch (err) {
        console.warn('[FileUploadService] cloudinary package not installed:', err.message);
        return null;
    }
};

const getCloudinaryStorage = () => {
    if (cloudinaryStorage) return cloudinaryStorage;

    const cld = getCloudinary();
    if (!cld) return null;

    try {
        const { CloudinaryStorage } = require('multer-storage-cloudinary');
        cloudinaryStorage = CloudinaryStorage;
        return cloudinaryStorage;
    } catch (err) {
        console.warn('[FileUploadService] multer-storage-cloudinary not installed:', err.message);
        return null;
    }
};

// ─── Local Storage Setup (Development Fallback) ────────────────────────────────

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const ensureLocalUploadDir = (subfolder = '') => {
    const dir = path.join(LOCAL_UPLOAD_DIR, subfolder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

const localDiskStorage = (folder = 'documents') => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = ensureLocalUploadDir(folder);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${uniqueSuffix}${ext}`);
        }
    });
};

// ─── File Validation ───────────────────────────────────────────────────────────

const fileFilter = (allowedTypes = null) => (req, file, cb) => {
    const allowedMimes = allowedTypes || Object.keys(ALLOWED_MIME_TYPES);

    if (!allowedMimes.includes(file.mimetype)) {
        const error = new Error(
            `Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`
        );
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
    }

    cb(null, true);
};

// ─── Multer Upload Factories ───────────────────────────────────────────────────

/**
 * Build a multer instance — Cloudinary if available, else local disk
 */
const buildUploader = (folder = 'documents', options = {}) => {
    const {
        maxSize = MAX_FILE_SIZE,
        allowedMimes = null,
        fieldName = 'file'
    } = options;

    let storage;

    const cld = getCloudinary();
    const CloudinaryStorageClass = getCloudinaryStorage();

    if (cld && CloudinaryStorageClass) {
        storage = new CloudinaryStorageClass({
            cloudinary: cld,
            params: {
                folder: UPLOAD_FOLDERS[folder] || `legal-platform/${folder}`,
                allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'],
                resource_type: 'auto',
                // Generate a secure unique public_id
                public_id: (req, file) => {
                    const ext = path.extname(file.originalname).replace('.', '');
                    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
                    return `${folder}_${uniqueSuffix}`;
                }
            }
        });
    } else {
        storage = localDiskStorage(folder);
    }

    return multer({
        storage,
        limits: { fileSize: maxSize },
        fileFilter: fileFilter(allowedMimes)
    });
};

// ─── Specialized Upload Middleware ─────────────────────────────────────────────

/** Upload a single legal document */
const uploadDocument = buildUploader('documents').single('document');

/** Upload a single profile avatar */
const uploadProfilePhoto = buildUploader('profiles', {
    maxSize: 3 * 1024 * 1024, // 3 MB
    allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}).single('avatar');

/** Upload lawyer credentials (up to 5 files) */
const uploadLawyerCredentials = buildUploader('lawyer_credentials').array('credentials', 5);

/** Upload volunteer credentials (up to 3 files) */
const uploadVolunteerCredentials = buildUploader('volunteer_credentials').array('credentials', 3);

/** Upload forum attachment (single) */
const uploadForumAttachment = buildUploader('forum_attachments', {
    maxSize: 5 * 1024 * 1024 // 5 MB
}).single('attachment');

/** Generic single-file upload with custom folder */
const uploadSingle = (folder, fieldName = 'file') =>
    buildUploader(folder).single(fieldName);

/** Generic multi-file upload with custom folder */
const uploadMultiple = (folder, fieldName = 'files', maxCount = 10) =>
    buildUploader(folder).array(fieldName, maxCount);

// ─── File Info Extractor ───────────────────────────────────────────────────────

/**
 * Extract normalized file info after successful upload
 * Works for both Cloudinary and local disk
 */
const extractFileInfo = (file) => {
    if (!file) return null;

    // Cloudinary file
    if (file.path && file.path.startsWith('http')) {
        return {
            fileUrl: file.path,
            publicId: file.filename,
            originalName: file.originalname,
            fileName: file.filename,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileType: ALLOWED_MIME_TYPES[file.mimetype] || 'OTHER',
            storage: 'cloudinary'
        };
    }

    // Local file
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const relativePath = path.relative(LOCAL_UPLOAD_DIR, file.path).replace(/\\/g, '/');

    return {
        fileUrl: `${baseUrl}/uploads/${relativePath}`,
        publicId: file.filename,
        originalName: file.originalname,
        fileName: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType: ALLOWED_MIME_TYPES[file.mimetype] || 'OTHER',
        localPath: file.path,
        storage: 'local'
    };
};

// ─── File Deletion ─────────────────────────────────────────────────────────────

/**
 * Delete a file from Cloudinary by publicId
 */
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
    const cld = getCloudinary();
    if (!cld) return { success: false, error: 'Cloudinary not configured' };

    try {
        const result = await cld.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`[FileUploadService] Deleted from Cloudinary: ${publicId}`);
        return { success: true, result };
    } catch (error) {
        console.error(`[FileUploadService] Failed to delete ${publicId}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a local file safely
 */
const deleteLocalFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[FileUploadService] Deleted local file: ${filePath}`);
            return { success: true };
        }
        return { success: false, error: 'File not found' };
    } catch (error) {
        console.error(`[FileUploadService] Failed to delete local file:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Unified delete function (detects Cloudinary or local)
 */
const deleteFile = async (fileInfo) => {
    if (!fileInfo) return { success: false, error: 'No file info provided' };

    if (fileInfo.storage === 'cloudinary' && fileInfo.publicId) {
        return deleteFromCloudinary(fileInfo.publicId);
    }

    if (fileInfo.localPath) {
        return deleteLocalFile(fileInfo.localPath);
    }

    return { success: false, error: 'Unable to determine file location' };
};

// ─── Direct Cloudinary Upload (Buffer / Stream) ────────────────────────────────

/**
 * Upload a file buffer directly to Cloudinary (e.g., from AI-generated content)
 */
const uploadBufferToCloudinary = async (buffer, options = {}) => {
    const cld = getCloudinary();
    if (!cld) throw new Error('Cloudinary not configured');

    const {
        folder = 'legal-platform/documents',
        publicId = `upload_${Date.now()}`,
        resourceType = 'auto',
        format = 'pdf'
    } = options;

    return new Promise((resolve, reject) => {
        const uploadStream = cld.uploader.upload_stream(
            { folder, public_id: publicId, resource_type: resourceType, format },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// ─── Error Handler Middleware ──────────────────────────────────────────────────

/**
 * Handle Multer-specific upload errors (attach as Express error middleware)
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
            });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }

    if (err && err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, message: err.message });
    }

    next(err);
};

// ─── Utility Helpers ───────────────────────────────────────────────────────────

/**
 * Generate a secure file hash (SHA-256) for deduplication/integrity checks
 */
const generateFileHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Check if Cloudinary is active
 */
const isCloudinaryActive = () => !!getCloudinary();

module.exports = {
    // Middleware uploaders
    uploadDocument,
    uploadProfilePhoto,
    uploadLawyerCredentials,
    uploadVolunteerCredentials,
    uploadForumAttachment,
    uploadSingle,
    uploadMultiple,

    // Utilities
    extractFileInfo,
    deleteFile,
    deleteFromCloudinary,
    deleteLocalFile,
    uploadBufferToCloudinary,
    handleUploadError,
    generateFileHash,
    isCloudinaryActive,

    // Constants
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    UPLOAD_FOLDERS,

    // Internal but useful for middleware
    buildUploader
};
