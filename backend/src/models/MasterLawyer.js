const mongoose = require('mongoose');

const masterLawyerSchema = new mongoose.Schema({
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        uppercase: true
    },
    lawyerName: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED'],
        default: 'ACTIVE'
    },
    specialization: [{
        type: String
    }],
    lawSchool: {
        type: String
    },
    graduationYear: {
        type: Number
    },
    licenseIssueDate: {
        type: Date
    },
    licenseExpiryDate: {
        type: Date
    },
    officialEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    officialPhone: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

masterLawyerSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const MasterLawyer = mongoose.model('MasterLawyer', masterLawyerSchema);

module.exports = MasterLawyer;
