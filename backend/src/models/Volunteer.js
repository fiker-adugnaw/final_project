const mongoose = require('mongoose');

/**
 * Volunteer Schema - For both advisors and representatives
 * References User model
 */
const volunteerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true
    },

    // Type of volunteer
    volunteerType: {
        type: String,
        enum: {
            values: ['ADVISOR', 'REPRESENTATIVE', 'PRO_BONO'],
            message: '{VALUE} is not a valid volunteer type'
        },
        required: [true, 'Volunteer type is required']
    },

    // Areas of expertise
    expertise: [{
        type: String,
        enum: {
            values: [
                'FAMILY_LAW',
                'CRIMINAL_LAW',
                'CIVIL_LAW',
                'LABOR_LAW',
                'PROPERTY_LAW',
                'HUMAN_RIGHTS',
                'CONTRACT_LAW',
                'ADMINISTRATIVE_LAW'
            ],
            message: '{VALUE} is not a valid expertise area'
        }
    }],

    // Qualifications
    qualifications: {
        education: {
            type: String,
            enum: ['LAW_STUDENT', 'LAW_GRADUATE', 'LEGAL_AID_WORKER', 'PRO_BONO_LAWYER', 'OTHER']
        },
        institution: String,
        yearOfStudy: {
            type: Number,
            min: 1,
            max: 5
        },
        graduationYear: Number,
        otherQualifications: String
    },

    // Supervisor information (for law students)
    supervisor: {
        name: String,
        contact: String,
        email: String,
        organization: String,
        relationship: String
    },

    // Availability
    availability: {
        weekdays: [{
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            },
            startTime: String,
            endTime: String
        }],
        weekends: { type: Boolean, default: false },
        maxCasesPerMonth: { type: Number, default: 5, min: 1 },
        maxHoursPerWeek: { type: Number, default: 10, min: 1 }
    },

    // Status in system
    status: {
        type: String,
        enum: {
            values: ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'],
            message: '{VALUE} is not a valid status'
        },
        default: 'PENDING'
    },

    // Authorization for representation (for REPRESENTATIVE type)
    authorizationStatus: {
        type: String,
        enum: {
            values: ['UNAUTHORIZED', 'PENDING', 'AUTHORIZED'],
            message: '{VALUE} is not a valid authorization status'
        },
        default: 'UNAUTHORIZED'
    },

    authorizationDocuments: [{
        documentType: {
            type: String,
            enum: ['BAR_CERTIFICATE', 'AUTHORIZATION_LETTER', 'ID', 'SUPERVISOR_APPROVAL']
        },
        documentUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    authorizationExpiry: Date,

    authorizationNumber: String,

    // Cases assigned
    casesAssigned: [{
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        },
        assignedAt: Date,
        status: {
            type: String,
            enum: ['ACTIVE', 'COMPLETED', 'TRANSFERRED']
        },
        notes: String
    }],

    // Statistics
    totalSessions: {
        type: Number,
        default: 0
    },

    totalHours: {
        type: Number,
        default: 0
    },

    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },

    // Approval metadata
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    approvedAt: Date,

    rejectionReason: String,

    notes: String,

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
volunteerSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save validation for representative type
volunteerSchema.pre('save', function (next) {
    if (this.volunteerType === 'REPRESENTATIVE' && this.authorizationStatus !== 'AUTHORIZED') {
        // Representatives must be authorized
        this.authorizationStatus = 'PENDING';
    }
    next();
});

// Instance method to check if volunteer is available
volunteerSchema.methods.isAvailable = function (date, time) {
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const schedule = this.availability.weekdays.find(s => s.day === day);

    if (!schedule) return false;

    // Check if within current caseload limit
    const activeCases = this.casesAssigned.filter(c => c.status === 'ACTIVE').length;
    if (activeCases >= this.availability.maxCasesPerMonth) return false;

    return true;
};

// Static method to find available volunteers
volunteerSchema.statics.findAvailable = function (type, date, time) {
    return this.find({
        volunteerType: type,
        status: 'APPROVED',
        ...(type === 'REPRESENTATIVE' && { authorizationStatus: 'AUTHORIZED' })
    }).populate('userId', 'fullName email phone');
};

// Static method to get pending approvals for admin
volunteerSchema.statics.getPendingApprovals = function () {
    return this.find({
        $or: [
            { status: 'PENDING' },
            { authorizationStatus: 'PENDING' }
        ]
    }).populate('userId', 'fullName email phone createdAt');
};

// Indexes

volunteerSchema.index({ volunteerType: 1 });
volunteerSchema.index({ status: 1 });
volunteerSchema.index({ authorizationStatus: 1 });
volunteerSchema.index({ expertise: 1 });

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

module.exports = Volunteer;
