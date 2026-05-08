/**
 * Document Controller
 * Handles document upload, management, sharing, and verification
 */

const Document = require('../models/Document');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const { DOCUMENT_TYPES, HTTP_STATUS, FILE_UPLOAD } = require('../config/constants');
const { uploadToCloud } = require('../services/fileUploadService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('File type not allowed', HTTP_STATUS.BAD_REQUEST), false);
    }
};

exports.upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: FILE_UPLOAD.MAX_SIZE }
});

/**
 * Upload document
 * @route POST /api/documents/upload
 * @access Private
 */
exports.uploadDocument = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload a file', HTTP_STATUS.BAD_REQUEST));
    }

    const { documentType, description, caseType, tags } = req.body;

    // Upload to cloud storage
    const cloudResult = await uploadToCloud(req.file.path);

    const document = await Document.create({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType: path.extname(req.file.originalname).substring(1).toUpperCase(),
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileUrl: cloudResult.url,
        publicId: cloudResult.publicId,
        documentType,
        description,
        caseType,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        ownerId: req.user._id,
        ownerType: req.user.userType,
        uploadedBy: req.user._id,
        verificationStatus: 'PENDING_VERIFICATION'
    });

    // Log upload
    await SystemLog.log({
        userId: req.user._id,
        action: 'DOCUMENT_UPLOADED',
        module: 'DOCUMENT',
        severity: 'INFO',
        details: { documentId: document._id, fileName: document.originalName }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Document uploaded successfully',
        data: { document }
    });
});

/**
 * Get user documents
 * @route GET /api/documents
 * @access Private
 */
exports.getDocuments = catchAsync(async (req, res, next) => {
    const { documentType, status, page = 1, limit = 20 } = req.query;

    const query = {
        $or: [
            { ownerId: req.user._id },
            { 'sharedWith.userId': req.user._id }
        ],
        status: 'ACTIVE'
    };

    if (documentType) {
        query.documentType = documentType;
    }

    if (status) {
        query.verificationStatus = status;
    }

    const documents = await Document.find(query)
        .populate('ownerId', 'fullName email')
        .populate('sharedWith.userId', 'fullName email')
        .sort({ uploadedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Document.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            documents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get document by ID
 * @route GET /api/documents/:id
 * @access Private
 */
exports.getDocumentById = catchAsync(async (req, res, next) => {
    const document = await Document.findById(req.params.id)
        .populate('ownerId', 'fullName email')
        .populate('sharedWith.userId', 'fullName email')
        .populate('versionHistory.modifiedBy', 'fullName email');

    if (!document) {
        return next(new AppError('Document not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check access
    const hasAccess = await document.hasAccess(req.user._id);
    if (!hasAccess && req.user.userType !== 'ADMIN') {
        return next(new AppError('You do not have access to this document', HTTP_STATUS.FORBIDDEN));
    }

    // Update last accessed
    document.lastAccessedAt = new Date();
    document.lastAccessedBy = req.user._id;
    await document.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { document }
    });
});

/**
 * Update document metadata
 * @route PATCH /api/documents/:id
 * @access Private
 */
exports.updateDocument = catchAsync(async (req, res, next) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check ownership
    if (document.ownerId.toString() !== req.user._id.toString() && req.user.userType !== 'ADMIN') {
        return next(new AppError('Only the owner can update document metadata', HTTP_STATUS.FORBIDDEN));
    }

    const allowedFields = ['description', 'tags', 'documentType'];
    const updateData = {};

    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    const updatedDocument = await Document.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Document updated successfully',
        data: { document: updatedDocument }
    });
});

/**
 * Delete document
 * @route DELETE /api/documents/:id
 * @access Private
 */
exports.deleteDocument = catchAsync(async (req, res, next) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check ownership
    if (document.ownerId.toString() !== req.user._id.toString() && req.user.userType !== 'ADMIN') {
        return next(new AppError('Only the owner can delete this document', HTTP_STATUS.FORBIDDEN));
    }

    // Soft delete
    document.status = 'ARCHIVED';
    await document.save();

    // Log deletion
    await SystemLog.log({
        userId: req.user._id,
        action: 'DOCUMENT_DELETED',
        module: 'DOCUMENT',
        severity: 'INFO',
        details: { documentId: document._id }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Document deleted successfully'
    });
});

/**
 * Share document with user
 * @route POST /api/documents/:id/share
 * @access Private
 */
exports.shareDocument = catchAsync(async (req, res, next) => {
    const { userId, permissions, message } = req.body;

    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check ownership
    if (document.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('Only the owner can share this document', HTTP_STATUS.FORBIDDEN));
    }

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
    }

    await document.shareWith(userId, permissions, req.user._id);

    // Create notification for recipient
    await Notification.create({
        userId,
        type: 'DOCUMENT_SHARED',
        title: 'Document Shared With You',
        message: `${req.user.fullName} shared a document with you: ${document.originalName}`,
        data: {
            documentId: document._id,
            sharerId: req.user._id,
            message
        }
    });

    // Log sharing
    await SystemLog.log({
        userId: req.user._id,
        action: 'DOCUMENT_SHARED',
        module: 'DOCUMENT',
        severity: 'INFO',
        details: { documentId: document._id, sharedWith: userId }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Document shared successfully',
        data: { sharedWith: document.sharedWith }
    });
});

