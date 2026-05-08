const mongoose = require('mongoose');

/**
 * Forum Post Schema - With strict moderation for legal discussions
 */
const forumPostSchema = new mongoose.Schema({
    postId: {
        type: String,
        unique: true,
        default: function () {
            return 'POST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    },

    // Author information
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author ID is required']
    },

    authorName: {
        type: String,
        required: true
    },

    authorType: {
        type: String,
        enum: ['CLIENT', 'LAWYER', 'VOLUNTEER_ADVISOR', 'VOLUNTEER_REPRESENTATIVE', 'PRO_BONO', 'ADMIN'],
        required: true
    },

    // Post content
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [5, 'Title must be at least 5 characters'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },

    content: {
        type: String,
        required: [true, 'Content is required'],
        minlength: [10, 'Content must be at least 10 characters'],
        maxlength: [10000, 'Content cannot exceed 10000 characters']
    },

    // Categorization
    category: {
        type: String,
        enum: {
            values: [
                'GENERAL',
                'LEGAL_ADVICE',
                'FAMILY_LAW',
                'CRIMINAL_LAW',
                'CIVIL_LAW',
                'LABOR_LAW',
                'PROPERTY_LAW',
                'COMMERCIAL_LAW',
                'HUMAN_RIGHTS',
                'SUCCESS_STORIES',
                'EMPLOYMENT_LAW',
                'CONTRACT_LAW',
                'IMMIGRATION',
                'BUSINESS_LAW'
            ],
            message: '{VALUE} is not a valid category'
        },
        required: true
    },

    tags: [{
        type: String,
        trim: true,
        maxlength: 30
    }],

    // CRITICAL: Moderation fields
    moderationStatus: {
        type: String,
        enum: {
            values: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'],
            message: '{VALUE} is not a valid moderation status'
        },
        default: 'PENDING',
        required: true
    },

    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    moderatedAt: Date,

    moderationNotes: String,

    rejectionReason: String,

    // Flag system (for user reports)
    flags: [{
        flaggedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        reason: {
            type: String,
            enum: ['INAPPROPRIATE', 'IRRELEVANT', 'MISINFORMATION', 'HARASSMENT', 'OTHER'],
            required: true
        },
        comment: String,
        flaggedAt: {
            type: Date,
            default: Date.now
        },
        reviewedAt: Date,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String,
            enum: ['DISMISSED', 'WARNING', 'REMOVED', 'BANNED']
        }
    }],

    flagCount: {
        type: Number,
        default: 0
    },

    // Auto-moderation fields
    containsRestrictedContent: {
        type: Boolean,
        default: false
    },

    restrictedWordsDetected: [String],

    // Engagement metrics
    views: {
        type: Number,
        default: 0
    },

    likes: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        likedAt: {
            type: Date,
            default: Date.now
        }
    }],

    likeCount: {
        type: Number,
        default: 0
    },

    // Comments (also moderated)
    comments: [{
        commentId: {
            type: String,
            default: function () {
                return 'COMM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            }
        },

        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        authorName: String,

        authorType: String,

        content: {
            type: String,
            required: true,
            maxlength: 2000
        },

        // Comment moderation
        moderationStatus: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },

        moderatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        moderatedAt: Date,

        rejectionReason: String,

        // Comment flags
        flags: [{
            flaggedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reason: String,
            flaggedAt: Date
        }],

        flagCount: {
            type: Number,
            default: 0
        },

        // Engagement
        likes: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }],

        likeCount: {
            type: Number,
            default: 0
        },

        isEdited: {
            type: Boolean,
            default: false
        },

        editHistory: [{
            content: String,
            editedAt: Date
        }],

        createdAt: {
            type: Date,
            default: Date.now
        },

        updatedAt: Date
    }],

    commentCount: {
        type: Number,
        default: 0
    },

    // Legal reference tracking
    isReferencedInCase: {
        type: Boolean,
        default: false
    },

    referencedInCases: [{
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        },
        referencedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        referencedAt: Date,
        notes: String
    }],

    // Post status
    isPinned: {
        type: Boolean,
        default: false
    },

    isLocked: {
        type: Boolean,
        default: false
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    // Metadata
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

// Pre-save middleware
forumPostSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Auto-update flag count
    if (this.isModified('flags')) {
        this.flagCount = this.flags.length;
    }

    // Auto-update comment count
    if (this.isModified('comments')) {
        this.commentCount = this.comments.filter(c => c.moderationStatus === 'APPROVED').length;
    }

    // Auto-update like count
    if (this.isModified('likes')) {
        this.likeCount = this.likes.length;
    }

    next();
});

// Instance method to add a comment
forumPostSchema.methods.addComment = function (commentData) {
    const newComment = {
        commentId: 'COMM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        ...commentData,
        createdAt: new Date(),
        moderationStatus: 'PENDING' // All comments need moderation
    };

    this.comments.push(newComment);
    this.commentCount = this.comments.filter(c => c.moderationStatus === 'APPROVED').length;

    return this.save();
};

// Instance method to like a post
forumPostSchema.methods.like = function (userId) {
    const existingLike = this.likes.find(l => l.userId.toString() === userId.toString());

    if (existingLike) {
        // Unlike
        this.likes = this.likes.filter(l => l.userId.toString() !== userId.toString());
    } else {
        // Like
        this.likes.push({ userId, likedAt: new Date() });
    }

    return this.save();
};

// Instance method to flag a post
forumPostSchema.methods.flag = function (userId, reason, comment = '') {
    // Check if already flagged by this user
    const existingFlag = this.flags.find(f => f.flaggedBy.toString() === userId.toString());

    if (existingFlag) {
        throw new Error('You have already flagged this post');
    }

    this.flags.push({
        flaggedBy: userId,
        reason,
        comment,
        flaggedAt: new Date()
    });

    this.flagCount = this.flags.length;

    // Auto-flag for moderation after 3 flags
    if (this.flagCount >= 3) {
        this.moderationStatus = 'FLAGGED';
    }

    return this.save();
};

// Static method to find posts pending moderation
forumPostSchema.statics.findPendingModeration = function () {
    return this.find({
        moderationStatus: { $in: ['PENDING', 'FLAGGED'] },
        isDeleted: false
    })
        .populate('authorId', 'fullName email userType')
        .sort({ flagCount: -1, createdAt: 1 });
};

// Static method to find approved posts (for public view)
forumPostSchema.statics.findApproved = function (category = null, limit = 20, skip = 0) {
    const query = {
        moderationStatus: 'APPROVED',
        isDeleted: false
    };

    if (category) query.category = category;

    return this.find(query)
        .populate('authorId', 'fullName userType profilePicture')
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Indexes for performance

forumPostSchema.index({ authorId: 1, createdAt: -1 });
forumPostSchema.index({ category: 1, createdAt: -1 });
forumPostSchema.index({ moderationStatus: 1 });
forumPostSchema.index({ flagCount: -1 });
forumPostSchema.index({ createdAt: -1 });
forumPostSchema.index({ tags: 1 });

const ForumPost = mongoose.model('ForumPost', forumPostSchema);

module.exports = ForumPost;
