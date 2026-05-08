const mongoose = require('mongoose');

/**
 * Message Schema - For private messaging between users
 */
const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        unique: true,
        default: function () {
            return 'MSG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    },

    // Participants
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // For group conversations
    conversationId: {
        type: String,
        index: true
    },

    // Message content
    content: {
        type: String,
        required: [true, 'Message content is required'],
        maxlength: [5000, 'Message cannot exceed 5000 characters']
    },

    // Attachments
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: Date
    }],

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

    // Encryption
    isEncrypted: {
        type: Boolean,
        default: true
    },

    // For message threading
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    // Reactions
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: String,
        createdAt: Date
    }],

    // Metadata
    ipAddress: String,
    userAgent: String,

    isDeleted: {
        type: Boolean,
        default: false
    },

    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to generate conversation ID
messageSchema.pre('save', function (next) {
    if (!this.conversationId) {
        // Create a unique conversation ID based on participants
        const participants = [this.senderId.toString(), this.receiverId.toString()].sort();
        this.conversationId = participants.join('_');
    }
    this.updatedAt = Date.now();
    next();
});

// Instance method to mark as read
messageSchema.methods.markAsRead = function () {
    this.isRead = true;
    this.readAt = Date.now();
    return this.save();
};

// Instance method to mark as delivered
messageSchema.methods.markAsDelivered = function () {
    this.isDelivered = true;
    this.deliveredAt = Date.now();
    return this.save();
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function (userId1, userId2, limit = 50, before = null) {
    const participants = [userId1.toString(), userId2.toString()].sort();
    const conversationId = participants.join('_');

    const query = {
        conversationId,
        isDeleted: false,
        deletedFor: { $ne: userId1 }
    };

    if (before) {
        query.createdAt = { $lt: before };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', 'fullName email profilePicture')
        .populate('receiverId', 'fullName email profilePicture');
};

// Static method to get unread count for user
messageSchema.statics.getUnreadCount = function (userId) {
    return this.countDocuments({
        receiverId: userId,
        isRead: false,
        isDeleted: false,
        deletedFor: { $ne: userId }
    });
};

// Static method to mark all messages as read in conversation
messageSchema.statics.markConversationAsRead = function (userId, otherUserId) {
    const participants = [userId.toString(), otherUserId.toString()].sort();
    const conversationId = participants.join('_');

    return this.updateMany(
        {
            conversationId,
            receiverId: userId,
            isRead: false
        },
        {
            isRead: true,
            readAt: new Date()
        }
    );
};

// Indexes
messageSchema.index({ messageId: 1 }, { unique: true });
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });
messageSchema.index({ createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
