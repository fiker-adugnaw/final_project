/**
 * Volunteer Controller
 * Handles volunteer registration, approval, session management, and supervision
 */

const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const SystemLog = require('../models/SystemLog');
const { VOLUNTEER_TYPES, HTTP_STATUS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get available volunteers
 * @route GET /api/volunteers/available
 * @access Public
 */
exports.getAvailableVolunteers = catchAsync(async (req, res, next) => {
    const { type, expertise, date, page = 1, limit = 20 } = req.query;

    const query = {
        status: 'APPROVED'
    };

    if (type) {
        query.volunteerType = type;
    }

    if (type === 'REPRESENTATIVE') {
        query.authorizationStatus = 'AUTHORIZED';
    }

    if (expertise) {
        query.expertise = { $in: [expertise] };
    }

    const volunteers = await Volunteer.find(query)
        .populate('userId', 'fullName email phone profilePicture region city')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Volunteer.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            volunteers,
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
 * Apply as volunteer
 * @route POST /api/volunteers/apply
 * @access Private
 */
exports.applyAsVolunteer = catchAsync(async (req, res, next) => {
    const { volunteerType, expertise, qualifications, supervisor, availability } = req.body;

    // Check if already applied
    const existing = await Volunteer.findOne({ userId: req.user._id });
    if (existing) {
        return next(new AppError('You have already applied as a volunteer', HTTP_STATUS.CONFLICT));
    }

    // Create volunteer application
    const volunteer = await Volunteer.create({
        userId: req.user._id,
        volunteerType,
        expertise,
        qualifications,
        supervisor,
        availability,
        status: 'PENDING',
        authorizationStatus: volunteerType === 'REPRESENTATIVE' ? 'PENDING' : 'UNAUTHORIZED'
    });

    // Log application
    await SystemLog.log({
        userId: req.user._id,
        action: 'VOLUNTEER_APPLICATION',
        module: 'VOLUNTEER',
        severity: 'INFO',
        details: { volunteerType }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Volunteer application submitted successfully',
        data: { volunteer }
    });
});

/**
 * Get my volunteer sessions
 * @route GET /api/volunteers/my-sessions
 * @access Private (Volunteer only)
 */
exports.getMySessions = catchAsync(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { volunteerId: req.user._id };

    if (status) {
        query.status = status;
    }

    const sessions = await Appointment.find(query)
        .populate('clientId', 'fullName email phone')
        .sort({ date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            sessions,
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
 * Update volunteer availability
 * @route PATCH /api/volunteers/availability
 * @access Private (Volunteer only)
 */
exports.updateAvailability = catchAsync(async (req, res, next) => {
    const { availability } = req.body;

    const volunteer = await Volunteer.findOneAndUpdate(
        { userId: req.user._id },
        { availability },
        { new: true }
    );

    if (!volunteer) {
        return next(new AppError('Volunteer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Availability updated successfully',
        data: { availability: volunteer.availability }
    });
});

/**
 * Get volunteer profile
 * @route GET /api/volunteers/profile
 * @access Private (Volunteer only)
 */
exports.getVolunteerProfile = catchAsync(async (req, res, next) => {
    const volunteer = await Volunteer.findOne({ userId: req.user._id })
        .populate('userId', 'fullName email phone profilePicture region city');

    if (!volunteer) {
        return next(new AppError('Volunteer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Get session statistics
    const totalSessions = await Appointment.countDocuments({ volunteerId: req.user._id });
    const completedSessions = await Appointment.countDocuments({
        volunteerId: req.user._id,
        status: 'COMPLETED'
    });
    const upcomingSessions = await Appointment.countDocuments({
        volunteerId: req.user._id,
        date: { $gte: new Date() },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            profile: volunteer,
            stats: {
                totalSessions,
                completedSessions,
                upcomingSessions,
                completionRate: totalSessions > 0
                    ? Math.round((completedSessions / totalSessions) * 100)
                    : 0
            }
        }
    });
});

/**
 * Update volunteer profile
 * @route PATCH /api/volunteers/profile
 * @access Private (Volunteer only)
 */
exports.updateVolunteerProfile = catchAsync(async (req, res, next) => {
    const allowedFields = ['expertise', 'qualifications', 'availability'];
    const updateData = {};

    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    const volunteer = await Volunteer.findOneAndUpdate(
        { userId: req.user._id },
        updateData,
        { new: true, runValidators: true }
    );

    if (!volunteer) {
        return next(new AppError('Volunteer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { volunteer }
    });
});

/**
 * Submit supervision request (for advisors)
 * @route POST /api/volunteers/supervision-request
 * @access Private (Volunteer Advisor only)
 */
exports.submitSupervisionRequest = catchAsync(async (req, res, next) => {
    const { sessionId, notes } = req.body;

    const volunteer = await Volunteer.findOne({ userId: req.user._id });

    if (!volunteer || volunteer.volunteerType !== 'ADVISOR') {
        return next(new AppError('Only advisors can submit supervision requests', HTTP_STATUS.FORBIDDEN));
    }

    const session = await Appointment.findById(sessionId);

    if (!session || session.volunteerId.toString() !== req.user._id.toString()) {
        return next(new AppError('Session not found', HTTP_STATUS.NOT_FOUND));
    }

    // Add supervision request (you might want a separate model for this)
    const supervisionRequest = {
        sessionId,
        notes,
        submittedAt: new Date(),
        status: 'PENDING'
    };

    // Log request
    await SystemLog.log({
        userId: req.user._id,
        action: 'SUPERVISION_REQUEST',
        module: 'VOLUNTEER',
        severity: 'INFO',
        details: { sessionId }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Supervision request submitted',
        data: { supervisionRequest }
    });
});

/**
 * Get volunteer statistics
 * @route GET /api/volunteers/statistics
 * @access Private (Volunteer only)
 */
exports.getVolunteerStatistics = catchAsync(async (req, res, next) => {
    const volunteer = await Volunteer.findOne({ userId: req.user._id });

    if (!volunteer) {
        return next(new AppError('Volunteer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Monthly statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sessionsThisMonth = await Appointment.countDocuments({
        volunteerId: req.user._id,
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Case type breakdown
    const caseTypes = await Appointment.aggregate([
        { $match: { volunteerId: req.user._id } },
        { $group: { _id: '$caseType', count: { $sum: 1 } } }
    ]);

    // Rating trend
    const ratings = await Appointment.aggregate([
        { $match: { volunteerId: req.user._id, 'feedback.rating': { $exists: true } } },
        {
            $group: {
                _id: { $month: '$date' },
                averageRating: { $avg: '$feedback.rating' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            overall: {
                totalSessions: volunteer.totalSessions,
                totalHours: volunteer.totalHours,
                rating: volunteer.rating
            },
            monthly: {
                sessionsThisMonth
            },
            caseTypes,
            ratings
        }
    });
});

module.exports = exports;