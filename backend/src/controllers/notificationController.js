/**
 * Notification Controller
 * Handles user notifications, preferences, and real-time updates
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const { HTTP_STATUS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get user notifications
 * @route GET /api/notifications
 * @access Private
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { userId: req.user._id };

    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        isRead: false
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            notifications,
            unreadCount,
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
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            userId: req.user._id
        },
        {
            isRead: true,
            readAt: Date.now()
        },
        { new: true }
    );

    if (!notification) {
        return next(new AppError('Notification not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { notification }
    });
});

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
    await Notification.updateMany(
        {
            userId: req.user._id,
            isRead: false
        },
        {
            isRead: true,
            readAt: Date.now()
        }
    );

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'All notifications marked as read'
    });
});

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
    const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id
    });

    if (!notification) {
        return next(new AppError('Notification not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Notification deleted'
    });
});

/**
 * Get unread count
 * @route GET /api/notifications/unread-count
 * @access Private
 */
exports.getUnreadCount = catchAsync(async (req, res, next) => {
    const count = await Notification.countDocuments({
        userId: req.user._id,
        isRead: false
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { unreadCount: count }
    });
});

/**
 * Update notification preferences
 * @route PUT /api/notifications/preferences
 * @access Private
 */
exports.updatePreferences = catchAsync(async (req, res, next) => {
    const { email, sms, push } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            notificationPreferences: {
                email: email ?? true,
                sms: sms ?? true,
                push: push ?? false
            }
        },
        { new: true }
    );

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { preferences: user.notificationPreferences }
    });
});

/**
 * Get notification settings
 * @route GET /api/notifications/settings
 * @access Private
 */
exports.getSettings = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id).select('notificationPreferences');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { settings: user.notificationPreferences }
    });
});

/**
 * Create notification (internal use)
 * This would typically be called by other services
 */
exports.createNotification = async (data) => {
    try {
        const notification = await Notification.create(data);
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Send bulk notifications
 */
exports.sendBulkNotifications = async (userIds, notificationData) => {
    try {
        const notifications = userIds.map(userId => ({
            ...notificationData,
            userId
        }));

        const result = await Notification.insertMany(notifications);
        return result;
    } catch (error) {
        console.error('Error sending bulk notifications:', error);
        return [];
    }
};

module.exports = exports;