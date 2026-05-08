const mongoose = require('mongoose');

/**
 * Notification Schema - For system notifications
 */
const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        unique: true,
        default: function () {
            return 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    },

    // Recipient
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Notification content
    type: {
        type: String,
        enum: {
            values: [
                'APPOINTMENT_REMINDER',
                'APPOINTMENT_CONFIRMATION',
                'APPOINTMENT_CANCELLATION',
                'APPOINTMENT_RESCHEDULED',
                'DOCUMENT_SHARED',
                'DOCUMENT_VERIFIED',
                'LAWYER_VERIFIED',
                'VOLUNTEER_APPROVED',
                'VOLUNTEER_AUTHORIZED',
                'FORUM_POST_APPROVED',
                'FORUM_POST_REJECTED',
                'FORUM_COMMENT_REPLY',
                'FORUM_POST_FLAGGED',
                'MESSAGE_RECEIVED',
                'CASE_UPDATE',
                'SYSTEM_ALERT',
                'WELCOME'
            ],
            message: '{VALUE} is not a valid notification type'
        },
        required: true
    },

    title: {
        type: String,
        required: true,
        maxlength: 200
    },

    message: {
        type: String,
        required: true,
        maxlength: 1000
    },

    messageAmharic: {
        type: String,
        maxlength: 1000
    },

    // Data payload (for deep linking)
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Links
    actionUrl: String,
    imageUrl: String,

    // Priority
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default: 'MEDIUM'
    },

    // Status
    isRead: {
        type: Boolean,
        default: false
    },

    readAt: Date,

    isDelivered: {
        type: Boolean,
        default: false
    },

    deliveredAt: Date,

    // Scheduling
    scheduledFor: Date,

    expiresAt: Date,

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Enable virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function () {
    const diff = Date.now() - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
});

// Pre-save middleware
notificationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
    this.isRead = true;
    this.readAt = Date.now();
    return this.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function (userId) {
    return this.countDocuments({
        userId,
        isRead: false,
        $or: [
            { expiresAt: { $gt: new Date() } },
            { expiresAt: { $exists: false } }
        ]
    });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function (userId) {
    return this.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
    );
};

// Static method to get pending notifications for delivery
notificationSchema.statics.getPendingNotifications = function () {
    const now = new Date();
    return this.find({
        $or: [
            { scheduledFor: { $lte: now } },
            { scheduledFor: { $exists: false } }
        ],
        isDelivered: false,
        $or: [
            { expiresAt: { $gt: now } },
            { expiresAt: { $exists: false } }
        ]
    }).populate('userId', 'email phone notificationPreferences');
};

// Indexes for performance

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ scheduledFor: 1, isDelivered: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
