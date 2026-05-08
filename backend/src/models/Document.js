const mongoose = require('mongoose');

/**
 * Document Schema - For storing and sharing legal documents
 */
const documentSchema = new mongoose.Schema({
    documentId: {
        type: String,
        unique: true,
        default: function () {
            return 'DOC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    },

    // File information
    fileName: {
        type: String,
        required: [true, 'File name is required'],
        trim: true
    },

    originalName: {
        type: String,
        required: true
    },

    fileType: {
        type: String,
        enum: {
            values: ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG', 'TXT', 'OTHER'],
            message: '{VALUE} is not a valid file type'
        },
        required: true
    },

    fileSize: {
        type: Number,
        required: true,
        max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'] // 10MB limit
    },

    mimeType: String,

    // Storage
    fileUrl: {
        type: String,
        required: true
    },

    publicId: String, // For cloud storage reference

    // Document metadata
    documentType: {
        type: String,
        enum: {
            values: [
                'PETITION', 'EVIDENCE', 'CONTRACT', 'COURT_ORDER',
                'IDENTIFICATION', 'LEGAL_BRIEF', 'AFFIDAVIT', 'OTHER'
            ],
            message: '{VALUE} is not a valid document type'
        },
        required: true
    },

    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    caseType: String,

    // Ownership
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    ownerType: {
        type: String,
        enum: ['CLIENT', 'LAWYER', 'VOLUNTEER'],
        required: true
    },

    // Sharing permissions
    sharedWith: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        permissions: {
            view: { type: Boolean, default: true },
            download: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            share: { type: Boolean, default: false }
        },
        sharedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date
    }],

    // Verification status (for legal documents)
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING'
    },

    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    verifiedAt: Date,

    verificationNotes: String,

    // Security
    isEncrypted: {
        type: Boolean,
        default: true
    },

    encryptionKey: String, // Reference to encryption key (not stored in plain text)

    // Version control
    version: {
        type: Number,
        default: 1
    },

    versionHistory: [{
        version: Number,
        fileUrl: String,
        fileSize: Number,
        modifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        modifiedAt: {
            type: Date,
            default: Date.now
        },
        changeNotes: String
    }],

    // Tags for organization
    tags: [{
        type: String,
        trim: true
    }],

    // Template features
    isTemplate: {
        type: Boolean,
        default: false
    },

    templateCategory: String,

    templateFields: [{
        fieldName: String,
        fieldType: String,
        required: Boolean,
        defaultValue: String
    }],

    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'ARCHIVED', 'DELETED'],
        default: 'ACTIVE'
    },

    // Metadata
    uploadedAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    lastAccessedAt: Date,

    lastAccessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Pre-save middleware
documentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Instance method to check if user has access
documentSchema.methods.hasAccess = function (userId, permission = 'view') {
    if (this.ownerId.toString() === userId.toString()) return true;

    const share = this.sharedWith.find(s => s.userId.toString() === userId.toString());
    if (!share) return false;

    if (permission === 'view') return share.permissions.view;
    if (permission === 'download') return share.permissions.download;
    if (permission === 'edit') return share.permissions.edit;
    if (permission === 'share') return share.permissions.share;

    return false;
};

// Instance method to share document with another user
documentSchema.methods.shareWith = function (userId, permissions, sharedBy) {
    // Check if already shared
    const existingIndex = this.sharedWith.findIndex(
        s => s.userId.toString() === userId.toString()
    );

    const shareEntry = {
        userId,
        permissions,
        sharedBy,
        sharedAt: new Date()
    };

    if (existingIndex >= 0) {
        this.sharedWith[existingIndex] = shareEntry;
    } else {
        this.sharedWith.push(shareEntry);
    }

    return this.save();
};

// Instance method to create new version
documentSchema.methods.createVersion = function (newFileUrl, newFileSize, modifiedBy, notes) {
    // Save current version to history
    this.versionHistory.push({
        version: this.version,
        fileUrl: this.fileUrl,
        fileSize: this.fileSize,
        modifiedBy: this.modifiedBy || this.uploadedBy,
        modifiedAt: this.updatedAt,
        changeNotes: this.changeNotes
    });

    // Update current version
    this.version += 1;
    this.fileUrl = newFileUrl;
    this.fileSize = newFileSize;
    this.modifiedBy = modifiedBy;
    this.changeNotes = notes;
    this.updatedAt = Date.now();

    return this.save();
};

// Static method to find documents shared with a user
documentSchema.statics.findSharedWith = function (userId) {
    return this.find({
        'sharedWith.userId': userId,
        status: 'ACTIVE'
    }).populate('ownerId', 'fullName email');
};

// Static method to find documents by owner
documentSchema.statics.findByOwner = function (ownerId, documentType = null) {
    const query = { ownerId, status: 'ACTIVE' };
    if (documentType) query.documentType = documentType;

    return this.find(query).sort({ uploadedAt: -1 });
};

// Static method to get templates
documentSchema.statics.getTemplates = function (category = null) {
    const query = { isTemplate: true, status: 'ACTIVE' };
    if (category) query.templateCategory = category;

    return this.find(query).sort({ uploadedAt: -1 });
};

// Indexes for performance

documentSchema.index({ ownerId: 1, documentType: 1, uploadedAt: -1 });
documentSchema.index({ 'sharedWith.userId': 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ isTemplate: 1, templateCategory: 1 });
documentSchema.index({ verificationStatus: 1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
