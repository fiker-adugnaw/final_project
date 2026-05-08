/**
 * User Controller
 * Handles user profile management, notifications, and general user operations
 */

const User = require('../models/User');
const Notification = require('../models/Notification');
const SystemLog = require('../models/SystemLog');
const { sanitizeUser } = require('../config/auth');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getProfile = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id)
        .populate('profile');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            user: sanitizeUser(user)
        }
    });
});

/**
 * Update user profile
 * @route PATCH /api/users/profile
 * @access Private
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
    const allowedFields = ['fullName', 'region', 'city', 'subCity', 'woreda', 'kebele', 'languagePreference', 'notificationPreferences'];
    const updateData = {};

    // Filter allowed fields
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
    ).populate('profile');

    // Log profile update
    await SystemLog.log({
        userId: user._id,
        action: 'PROFILE_UPDATED',
        module: 'USER',
        severity: 'INFO',
        details: { updatedFields: Object.keys(updateData) }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.PROFILE_UPDATED,
        data: {
            user: sanitizeUser(user)
        }
    });
});

/**
 * Delete user account
 * @route DELETE /api/users/account
 * @access Private
 */
exports.deleteAccount = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    // Log account deletion
    await SystemLog.log({
        userId: user._id,
        action: 'ACCOUNT_DELETED',
        module: 'USER',
        severity: 'WARNING',
        details: { email: user.email }
    });

    // Soft delete - set inactive
    user.isActive = false;
    await user.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Account deleted successfully'
    });
});

/**
 * Get user notifications
 * @route GET /api/users/notifications
 * @access Private
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;

    const notifications = await Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Notification.countDocuments({ userId: req.user._id });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            notifications,
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
 * @route PATCH /api/users/notifications/:id/read
 * @access Private
 */
exports.markNotificationRead = catchAsync(async (req, res, next) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isRead: true, readAt: Date.now() },
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
 * @route PATCH /api/users/notifications/read-all
 * @access Private
 */
exports.markAllNotificationsRead = catchAsync(async (req, res, next) => {
    await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { isRead: true, readAt: Date.now() }
    );

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'All notifications marked as read'
    });
});

/**
 * Update notification preferences
 * @route PUT /api/users/notification-preferences
 * @access Private
 */
exports.updateNotificationPreferences = catchAsync(async (req, res, next) => {
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
        data: {
            preferences: user.notificationPreferences
        }
    });
});

/**
 * Get user by ID (public)
 * @route GET /api/users/:id
 * @access Public
 */
exports.getUserById = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .select('fullName userType region city profilePicture');

    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { user }
    });
});

/**
 * Upload profile picture
 * @route POST /api/users/profile-picture
 * @access Private
 */
exports.uploadProfilePicture = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('Please upload an image', HTTP_STATUS.BAD_REQUEST));
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { profilePicture: req.file.path },
        { new: true }
    );

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            profilePicture: user.profilePicture
        }
    });
});

/**
 * Get user activity log
 * @route GET /api/users/activity
 * @access Private
 */
exports.getUserActivity = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;

    const logs = await SystemLog.find({ userId: req.user._id })
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await SystemLog.countDocuments({ userId: req.user._id });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

module.exports = exports;