const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate, idValidation, paginationValidation } = require('../middleware/validation');
const { uploadProfilePicture } = require('../middleware/upload');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', protect, userController.getProfile);

/**
 * @route   PATCH /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile', protect, userController.updateProfile);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', protect, userController.deleteAccount);

/**
 * @route   GET /api/users/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/notifications', protect, paginationValidation, validate, userController.getNotifications);

/**
 * @route   PATCH /api/users/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/notifications/:id/read', protect, idValidation, validate, userController.markNotificationRead);

/**
 * @route   PATCH /api/users/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/notifications/read-all', protect, userController.markAllNotificationsRead);

/**
 * @route   PUT /api/users/notification-preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/notification-preferences', protect, userController.updateNotificationPreferences);

/**
 * @route   GET /api/users/activity
 * @desc    Get user activity log
 * @access  Private
 */
router.get('/activity', protect, paginationValidation, validate, userController.getUserActivity);

/**
 * @route   POST /api/users/profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/profile-picture', protect, uploadProfilePicture.single('profilePicture'), userController.uploadProfilePicture);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (public)
 * @access  Public
 */
router.get('/:id', idValidation, validate, userController.getUserById);

module.exports = router;