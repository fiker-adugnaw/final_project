const express = require('express');
const router = express.Router();

const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const { validate, idValidation, paginationValidation, documentValidation } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/documents/upload
 * @desc    Upload document
 * @access  Private
 */
router.post(
    '/upload',
    protect,
    uploadLimiter,
    documentController.upload.single('document'),
    documentValidation,
    validate,
    documentController.uploadDocument
);

/**
 * @route   GET /api/documents
 * @desc    Get user documents
 * @access  Private
 */
router.get('/', protect, paginationValidation, validate, documentController.getDocuments);

/**
 * @route   GET /api/documents/templates
 * @desc    Get document templates
 * @access  Public
 */
router.get('/templates', documentController.getTemplates);

/**
 * @route   POST /api/documents/from-template/:templateId
 * @desc    Create document from template
 * @access  Private
 */
router.post('/from-template/:templateId', protect, idValidation, validate, documentController.createFromTemplate);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get('/:id', protect, idValidation, validate, documentController.getDocumentById);

/**
 * @route   PATCH /api/documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.patch('/:id', protect, idValidation, validate, documentController.updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete('/:id', protect, idValidation, validate, documentController.deleteDocument);

/**
 * @route   POST /api/documents/:id/share
 * @desc    Share document with user
 * @access  Private
 */
router.post('/:id/share', protect, idValidation, validate, documentController.shareDocument);

/**
 * @route   DELETE /api/documents/:id/share/:userId
 * @desc    Revoke document access
 * @access  Private
 */
router.delete('/:id/share/:userId', protect, idValidation, validate, documentController.revokeAccess);

/**
 * @route   POST /api/documents/:id/verify
 * @desc    Verify document (Admin only)
 * @access  Private (Admin only)
 */
router.post('/:id/verify', protect, isAdmin, idValidation, validate, documentController.verifyDocument);

module.exports = router;