/**
 * Revoke document access
 * @route DELETE /api/documents/:id/share/:userId
 * @access Private
 */
exports.revokeAccess = catchAsync(async (req, res, next) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check ownership
    if (document.ownerId.toString() !== req.user._id.toString()) {
        return next(new AppError('Only the owner can revoke access', HTTP_STATUS.FORBIDDEN));
    }

    document.sharedWith = document.sharedWith.filter(
        s => s.userId.toString() !== req.params.userId
    );
    await document.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Access revoked successfully'
    });
});

/**
 * Get document templates
 * @route GET /api/documents/templates
 * @access Public
 */
exports.getTemplates = catchAsync(async (req, res, next) => {
    const { category } = req.query;

    const templates = await Document.getTemplates(category);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { templates }
    });
});

/**
 * Create document from template
 * @route POST /api/documents/from-template/:templateId
 * @access Private
 */
exports.createFromTemplate = catchAsync(async (req, res, next) => {
    const template = await Document.findById(req.params.templateId);

    if (!template || !template.isTemplate) {
        return next(new AppError('Template not found', HTTP_STATUS.NOT_FOUND));
    }

    // Create new document based on template
    const document = await Document.create({
        fileName: `Copy of ${template.fileName}`,
        originalName: `Copy of ${template.originalName}`,
        fileType: template.fileType,
        fileUrl: template.fileUrl,
        documentType: template.documentType,
        description: template.description,
        ownerId: req.user._id,
        ownerType: req.user.userType,
        uploadedBy: req.user._id,
        isTemplate: false
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: { document }
    });
});

/**
 * Verify document (Admin only)
 * @route POST /api/documents/:id/verify
 * @access Private (Admin only)
 */
exports.verifyDocument = catchAsync(async (req, res, next) => {
    const { status, notes } = req.body;

    const document = await Document.findById(req.params.id);

    if (!document) {
        return next(new AppError('Document not found', HTTP_STATUS.NOT_FOUND));
    }

    document.verificationStatus = status;
    document.verifiedBy = req.user._id;
    document.verifiedAt = new Date();
    document.verificationNotes = notes;
    await document.save();

    // Notify owner
    await Notification.create({
        userId: document.ownerId,
        type: 'DOCUMENT_VERIFIED',
        title: 'Document Verification Update',
        message: `Your document "${document.originalName}" has been ${status.toLowerCase()}`,
        data: { documentId: document._id, status }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `Document ${status.toLowerCase()} successfully`
    });
});

module.exports = exports;