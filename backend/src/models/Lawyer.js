const mongoose = require('mongoose');

/**
 * Lawyer Schema - Extended profile for lawyers
 * References User model
 */
const lawyerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true
    },

    // Professional credentials
    licenseNumber: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true,
        match: [
            /^[A-Z]{2}-\d{5,}$/,
            'License number must follow format: ET-12345 (two letters, hyphen, 5+ digits)'
        ]
    },

    licenseExpiryDate: {
        type: Date,
        default: null
    },

    // Areas of specialization
    specialization: [{
        type: String,
        enum: {
            values: [
                'FAMILY_LAW',
                'CRIMINAL_LAW',
                'CIVIL_LAW',
                'COMMERCIAL_LAW',
                'LABOR_LAW',
                'PROPERTY_LAW',
                'CONTRACT_LAW',
                'HUMAN_RIGHTS',
                'ADMINISTRATIVE_LAW',
                'TAX_LAW',
                'IMMIGRATION_LAW',
                'INTELLECTUAL_PROPERTY'
            ],
            message: '{VALUE} is not a valid specialization'
        }
    }],

    // Experience
    experience: {
        type: Number,
        min: [0, 'Experience cannot be negative'],
        max: [70, 'Experience cannot exceed 70 years']
    },

    // Languages spoken
    languages: [{
        type: String,
        enum: {
            values: ['Amharic', 'English', 'Afan Oromo', 'Tigrigna', 'Somali', 'Arabic', 'Other'],
            message: '{VALUE} is not a valid language'
        }
    }],

    // Education history
    education: [{
        degree: {
            type: String,
            required: true
        },
        institution: {
            type: String,
            required: true
        },
        year: {
            type: Number,
            required: true,
            min: 1950,
            max: new Date().getFullYear()
        },
        country: {
            type: String,
            default: 'Ethiopia'
        }
    }],

    // Certifications
    certifications: [{
        name: String,
        issuingAuthority: String,
        year: Number,
        certificateUrl: String,
        expiryDate: Date
    }],

    // Bar association membership
    barAssociation: {
        member: { type: Boolean, default: false },
        membershipNumber: String,
        joinedDate: Date
    },

    // Professional bio
    bio: {
        type: String,
        maxlength: 2000
    },

    // Office/contact information
    officeAddress: {
        region: String,
        city: String,
        subCity: String,
        woreda: String,
        building: String,
        officeNumber: String,
        landmark: String
    },

    officePhone: String,
    website: String,

    // Availability for consultations
    availability: {
        type: Boolean,
        default: true
    },

    // Consultation fee
    consultationFee: {
        amount: {
            type: Number,
            min: [0, 'Fee cannot be negative']
        },
        currency: {
            type: String,
            default: 'ETB',
            enum: ['ETB', 'USD']
        },
        isNegotiable: {
            type: Boolean,
            default: false
        }
    },

    // Pro bono services
    proBono: {
        available: { type: Boolean, default: false },
        casesPerYear: { type: Number, default: 0, min: 0 },
        description: String,
        eligibilityCriteria: String
    },

    // Rating and reviews
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },

    totalRatings: {
        type: Number,
        default: 0
    },

    reviews: [{
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: 500
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        },
        isVerifiedPurchase: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Cases handled statistics
    casesHandled: {
        type: Number,
        default: 0
    },

    successRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // ─────────────────────────────────────────────────
    // VERIFICATION STATE MACHINE
    // States: PENDING_VERIFICATION → UNDER_REVIEW → VERIFIED
    //          ↘ REJECTED (can resubmit) ↗
    //          ↘ SUSPENDED (can appeal) ↗
    //          → EXPIRED (license renewal required)
    // ─────────────────────────────────────────────────
    verificationStatus: {
        type: String,
        enum: {
            values: [
                'PENDING_VERIFICATION',
                'UNDER_REVIEW',
                'VERIFIED',
                'REJECTED',
                'SUSPENDED',
                'EXPIRED'
            ],
            message: '{VALUE} is not a valid verification status'
        },
        default: 'PENDING_VERIFICATION',
        index: true
    },

    // Verification documents
    verificationDocuments: [{
        documentType: {
            type: String,
            enum: ['LICENSE_DOCUMENT', 'BAR_ASSOCIATION_ID', 'ADDITIONAL_CERTIFICATE', 'PROFILE_PHOTO', 'OTHER'],
            required: true
        },
        documentUrl: {
            type: String,
            required: true
        },
        originalName: String,
        mimeType: String,
        fileSize: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String,
        isSuspicious: { type: Boolean, default: false }
    }],

    // Verification metadata
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    verifiedAt: Date,

    rejectionReason: String,

    // Suspension fields
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Resubmission tracking
    resubmissionCount: {
        type: Number,
        default: 0,
        max: [3, 'Maximum 3 resubmission attempts allowed']
    },
    lastResubmittedAt: Date,

    // Full audit trail of all status changes
    verificationHistory: [{
        status: {
            type: String,
            enum: ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED']
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        notes: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Work schedule
    workSchedule: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        startTime: String,
        endTime: String,
        isAvailable: { type: Boolean, default: true }
    }],

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

// Pre-save middleware to update timestamp
lawyerSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save middleware to calculate rating from reviews
lawyerSchema.pre('save', function (next) {
    if (this.reviews && this.reviews.length > 0) {
        const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        this.rating = total / this.reviews.length;
        this.totalRatings = this.reviews.length;
    }
    next();
});

// Instance method to add a review
lawyerSchema.methods.addReview = function (clientId, rating, comment, appointmentId) {
    this.reviews.push({
        clientId,
        rating,
        comment,
        appointmentId,
        isVerifiedPurchase: !!appointmentId,
        createdAt: new Date()
    });

    // Recalculate rating
    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = total / this.reviews.length;
    this.totalRatings = this.reviews.length;

    return this.save();
};

// Instance method to check if lawyer is available on a specific date/time
lawyerSchema.methods.isAvailable = function (date, time) {
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const schedule = this.workSchedule.find(s => s.day === day);

    if (!schedule || !schedule.isAvailable) return false;

    // Time comparison logic would go here
    return true;
};

// Static method to find verified lawyers
lawyerSchema.statics.findVerified = function (limit = 50, skip = 0) {
    return this.find({ verificationStatus: 'VERIFIED' })
        .populate('userId', 'fullName email phone region city profilePicture')
        .sort({ rating: -1, experience: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to search lawyers by specialization
lawyerSchema.statics.findBySpecialization = function (specialization, limit = 50) {
    return this.find({
        verificationStatus: 'VERIFIED',
        specialization: { $in: [specialization] }
    })
        .populate('userId', 'fullName email phone region city')
        .sort({ rating: -1 })
        .limit(limit);
};

// Static method to get pending verifications for admin
lawyerSchema.statics.getPendingVerifications = function (filters = {}) {
    const query = { ...filters };
    if (!query.verificationStatus) {
        query.verificationStatus = { $in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] };
    }
    return this.find(query)
        .populate('userId', 'fullName email phone createdAt profilePicture')
        .sort({ createdAt: 1 });
};

// Instance method to record status change in history
lawyerSchema.methods.recordStatusChange = function(newStatus, changedBy, reason, notes) {
    this.verificationHistory.push({
        status: newStatus,
        changedBy,
        reason,
        notes,
        changedAt: new Date()
    });
    this.verificationStatus = newStatus;
};

// Indexes for performance


lawyerSchema.index({ specialization: 1 });
lawyerSchema.index({ rating: -1 });
lawyerSchema.index({ verificationStatus: 1 });
lawyerSchema.index({ 'location.city': 1 });
lawyerSchema.index({ 'proBono.available': 1 }); // Fixed syntax error from dump

const Lawyer = mongoose.model('Lawyer', lawyerSchema);

module.exports = Lawyer;
