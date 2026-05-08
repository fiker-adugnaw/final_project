const mongoose = require('mongoose');

/**
 * VerificationAppeal Schema
 * Tracks lawyer appeals against suspension decisions
 */
const verificationAppealSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lawyer',
        required: [true, 'Lawyer ID is required'],
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    // The status being appealed against
    appealingAgainst: {
        type: String,
        enum: ['SUSPENDED', 'REJECTED'],
        required: true
    },

    // Appeal form fields
    appealReason: {
        type: String,
        required: [true, 'Appeal reason is required'],
        maxlength: [1000, 'Appeal reason cannot exceed 1000 characters'],
        trim: true
    },

    additionalNotes: {
        type: String,
        maxlength: 500,
        trim: true
    },

    // Supporting documents uploaded with appeal
    supportingDocuments: [{
        documentType: {
            type: String,
            enum: ['LICENSE_DOCUMENT', 'BAR_ASSOCIATION_ID', 'ADDITIONAL_CERTIFICATE', 'OTHER']
        },
        documentUrl: {
            type: String,
            required: true
        },
        originalName: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Appeal status lifecycle
    status: {
        type: String,
        enum: {
            values: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
            message: '{VALUE} is not a valid appeal status'
        },
        default: 'PENDING',
        index: true
    },

    // Admin response
    adminResponse: {
        type: String,
        maxlength: 1000
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    reviewedAt: Date,

    // Appeal window enforcement (30 days from suspension)
    suspendedAt: {
        type: Date,
        required: true
    },

    appealDeadline: {
        type: Date,
        required: true
    },

    submittedAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to update timestamp
verificationAppealSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static: get all pending appeals
verificationAppealSchema.statics.getPendingAppeals = function() {
    return this.find({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } })
        .populate('userId', 'fullName email phone')
        .populate('lawyerId', 'licenseNumber specialization')
        .sort({ submittedAt: 1 });
};

verificationAppealSchema.index({ status: 1, submittedAt: 1 });

const VerificationAppeal = mongoose.model('VerificationAppeal', verificationAppealSchema);

module.exports = VerificationAppeal;
