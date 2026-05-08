const express = require('express');
const router = express.Router();

const lawyerController = require('../controllers/lawyerController');
const { protect } = require('../middleware/auth');
const { isLawyer, isVerifiedLawyer } = require('../middleware/roleCheck');
const { validate, idValidation, paginationValidation } = require('../middleware/validation');

// ─── Lawyer-side Verification Routes (TOP PRIORITY) ─────────────────────────
const lawyerVerificationController = require('../controllers/lawyerVerificationController');
const { handleVerificationUpload } = require('../middleware/upload');

/**
 * @route   GET /api/lawyers/my/verification-status
 * @desc    Get own verification status, history, and appeal/resubmit eligibility
 * @access  Private (Lawyer only)
 */
router.get('/my/verification-status', protect, isLawyer, lawyerVerificationController.getMyVerificationStatus);

/**
 * @route   POST /api/lawyers/my/documents
 * @desc    Upload verification documents (license, bar ID, certificates)
 * @access  Private (Lawyer only)
 */
router.post('/my/documents', protect, isLawyer, handleVerificationUpload, lawyerVerificationController.uploadVerificationDocuments);

/**
 * @route   POST /api/lawyers/my/resubmit
 * @desc    Resubmit verification after rejection (7-day cooldown, max 3 attempts)
 * @access  Private (Lawyer only)
 */
router.post('/my/resubmit', protect, isLawyer, lawyerVerificationController.resubmitVerification);

/**
 * @route   POST /api/lawyers/my/appeal
 * @desc    Submit appeal against suspension (30-day window)
 * @access  Private (Lawyer only)
 */
router.post('/my/appeal', protect, isLawyer, handleVerificationUpload, lawyerVerificationController.submitAppeal);

/**
 * @route   GET /api/lawyers/statistics
 * @desc    Get lawyer statistics
 * @access  Private (Lawyer only)
 */
router.get('/statistics', protect, isLawyer, lawyerController.getLawyerStatistics);

/**
 * @route   PATCH /api/lawyers/profile
 * @desc    Update lawyer profile
 * @access  Private (Lawyer only)
 */
router.patch('/profile', protect, isLawyer, lawyerController.updateLawyerProfile);

/**
 * @route   GET /api/lawyers
 * @desc    Get all lawyers with filters
 * @access  Public
 */
router.get('/', paginationValidation, validate, lawyerController.getAllLawyers);

/**
 * @route   GET /api/lawyers/search
 * @desc    Search lawyers
 * @access  Public
 */
router.get('/search', lawyerController.searchLawyers);

/**
 * @route   GET /api/lawyers/specializations
 * @desc    Get lawyer specializations list
 * @access  Public
 */
router.get('/specializations', lawyerController.getSpecializations);

/**
 * @route   GET /api/lawyers/featured
 * @desc    Get featured lawyers
 * @access  Public
 */
router.get('/featured', lawyerController.getFeaturedLawyers);

// ─── Public Lawyer Routes ─────────────────────────────────────────────────────

/**
 * @route   GET /api/lawyers/:id
 * @desc    Get lawyer by ID
 * @access  Public
 */
router.get('/:id', idValidation, validate, lawyerController.getLawyerById);

/**
 * @route   GET /api/lawyers/:id/reviews
 * @desc    Get lawyer reviews
 * @access  Public
 */
router.get('/:id/reviews', idValidation, validate, lawyerController.getLawyerReviews);

/**
 * @route   POST /api/lawyers/:id/reviews
 * @desc    Add review for lawyer
 * @access  Private (Client only)
 */
router.post('/:id/reviews', protect, idValidation, validate, lawyerController.addReview);

/**
 * @route   GET /api/lawyers/:id/availability
 * @desc    Get lawyer availability
 * @access  Public
 */
router.get('/:id/availability', idValidation, validate, lawyerController.getLawyerAvailability);

module.exports = router;