const mongoose = require('mongoose');

const masterVolunteerSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        uppercase: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    universityName: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        enum: ['LLB', 'LAW', 'OTHER'],
        default: 'LLB'
    },
    yearOfStudy: {
        type: Number,
        min: 1,
        max: 5
    },
    expectedGraduationYear: {
        type: Number
    },
    studentIdExpiryDate: {
        type: Date
    },
    supervisorName: {
        type: String,
        trim: true
    },
    supervisorEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    supervisorPhone: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'GRADUATED', 'SUSPENDED'],
        default: 'ACTIVE'
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

masterVolunteerSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const MasterVolunteer = mongoose.model('MasterVolunteer', masterVolunteerSchema);

module.exports = MasterVolunteer;
