const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { validate, idValidation, paginationValidation } = require('../middleware/validation');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', protect, paginationValidation, validate, notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', protect, notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/settings', protect, notificationController.getSettings);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', protect, idValidation, validate, notificationController.markAsRead);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', protect, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', protect, idValidation, validate, notificationController.deleteNotification);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', protect, notificationController.updatePreferences);

module.exports = router;