const express = require('express');
const router = express.Router();

const clientController = require('../controllers/clientController');
const { protect } = require('../middleware/auth');
const { isClient } = require('../middleware/roleCheck');
const { validate, paginationValidation } = require('../middleware/validation');

/**
 * @route   GET /api/clients/dashboard
 * @desc    Get client dashboard data
 * @access  Private (Client only)
 */
router.get('/dashboard', protect, isClient, clientController.getDashboard);

/**
 * @route   GET /api/clients/cases
 * @desc    Get client cases
 * @access  Private (Client only)
 */
router.get('/cases', protect, isClient, paginationValidation, validate, clientController.getClientCases);

/**
 * @route   GET /api/clients/documents
 * @desc    Get client documents
 * @access  Private (Client only)
 */
router.get('/documents', protect, isClient, paginationValidation, validate, clientController.getClientDocuments);

/**
 * @route   POST /api/clients/eligibility-check
 * @desc    Check legal aid eligibility
 * @access  Private (Client only)
 */
router.post('/eligibility-check', protect, isClient, clientController.checkEligibility);

/**
 * @route   POST /api/clients/apply-legal-aid
 * @desc    Apply for legal aid
 * @access  Private (Client only)
 */
router.post('/apply-legal-aid', protect, isClient, clientController.applyForLegalAid);

/**
 * @route   PATCH /api/clients/profile
 * @desc    Update client profile
 * @access  Private (Client only)
 */
router.patch('/profile', protect, isClient, clientController.updateClientProfile);

/**
 * @route   GET /api/clients/statistics
 * @desc    Get client statistics
 * @access  Private (Client only)
 */
router.get('/statistics', protect, isClient, clientController.getClientStatistics);

module.exports = router;