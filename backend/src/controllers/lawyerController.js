/**
 * Lawyer Controller
 * Handles lawyer directory, profiles, verification, and reviews
 */

const Lawyer = require('../models/Lawyer');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const SystemLog = require('../models/SystemLog');
const { LAWYER_SPECIALIZATIONS, HTTP_STATUS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all lawyers with filters
 * @route GET /api/lawyers
 * @access Public
 */
exports.getAllLawyers = catchAsync(async (req, res, next) => {
    const {
        specialization,
        experience,
        rating,
        city,
        proBono,
        page = 1,
        limit = 20,
        sort = '-rating'
    } = req.query;

    // Build query
    const query = { verificationStatus: 'VERIFIED' };

    if (specialization) {
        query.specialization = { $in: [specialization] };
    }

    if (experience) {
        const [min, max] = experience.split('-');
        if (min && max) {
            query.experience = { $gte: parseInt(min), $lte: parseInt(max) };
        } else if (min) {
            query.experience = { $gte: parseInt(min) };
        }
    }

    if (rating) {
        query.rating = { $gte: parseFloat(rating) };
    }

    if (city) {
        query['officeAddress.city'] = city;
    }

    if (proBono === 'true') {
        query['proBono.available'] = true;
    }

    // Execute query with pagination
    const lawyers = await Lawyer.find(query)
        .populate('userId', 'fullName email phone profilePicture region city')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Lawyer.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            lawyers,
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
 * Get lawyer by ID
 * @route GET /api/lawyers/:id
 * @access Public
 */
exports.getLawyerById = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findById(req.params.id)
        .populate('userId', 'fullName email phone profilePicture region city');

    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    // Increment view count
    lawyer.views = (lawyer.views || 0) + 1;
    await lawyer.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { lawyer }
    });
});

/**
 * Search lawyers
 * @route GET /api/lawyers/search
 * @access Public
 */
exports.searchLawyers = catchAsync(async (req, res, next) => {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
        return next(new AppError('Search query required', HTTP_STATUS.BAD_REQUEST));
    }

    const lawyers = await Lawyer.find({
        verificationStatus: 'VERIFIED',
        $or: [
            { 'userId.fullName': { $regex: q, $options: 'i' } },
            { specialization: { $in: [new RegExp(q, 'i')] } },
            { 'officeAddress.city': { $regex: q, $options: 'i' } },
            { 'officeAddress.region': { $regex: q, $options: 'i' } }
        ]
    })
        .populate('userId', 'fullName email phone profilePicture')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Lawyer.countDocuments({
        verificationStatus: 'VERIFIED',
        $or: [
            { 'userId.fullName': { $regex: q, $options: 'i' } },
            { specialization: { $in: [new RegExp(q, 'i')] } }
        ]
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            lawyers,
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
 * Get lawyer reviews
 * @route GET /api/lawyers/:id/reviews
 * @access Public
 */
exports.getLawyerReviews = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findById(req.params.id)
        .select('reviews rating totalRatings');

    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            reviews: lawyer.reviews,
            averageRating: lawyer.rating,
            totalReviews: lawyer.totalRatings
        }
    });
});

/**
 * Add review for lawyer
 * @route POST /api/lawyers/:id/reviews
 * @access Private (Client only)
 */
exports.addReview = catchAsync(async (req, res, next) => {
    const { rating, comment } = req.body;
    const { appointmentId } = req.query;

    const lawyer = await Lawyer.findById(req.params.id);

    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check if user already reviewed
    const existingReview = lawyer.reviews.find(
        review => review.clientId.toString() === req.user._id.toString()
    );

    if (existingReview) {
        return next(new AppError('You have already reviewed this lawyer', HTTP_STATUS.BAD_REQUEST));
    }

    // Add review
    await lawyer.addReview(req.user._id, rating, comment, appointmentId);

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Review added successfully',
        data: {
            rating: lawyer.rating,
            totalRatings: lawyer.totalRatings
        }
    });
});

