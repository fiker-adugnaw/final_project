const express = require('express');
const router = express.Router();

const volunteerController = require('../controllers/volunteerController');
const { protect } = require('../middleware/auth');
const { isVolunteer, isVolunteerAdvisor } = require('../middleware/roleCheck');
const { validate, paginationValidation } = require('../middleware/validation');

/**
 * @route   GET /api/volunteers/available
 * @desc    Get available volunteers
 * @access  Public
 */
router.get('/available', paginationValidation, validate, volunteerController.getAvailableVolunteers);

/**
 * @route   POST /api/volunteers/apply
 * @desc    Apply as volunteer
 * @access  Private
 */
router.post('/apply', protect, volunteerController.applyAsVolunteer);

/**
 * @route   GET /api/volunteers/my-sessions
 * @desc    Get my volunteer sessions
 * @access  Private (Volunteer only)
 */
router.get('/my-sessions', protect, isVolunteer, paginationValidation, validate, volunteerController.getMySessions);

/**
 * @route   GET /api/volunteers/profile
 * @desc    Get volunteer profile
 * @access  Private (Volunteer only)
 */
router.get('/profile', protect, isVolunteer, volunteerController.getVolunteerProfile);

/**
 * @route   PATCH /api/volunteers/profile
 * @desc    Update volunteer profile
 * @access  Private (Volunteer only)
 */
router.patch('/profile', protect, isVolunteer, volunteerController.updateVolunteerProfile);

/**
 * @route   PATCH /api/volunteers/availability
 * @desc    Update volunteer availability
 * @access  Private (Volunteer only)
 */
router.patch('/availability', protect, isVolunteer, volunteerController.updateAvailability);

/**
 * @route   POST /api/volunteers/supervision-request
 * @desc    Submit supervision request (advisors)
 * @access  Private (Volunteer Advisor only)
 */
router.post('/supervision-request', protect, isVolunteerAdvisor, volunteerController.submitSupervisionRequest);

/**
 * @route   GET /api/volunteers/statistics
 * @desc    Get volunteer statistics
 * @access  Private (Volunteer only)
 */
router.get('/statistics', protect, isVolunteer, volunteerController.getVolunteerStatistics);

module.exports = router;