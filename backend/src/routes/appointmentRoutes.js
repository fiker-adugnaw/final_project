const express = require('express');
const router = express.Router();

const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const { validate, idValidation, paginationValidation, appointmentValidation } = require('../middleware/validation');

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments for current user
 * @access  Private
 */
router.get('/', protect, paginationValidation, validate, appointmentController.getAppointments);

/**
 * @route   GET /api/appointments/upcoming
 * @desc    Get upcoming appointments
 * @access  Private
 */
router.get('/upcoming', protect, appointmentController.getUpcomingAppointments);

/**
 * @route   GET /api/appointments/available-slots
 * @desc    Get available time slots
 * @access  Public
 */
router.get('/available-slots', appointmentController.getAvailableSlots);

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Private
 */
router.post('/', protect, appointmentValidation, validate, appointmentController.createAppointment);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
router.get('/:id', protect, idValidation, validate, appointmentController.getAppointmentById);

/**
 * @route   PATCH /api/appointments/:id
 * @desc    Update appointment
 * @access  Private
 */
router.patch('/:id', protect, idValidation, validate, appointmentController.updateAppointment);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel appointment
 * @access  Private
 */
router.delete('/:id', protect, idValidation, validate, appointmentController.cancelAppointment);

/**
 * @route   POST /api/appointments/:id/confirm
 * @desc    Confirm appointment
 * @access  Private (Lawyer/Volunteer only)
 */
router.post('/:id/confirm', protect, idValidation, validate, appointmentController.confirmAppointment);

/**
 * @route   POST /api/appointments/:id/reschedule
 * @desc    Reschedule appointment
 * @access  Private
 */
router.post('/:id/reschedule', protect, idValidation, validate, appointmentController.rescheduleAppointment);

/**
 * @route   POST /api/appointments/:id/feedback
 * @desc    Add feedback to appointment
 * @access  Private (Client only)
 */
router.post('/:id/feedback', protect, idValidation, validate, appointmentController.addFeedback);

/**
 * @route   POST /api/appointments/:id/reminder
 * @desc    Send appointment reminder manually
 * @access  Private
 */
router.post('/:id/reminder', protect, idValidation, validate, appointmentController.sendReminder);

module.exports = router;