/**
 * Update lawyer profile (for lawyers)
 * @route PATCH /api/lawyers/profile
 * @access Private (Lawyer only)
 */
exports.updateLawyerProfile = catchAsync(async (req, res, next) => {
    const allowedFields = [
        'specialization', 'experience', 'languages', 'bio', 'officeAddress',
        'officePhone', 'website', 'consultationFee', 'proBono', 'availability',
        'workSchedule'
    ];

    const updateData = {};

    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    const lawyer = await Lawyer.findOneAndUpdate(
        { userId: req.user._id },
        updateData,
        { new: true, runValidators: true }
    ).populate('userId', 'fullName email phone');

    if (!lawyer) {
        return next(new AppError('Lawyer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { lawyer }
    });
});

/**
 * Get lawyer availability
 * @route GET /api/lawyers/:id/availability
 * @access Public
 */
exports.getLawyerAvailability = catchAsync(async (req, res, next) => {
    const { date } = req.query;

    const lawyer = await Lawyer.findById(req.params.id)
        .select('workSchedule availability');

    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    if (!lawyer.availability) {
        return res.status(HTTP_STATUS.OK).json({
            status: 'success',
            data: { available: false, message: 'Lawyer is not available' }
        });
    }

    // Get booked appointments for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
        lawyerId: lawyer.userId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    }).select('startTime endTime');

    const bookedSlots = bookedAppointments.map(app => ({
        start: app.startTime,
        end: app.endTime
    }));

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            available: lawyer.availability,
            schedule: lawyer.workSchedule,
            bookedSlots
        }
    });
});

/**
 * Get lawyer statistics
 * @route GET /api/lawyers/statistics
 * @access Private (Lawyer only)
 */
exports.getLawyerStatistics = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findOne({ userId: req.user._id });

    if (!lawyer) {
        return next(new AppError('Lawyer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Get appointment statistics
    const totalAppointments = await Appointment.countDocuments({ lawyerId: req.user._id });
    const completedAppointments = await Appointment.countDocuments({
        lawyerId: req.user._id,
        status: 'COMPLETED'
    });
    const upcomingAppointments = await Appointment.countDocuments({
        lawyerId: req.user._id,
        date: { $gte: new Date() },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    });

    // Get client statistics
    const uniqueClients = await Appointment.distinct('clientId', { lawyerId: req.user._id });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            profile: {
                rating: lawyer.rating,
                totalRatings: lawyer.totalRatings,
                casesHandled: lawyer.casesHandled,
                successRate: lawyer.successRate
            },
            appointments: {
                total: totalAppointments,
                completed: completedAppointments,
                upcoming: upcomingAppointments,
                completionRate: totalAppointments > 0
                    ? Math.round((completedAppointments / totalAppointments) * 100)
                    : 0
            },
            clients: {
                total: uniqueClients.length
            }
        }
    });
});

/**
 * Get lawyer specializations list
 * @route GET /api/lawyers/specializations
 * @access Public
 */
exports.getSpecializations = catchAsync(async (req, res, next) => {
    const specializations = Object.keys(LAWYER_SPECIALIZATIONS).map(key => ({
        value: LAWYER_SPECIALIZATIONS[key],
        label: LAWYER_SPECIALIZATIONS[key].replace(/_/g, ' ')
    }));

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { specializations }
    });
});

/**
 * Get featured lawyers
 * @route GET /api/lawyers/featured
 * @access Public
 */
exports.getFeaturedLawyers = catchAsync(async (req, res, next) => {
    const lawyers = await Lawyer.find({
        verificationStatus: 'VERIFIED',
        rating: { $gte: 4.5 }
    })
        .populate('userId', 'fullName email phone profilePicture')
        .sort({ rating: -1, casesHandled: -1 })
        .limit(6);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { lawyers }
    });
});

module.exports = exports;