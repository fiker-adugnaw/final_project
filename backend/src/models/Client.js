const mongoose = require('mongoose');

/**
 * Client Schema - Extended profile for clients/citizens
 * References User model
 */
const clientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true
    },

    // Personal information
    dateOfBirth: {
        type: Date,
        validate: {
            validator: function (v) {
                return v < new Date();
            },
            message: 'Date of birth must be in the past'
        }
    },

    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },

    occupation: {
        type: String,
        trim: true
    },

    // Financial status for legal aid eligibility
    incomeLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'MEDIUM'
    },

    monthlyIncome: {
        type: Number,
        min: 0
    },

    dependents: {
        type: Number,
        min: 0,
        default: 0
    },

    // Legal aid eligibility
    legalAidEligible: {
        type: Boolean,
        default: false
    },

    legalAidStatus: {
        type: String,
        enum: ['NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NOT_APPLIED'
    },

    legalAidApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    legalAidApprovedAt: Date,

    // Emergency contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },

    // Preferred communication method
    preferredCommunication: {
        type: String,
        enum: ['PHONE', 'EMAIL', 'SMS', 'IN_PERSON'],
        default: 'PHONE'
    },

    // Case history references
    caseHistory: [{
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        },
        title: String,
        type: String,
        status: String,
        lawyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        startedAt: Date,
        completedAt: Date
    }],

    // Document references
    documents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
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
clientSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save middleware to determine legal aid eligibility
clientSchema.pre('save', function (next) {
    if (this.incomeLevel === 'LOW' || (this.monthlyIncome && this.monthlyIncome < 2000)) {
        this.legalAidEligible = true;
    }
    next();
});

// Instance method to add case to history
clientSchema.methods.addCaseToHistory = function (caseData) {
    this.caseHistory.push({
        ...caseData,
        startedAt: new Date()
    });
    return this.save();
};

// Static method to find clients eligible for legal aid
clientSchema.statics.findEligibleForLegalAid = function () {
    return this.find({
        legalAidEligible: true,
        legalAidStatus: { $ne: 'APPROVED' }
    }).populate('userId', 'fullName email phone region city');
};

// Indexes

clientSchema.index({ legalAidEligible: 1 });
clientSchema.index({ incomeLevel: 1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
