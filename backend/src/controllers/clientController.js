/**
 * Client Controller
 * Handles client-specific operations, case management, and legal aid eligibility
 */

const Client = require('../models/Client');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Document = require('../models/Document');
const SystemLog = require('../models/SystemLog');
const { HTTP_STATUS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get client dashboard data
 * @route GET /api/clients/dashboard
 * @access Private (Client only)
 */
exports.getDashboard = catchAsync(async (req, res, next) => {
    const client = await Client.findOne({ userId: req.user._id });

    if (!client) {
        return next(new AppError('Client profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Get upcoming appointments
    const upcomingAppointments = await Appointment.find({
        clientId: req.user._id,
        date: { $gte: new Date() },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    })
        .populate('lawyerId', 'fullName')
        .populate('volunteerId', 'fullName')
        .sort({ date: 1, startTime: 1 })
        .limit(5);

    // Get recent documents
    const recentDocuments = await Document.find({
        ownerId: req.user._id,
        status: 'ACTIVE'
    })
        .sort({ uploadedAt: -1 })
        .limit(5);

    // Get case history
    const caseHistory = await Appointment.find({
        clientId: req.user._id,
        status: { $in: ['COMPLETED', 'CANCELLED'] }
    })
        .populate('lawyerId', 'fullName')
        .sort({ date: -1 })
        .limit(5);

    // Get statistics
    const totalAppointments = await Appointment.countDocuments({ clientId: req.user._id });
    const activeCases = await Appointment.countDocuments({
        clientId: req.user._id,
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    });
    const totalDocuments = await Document.countDocuments({ ownerId: req.user._id });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            profile: client,
            stats: {
                totalAppointments,
                activeCases,
                totalDocuments,
                legalAidEligible: client.legalAidEligible
            },
            upcomingAppointments,
            recentDocuments,
            caseHistory
        }
    });
});

/**
 * Get client cases
 * @route GET /api/clients/cases
 * @access Private (Client only)
 */
exports.getClientCases = catchAsync(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { clientId: req.user._id };

    if (status) {
        query.status = status;
    }

    const cases = await Appointment.find(query)
        .populate('lawyerId', 'fullName')
        .populate('volunteerId', 'fullName')
        .sort({ date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            cases,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get client documents
 * @route GET /api/clients/documents
 * @access Private (Client only)
 */
exports.getClientDocuments = catchAsync(async (req, res, next) => {
    const { type, page = 1, limit = 20 } = req.query;

    const query = {
        ownerId: req.user._id,
        status: 'ACTIVE'
    };

    if (type) {
        query.documentType = type;
    }

    const documents = await Document.find(query)
        .sort({ uploadedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Document.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            documents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Check legal aid eligibility
 * @route POST /api/clients/eligibility-check
 * @access Private (Client only)
 */
exports.checkEligibility = catchAsync(async (req, res, next) => {
    const { monthlyIncome, dependents, caseType, region } = req.body;

    const client = await Client.findOne({ userId: req.user._id });

    if (!client) {
        return next(new AppError('Client profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Update client financial info
    client.monthlyIncome = monthlyIncome;
    client.dependents = dependents;

    // Simple eligibility logic (can be customized based on Ethiopian legal aid criteria)
    const povertyLine = 2000; // ETB per month (example threshold)
    const isLowIncome = monthlyIncome < povertyLine;
    const hasDependents = dependents > 0;

    // Check if eligible
    let isEligible = false;
    let reasons = [];

    if (isLowIncome) {
        isEligible = true;
        reasons.push('Low income');
    }

    if (hasDependents && monthlyIncome < povertyLine * 1.5) {
        isEligible = true;
        reasons.push('Has dependents and moderate income');
    }

    // Certain case types automatically qualify (e.g., human rights, domestic violence)
    const autoQualifyCases = ['HUMAN_RIGHTS', 'DOMESTIC_VIOLENCE', 'CHILD_CUSTODY'];
    if (autoQualifyCases.includes(caseType)) {
        isEligible = true;
        reasons.push('Case type automatically qualifies');
    }

    // Region-based considerations
    const underservedRegions = ['Afar', 'Somali', 'Gambela', 'Benishangul-Gumuz'];
    if (underservedRegions.includes(region)) {
        isEligible = true;
        reasons.push('Resides in underserved region');
    }

    client.legalAidEligible = isEligible;
    if (isEligible) {
        client.legalAidStatus = 'PENDING';
    }
    await client.save();

    // Log eligibility check
    await SystemLog.log({
        userId: req.user._id,
        action: 'LEGAL_AID_CHECK',
        module: 'CLIENT',
        severity: 'INFO',
        details: { isEligible, reasons }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            isEligible,
            reasons,
            message: isEligible
                ? 'You may be eligible for legal aid. Please submit an application.'
                : 'Based on the information provided, you may not be eligible for legal aid at this time.',
            nextSteps: isEligible
                ? 'Please complete the legal aid application form with supporting documents.'
                : 'Consider consulting with our volunteer advisors for low-cost alternatives.'
        }
    });
});

/**
 * Apply for legal aid
 * @route POST /api/clients/apply-legal-aid
 * @access Private (Client only)
 */
exports.applyForLegalAid = catchAsync(async (req, res, next) => {
    const { caseDescription, documents, reason } = req.body;

    const client = await Client.findOne({ userId: req.user._id });

    if (!client) {
        return next(new AppError('Client profile not found', HTTP_STATUS.NOT_FOUND));
    }

    if (!client.legalAidEligible) {
        return next(new AppError('You are not eligible for legal aid', HTTP_STATUS.BAD_REQUEST));
    }

    // Update client status
    client.legalAidStatus = 'PENDING';
    await client.save();

    // Create legal aid application (you might want a separate model for this)
    const application = {
        clientId: req.user._id,
        caseDescription,
        documents,
        reason,
        appliedAt: new Date(),
        status: 'PENDING'
    };

    // Log application
    await SystemLog.log({
        userId: req.user._id,
        action: 'LEGAL_AID_APPLICATION',
        module: 'CLIENT',
        severity: 'INFO',
        details: { caseDescription }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Legal aid application submitted successfully',
        data: { application }
    });
});

/**
 * Update client profile
 * @route PATCH /api/clients/profile
 * @access Private (Client only)
 */
exports.updateClientProfile = catchAsync(async (req, res, next) => {
    const allowedFields = [
        'occupation', 'dateOfBirth', 'gender', 'emergencyContact',
        'preferredCommunication'
    ];

    const updateData = {};

    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    const client = await Client.findOneAndUpdate(
        { userId: req.user._id },
        updateData,
        { new: true, runValidators: true }
    );

    if (!client) {
        return next(new AppError('Client profile not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { client }
    });
});

/**
 * Get client statistics
 * @route GET /api/clients/statistics
 * @access Private (Client only)
 */
exports.getClientStatistics = catchAsync(async (req, res, next) => {
    // Appointment statistics
    const totalAppointments = await Appointment.countDocuments({ clientId: req.user._id });
    const completedAppointments = await Appointment.countDocuments({
        clientId: req.user._id,
        status: 'COMPLETED'
    });
    const cancelledAppointments = await Appointment.countDocuments({
        clientId: req.user._id,
        status: 'CANCELLED'
    });

    // Document statistics
    const totalDocuments = await Document.countDocuments({ ownerId: req.user._id });
    const sharedDocuments = await Document.countDocuments({
        ownerId: req.user._id,
        'sharedWith.0': { $exists: true }
    });

    // Case type breakdown
    const caseTypes = await Appointment.aggregate([
        { $match: { clientId: req.user._id } },
        { $group: { _id: '$caseType', count: { $sum: 1 } } }
    ]);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            appointments: {
                total: totalAppointments,
                completed: completedAppointments,
                cancelled: cancelledAppointments,
                completionRate: totalAppointments > 0
                    ? Math.round((completedAppointments / totalAppointments) * 100)
                    : 0
            },
            documents: {
                total: totalDocuments,
                shared: sharedDocuments
            },
            caseTypes
        }
    });
});

module.exports = exports;