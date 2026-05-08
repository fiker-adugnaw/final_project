const mongoose = require('mongoose');

const masterProBonoSchema = new mongoose.Schema({
    barLicenseNumber: {
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
        enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'],
        default: 'ACTIVE'
    },
    specialization: [{
        type: String
    }],
    lawSchool: {
        type: String
    },
    yearsOfPractice: {
        type: Number
    },
    proBonoCommitment: {
        type: Number, // targeted cases per year
        default: 5
    },
    authorizationDate: {
        type: Date
    },
    authorizationExpiryDate: {
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
    lawFirm: {
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

masterProBonoSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const MasterProBono = mongoose.model('MasterProBono', masterProBonoSchema);

module.exports = MasterProBono;
