const mongoose = require('mongoose');
const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Volunteer = require('../models/Volunteer');
const Appointment = require('../models/Appointment');
const Document = require('../models/Document');
const ForumPost = require('../models/ForumPost');
const SystemLog = require('../models/SystemLog');
const Notification = require('../models/Notification');
const VerificationAppeal = require('../models/VerificationAppeal');
const MasterLawyer = require('../models/MasterLawyer');
const MasterProBono = require('../models/MasterProBono');
const MasterVolunteer = require('../models/MasterVolunteer');
const { USER_TYPES, HTTP_STATUS } = require('../config/constants');
const { sanitizeUser } = require('../config/auth');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get system statistics
 * @route GET /api/admin/statistics
 * @access Private (Admin only)
 */
exports.getStatistics = catchAsync(async (req, res, next) => {
    const [
        totalUsers,
        totalLawyers,
        totalClients,
        totalVolunteers,
        totalAppointments,
        totalDocuments,
        totalForumPosts,
        pendingApprovals,
        pendingPosts,
        appointmentsToday
    ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        User.countDocuments({ userType: 'LAWYER' }),
        User.countDocuments({ userType: 'CLIENT', isActive: true }),
        User.countDocuments({ userType: { $in: ['VOLUNTEER_ADVISOR', 'PRO_BONO'] } }),
        Appointment.countDocuments(),
        Document.countDocuments({ status: 'ACTIVE' }),
        ForumPost.countDocuments({ isDeleted: false }),
        User.countDocuments({ registrationStatus: 'PENDING_APPROVAL' }),
        ForumPost.countDocuments({ moderationStatus: 'PENDING' }),
        Appointment.countDocuments({
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            }
        })
    ]);

    // Get recent activity
    const recentActivity = await SystemLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'email fullName');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            users: {
                total: totalUsers,
                lawyers: totalLawyers,
                clients: totalClients,
                volunteers: totalVolunteers
            },
            content: {
                appointments: totalAppointments,
                documents: totalDocuments,
                forumPosts: totalForumPosts
            },
            pending: {
                approvals: pendingApprovals,
                forumPosts: pendingPosts
            },
            today: {
                appointments: appointmentsToday
            },
            recentActivity
        }
    });
});

/**
 * Get all users with filters
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
exports.getUsers = catchAsync(async (req, res, next) => {
    const { userType, isVerified, search, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };

    if (userType) {
        query.userType = userType;
    }

    if (isVerified !== undefined) {
        query.isVerified = isVerified === 'true';
    }

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const users = await User.find(query)
        .select('-password -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            users,
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
 * Get user by ID
 * @route GET /api/admin/users/:id
 * @access Private (Admin only)
 */
exports.getUserById = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
        .select('-password -passwordResetToken -passwordResetExpires')
        .populate('profile');

    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
    }

    // Get user activity
    const activity = await SystemLog.find({ userId: user._id })
        .sort({ timestamp: -1 })
        .limit(20);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { user, activity }
    });
});

/**
 * Verify user (for lawyers/volunteers)
 * @route PATCH /api/admin/users/:id/verify
 * @access Private (Admin only)
 */
exports.verifyUser = catchAsync(async (req, res, next) => {
    const { status, reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
    }

    if (user.userType === USER_TYPES.LAWYER) {
        const lawyer = await Lawyer.findOne({ userId: user._id });
        if (lawyer) {
            lawyer.verificationStatus = status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';
            lawyer.verifiedBy = req.user._id;
            lawyer.verifiedAt = new Date();
            if (status === 'REJECTED') {
                lawyer.rejectionReason = reason;
                user.rejectionReason = reason;
                user.registrationStatus = 'REJECTED';
            } else {
                user.registrationStatus = 'ACTIVE';
                user.isActive = true;
            }
            await lawyer.save();
        }
    } else if (user.userType === USER_TYPES.VOLUNTEER_ADVISOR || user.userType === USER_TYPES.PRO_BONO) {
        const volunteer = await Volunteer.findOne({ userId: user._id });
        if (volunteer) {
            volunteer.status = status === 'VERIFIED' ? 'APPROVED' : 'REJECTED';
            volunteer.approvedBy = req.user._id;
            volunteer.approvedAt = new Date();
            if (status === 'REJECTED') {
                volunteer.rejectionReason = reason;
                user.rejectionReason = reason;
                user.registrationStatus = 'REJECTED';
            } else {
                user.registrationStatus = 'ACTIVE';
                user.isActive = true;
            }
            await volunteer.save();
        }
    }

    // Update user verification status
    user.isVerified = status === 'VERIFIED';
    await user.save();

    // Notify user
    await Notification.create({
        userId: user._id,
        type: status === 'VERIFIED' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
        title: status === 'VERIFIED' ? 'Account Verified' : 'Verification Update',
        message: status === 'VERIFIED'
            ? 'Your account has been verified successfully'
            : `Your verification request was not approved: ${reason || 'No reason provided'}`,
        data: { status, reason }
    });

    // Log verification
    await SystemLog.log({
        userId: req.user._id,
        action: 'USER_VERIFIED',
        module: 'ADMIN',
        severity: 'INFO',
        details: { targetUserId: user._id, status, reason }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `User ${status.toLowerCase()} successfully`
    });
});

/**
 * Suspend user
 * @route POST /api/admin/users/:id/suspend
 * @access Private (Admin only)
 */
exports.suspendUser = catchAsync(async (req, res, next) => {
    const { reason, duration } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
    }

    user.isActive = false;
    // You might want to add suspension fields
    await user.save();

    // Notify user
    await Notification.create({
        userId: user._id,
        type: 'SYSTEM_ALERT',
        title: 'Account Suspended',
        message: `Your account has been suspended. Reason: ${reason}`,
        data: { reason, duration }
    });

    // Log suspension
    await SystemLog.log({
        userId: req.user._id,
        action: 'USER_SUSPENDED',
        module: 'ADMIN',
        severity: 'WARNING',
        details: { targetUserId: user._id, reason, duration }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'User suspended successfully'
    });
});

/**
 * Get lawyer verifications with filters
 * @route GET /api/admin/lawyers/pending
 * @access Private (Admin only)
 */
exports.getPendingLawyers = catchAsync(async (req, res, next) => {
    const {
        status,
        specialization,
        search,
        sort = 'createdAt',
        page = 1,
        limit = 20
    } = req.query;

    // Build query
    const query = {};

    // Default to pending/under-review unless explicit status
    if (status && status !== 'ALL') {
        query.verificationStatus = status;
    } else if (!status) {
        query.verificationStatus = { $in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] };
    }

    if (specialization && specialization !== 'All') {
        query.specialization = { $in: [specialization] };
    }

    // Build sort
    const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        name: { 'userId.fullName': 1 },
        license: { licenseNumber: 1 }
    };
    const sortOption = sortMap[sort] || { createdAt: 1 };

    let lawyersQuery = Lawyer.find(query)
        .populate('userId', 'fullName email phone createdAt profilePicture')
        .sort(sortOption)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    let lawyers = await lawyersQuery;

    // Client-side search on populated fullName (Mongoose doesn't support $regex on populated)
    if (search) {
        const re = new RegExp(search, 'i');
        lawyers = lawyers.filter(l =>
            re.test(l.userId?.fullName) ||
            re.test(l.licenseNumber) ||
            re.test(l.userId?.email)
        );
    }

    const total = await Lawyer.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            lawyers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
});

/**
 * Get single lawyer detail for admin verification modal
 * @route GET /api/admin/lawyers/:id/detail
 * @access Private (Admin only)
 */
exports.getLawyerDetail = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findById(req.params.id)
        .populate('userId', 'fullName email phone region city createdAt profilePicture userType')
        .populate('verifiedBy', 'fullName')
        .populate('suspendedBy', 'fullName')
        .populate('verificationHistory.changedBy', 'fullName');

    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    let referenceRecord = null;
    let matchStatus = { isMatch: false, issues: [] };

    if (lawyer.licenseNumber) {
        const userType = lawyer.userId?.userType;
        if (userType === 'PRO_BONO') {
            referenceRecord = await MasterProBono.findOne({ barLicenseNumber: lawyer.licenseNumber });
        } else {
            referenceRecord = await MasterLawyer.findOne({ licenseNumber: lawyer.licenseNumber });
        }

        if (referenceRecord) {
            matchStatus.isMatch = true;
            if (referenceRecord.status !== 'ACTIVE') {
                matchStatus.isMatch = false;
                matchStatus.issues.push(`License is ${referenceRecord.status}`);
            }
            if (referenceRecord.lawyerName?.toLowerCase() !== lawyer.userId?.fullName?.toLowerCase()) {
                matchStatus.isMatch = false;
                matchStatus.issues.push('Name mismatch with database');
            }
            if (referenceRecord.licenseExpiryDate && new Date(referenceRecord.licenseExpiryDate) < new Date()) {
                matchStatus.isMatch = false;
                matchStatus.issues.push('License in database has expired');
            }
        } else {
            matchStatus.issues.push('License number not found in database');
        }
    } else {
        matchStatus.issues.push('No license number provided');
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { lawyer, referenceRecord, matchStatus }
    });
});

/**
 * Get verification queue statistics
 * @route GET /api/admin/verification/stats
 * @access Private (Admin only)
 */
exports.getVerificationStats = catchAsync(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [pendingCount, underReviewCount, verifiedToday, rejectedToday, totalVerified, totalRejected] =
        await Promise.all([
            Lawyer.countDocuments({ verificationStatus: 'PENDING_VERIFICATION' }),
            Lawyer.countDocuments({ verificationStatus: 'UNDER_REVIEW' }),
            Lawyer.countDocuments({ verificationStatus: 'VERIFIED', verifiedAt: { $gte: today, $lt: tomorrow } }),
            Lawyer.countDocuments({ verificationStatus: 'REJECTED', updatedAt: { $gte: today, $lt: tomorrow } }),
            Lawyer.countDocuments({ verificationStatus: 'VERIFIED' }),
            Lawyer.countDocuments({ verificationStatus: 'REJECTED' })
        ]);

    const totalDecided = totalVerified + totalRejected;
    const approvalRate = totalDecided > 0 ? Math.round((totalVerified / totalDecided) * 100) : 0;
    const reviewedToday = verifiedToday + rejectedToday;

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            pendingCount,
            underReviewCount,
            reviewedToday,
            approvalRate: `${approvalRate}%`,
            totalVerified,
            totalRejected
        }
    });
});

/**
 * Verify / update lawyer status (full state machine)
 * @route PATCH /api/admin/lawyers/:id/verify
 * @access Private (Admin only)
 */
exports.verifyLawyer = catchAsync(async (req, res, next) => {
    const { status, reason, notes } = req.body;

    const validStatuses = ['UNDER_REVIEW', 'VERIFIED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, HTTP_STATUS.BAD_REQUEST));
    }

    if (status === 'REJECTED' && !reason) {
        return next(new AppError('Rejection reason is required', HTTP_STATUS.BAD_REQUEST));
    }

    const lawyer = await Lawyer.findById(req.params.id).populate('userId');
    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    // Record status change in history
    lawyer.recordStatusChange(status, req.user._id, reason, notes);

    if (status === 'VERIFIED') {
        lawyer.verifiedBy = req.user._id;
        lawyer.verifiedAt = new Date();
        lawyer.rejectionReason = null;
    } else if (status === 'REJECTED') {
        lawyer.rejectionReason = reason;
    }

    await lawyer.save();

    // Update User model
    const user = lawyer.userId;
    if (status === 'VERIFIED') {
        user.isVerified = true;
        user.registrationStatus = 'ACTIVE';
    } else if (status === 'REJECTED') {
        user.isVerified = false;
        user.rejectionReason = reason;
        user.registrationStatus = 'REJECTED';
    }
    await user.save();

    // Notification
    const notifMessages = {
        UNDER_REVIEW: 'Your verification application is now under review by our admin team.',
        VERIFIED: 'Congratulations! Your lawyer account has been VERIFIED. You can now accept clients.',
        REJECTED: `Your verification was rejected. Reason: ${reason}. Please correct the issues and resubmit.`
    };

    await Notification.create({
        userId: user._id,
        type: status === 'VERIFIED' ? 'VERIFICATION_APPROVED' : status === 'REJECTED' ? 'VERIFICATION_REJECTED' : 'VERIFICATION_UPDATE',
        title: status === 'VERIFIED' ? '✅ Account Verified!' : status === 'REJECTED' ? '❌ Verification Rejected' : '🔍 Under Review',
        message: notifMessages[status],
        priority: 'HIGH',
        data: { status, reason, lawyerId: lawyer._id }
    });

    // Audit log
    await SystemLog.log({
        userId: req.user._id,
        action: `LAWYER_VERIFICATION_${status}`,
        module: 'ADMIN',
        severity: 'INFO',
        details: { lawyerId: lawyer._id, targetUserId: user._id, status, reason, notes }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: status === 'VERIFIED'
            ? 'Lawyer verified successfully'
            : status === 'REJECTED'
            ? 'Lawyer rejected. Notification sent.'
            : 'Lawyer status updated to Under Review'
    });
});

/**
 * Suspend a verified lawyer
 * @route POST /api/admin/lawyers/:id/suspend
 * @access Private (Admin only)
 */
exports.suspendLawyer = catchAsync(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new AppError('Suspension reason is required', HTTP_STATUS.BAD_REQUEST));
    }

    const lawyer = await Lawyer.findById(req.params.id).populate('userId');
    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    if (lawyer.verificationStatus === 'SUSPENDED') {
        return next(new AppError('Lawyer is already suspended', HTTP_STATUS.BAD_REQUEST));
    }

    // Record status change
    lawyer.recordStatusChange('SUSPENDED', req.user._id, reason, null);
    lawyer.suspensionReason = reason;
    lawyer.suspendedAt = new Date();
    lawyer.suspendedBy = req.user._id;
    await lawyer.save();

    // Update user
    const user = lawyer.userId;
    user.isVerified = false;
    user.registrationStatus = 'SUSPENDED';
    await user.save();

    // Notification
    await Notification.create({
        userId: user._id,
        type: 'ACCOUNT_SUSPENDED',
        title: '⛔ Account Suspended',
        message: `Your lawyer account has been suspended. Reason: ${reason}. You have 30 days to submit an appeal.`,
        priority: 'URGENT',
        data: { reason, suspendedAt: lawyer.suspendedAt }
    });

    // Audit log
    await SystemLog.log({
        userId: req.user._id,
        action: 'LAWYER_SUSPENDED',
        module: 'ADMIN',
        severity: 'WARNING',
        details: { lawyerId: lawyer._id, targetUserId: user._id, reason }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Lawyer suspended successfully. Notification sent.'
    });
});

/**
 * Reinstate a suspended lawyer
 * @route POST /api/admin/lawyers/:id/reinstate
 * @access Private (Admin only)
 */
exports.reinstateLawyer = catchAsync(async (req, res, next) => {
    const { notes } = req.body;

    const lawyer = await Lawyer.findById(req.params.id).populate('userId');
    if (!lawyer) {
        return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
    }

    if (lawyer.verificationStatus !== 'SUSPENDED') {
        return next(new AppError('Lawyer is not suspended', HTTP_STATUS.BAD_REQUEST));
    }

    lawyer.recordStatusChange('VERIFIED', req.user._id, 'Reinstated by admin', notes);
    lawyer.suspensionReason = null;
    lawyer.suspendedAt = null;
    lawyer.suspendedBy = null;
    await lawyer.save();

    const user = lawyer.userId;
    user.isVerified = true;
    user.registrationStatus = 'ACTIVE';
    await user.save();

    await Notification.create({
        userId: user._id,
        type: 'ACCOUNT_REINSTATED',
        title: '✅ Account Reinstated',
        message: 'Your lawyer account has been reinstated. You can now accept clients again.',
        priority: 'HIGH',
        data: { notes }
    });

    await SystemLog.log({
        userId: req.user._id,
        action: 'LAWYER_REINSTATED',
        module: 'ADMIN',
        severity: 'INFO',
        details: { lawyerId: lawyer._id, targetUserId: user._id, notes }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Lawyer reinstated successfully.'
    });
});

/**
 * Get all lawyer appeals
 * @route GET /api/admin/appeals
 * @access Private (Admin only)
 */
exports.getAppeals = catchAsync(async (req, res, next) => {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;
    const query = status === 'ALL' ? {} : { status };

    const appeals = await VerificationAppeal.find(query)
        .populate('userId', 'fullName email phone')
        .populate('lawyerId', 'licenseNumber specialization verificationStatus')
        .populate('reviewedBy', 'fullName')
        .sort({ submittedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await VerificationAppeal.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            appeals,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        }
    });
});

/**
 * Resolve a lawyer appeal (approve or reject)
 * @route PATCH /api/admin/appeals/:id/resolve
 * @access Private (Admin only)
 */
exports.resolveAppeal = catchAsync(async (req, res, next) => {
    const { decision, adminResponse } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return next(new AppError('Decision must be APPROVED or REJECTED', HTTP_STATUS.BAD_REQUEST));
    }
    if (!adminResponse) {
        return next(new AppError('Admin response/reason is required', HTTP_STATUS.BAD_REQUEST));
    }

    const appeal = await VerificationAppeal.findById(req.params.id)
        .populate('userId', 'fullName email')
        .populate('lawyerId');

    if (!appeal) {
        return next(new AppError('Appeal not found', HTTP_STATUS.NOT_FOUND));
    }

    if (!['PENDING', 'UNDER_REVIEW'].includes(appeal.status)) {
        return next(new AppError('This appeal has already been resolved', HTTP_STATUS.BAD_REQUEST));
    }

    appeal.status = decision;
    appeal.adminResponse = adminResponse;
    appeal.reviewedBy = req.user._id;
    appeal.reviewedAt = new Date();
    await appeal.save();

    // If approved, reinstate the lawyer
    if (decision === 'APPROVED') {
        const lawyer = appeal.lawyerId;
        lawyer.recordStatusChange('VERIFIED', req.user._id, `Appeal approved: ${adminResponse}`, null);
        lawyer.suspensionReason = null;
        lawyer.suspendedAt = null;
        lawyer.suspendedBy = null;
        await lawyer.save();

        const user = await User.findById(appeal.userId._id);
        if (user) {
            user.isVerified = true;
            user.registrationStatus = 'ACTIVE';
            await user.save();
        }
    }

    // Notify the lawyer
    await Notification.create({
        userId: appeal.userId._id,
        type: decision === 'APPROVED' ? 'APPEAL_APPROVED' : 'APPEAL_REJECTED',
        title: decision === 'APPROVED' ? '✅ Appeal Approved - Account Reinstated' : '❌ Appeal Rejected',
        message: decision === 'APPROVED'
            ? `Your appeal has been approved. Your account is now reinstated. Admin note: ${adminResponse}`
            : `Your appeal has been rejected. Reason: ${adminResponse}`,
        priority: 'HIGH',
        data: { appealId: appeal._id, decision }
    });

    await SystemLog.log({
        userId: req.user._id,
        action: `LAWYER_APPEAL_${decision}`,
        module: 'ADMIN',
        severity: 'INFO',
        details: { appealId: appeal._id, lawyerId: appeal.lawyerId._id, decision, adminResponse }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `Appeal ${decision.toLowerCase()} successfully.`
    });
});

/**
 * Get pending volunteers
 * @route GET /api/admin/volunteers/pending
 * @access Private (Admin only)
 */
exports.getPendingVolunteers = catchAsync(async (req, res, next) => {
    const volunteers = await Volunteer.find({
        $or: [
            { status: 'PENDING' },
            { authorizationStatus: 'PENDING' }
        ]
    })
        .populate('userId', 'fullName email phone createdAt')
        .sort({ createdAt: 1 });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { volunteers }
    });
});

/**
 * Get single volunteer detail & check against database
 * @route GET /api/admin/volunteers/:id/detail
 * @access Private (Admin only)
 */
exports.getVolunteerDetail = catchAsync(async (req, res, next) => {
    const volunteer = await Volunteer.findById(req.params.id)
        .populate('userId', 'fullName email phone region city createdAt profilePicture userType')
        .populate('approvedBy', 'fullName');

    if (!volunteer) {
        return next(new AppError('Volunteer not found', HTTP_STATUS.NOT_FOUND));
    }

    let referenceRecord = null;
    let matchStatus = { isMatch: false, issues: [] };

    // Often students have their ID in qualifications.otherQualifications or institution
    // For this demonstration, we search MasterVolunteer by name or we could use ID if provided
    // Let's do a loose name search or expect studentId to be in qualifications.otherQualifications
    let studentId = volunteer.qualifications?.otherQualifications; 
    let searchQuery = {};
    if (studentId) {
        searchQuery = { studentId: new RegExp(studentId, 'i') };
    } else if (volunteer.userId?.fullName) {
        searchQuery = { fullName: new RegExp(`^${volunteer.userId.fullName}$`, 'i') };
    }

    if (Object.keys(searchQuery).length > 0) {
        referenceRecord = await MasterVolunteer.findOne(searchQuery);

        if (referenceRecord) {
            matchStatus.isMatch = true;
            if (referenceRecord.status !== 'ACTIVE') {
                 matchStatus.isMatch = false;
                 matchStatus.issues.push(`Student status in DB is ${referenceRecord.status}`);
            }
            if (referenceRecord.studentIdExpiryDate && new Date(referenceRecord.studentIdExpiryDate) < new Date()) {
                 matchStatus.isMatch = false;
                 matchStatus.issues.push('Student ID expired');
            }
        } else {
             matchStatus.issues.push('Volunteer record not found in official database');
        }
    } else {
        matchStatus.issues.push('No searchable info provided');
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { volunteer, referenceRecord, matchStatus }
    });
});

/**
 * Approve volunteer
 * @route POST /api/admin/volunteers/:id/approve
 * @access Private (Admin only)
 */
exports.approveVolunteer = catchAsync(async (req, res, next) => {
    const { status, authorizationStatus, reason } = req.body;

    const volunteer = await Volunteer.findById(req.params.id).populate('userId');

    if (!volunteer) {
        return next(new AppError('Volunteer not found', HTTP_STATUS.NOT_FOUND));
    }

    volunteer.status = status;

    if (authorizationStatus) {
        volunteer.authorizationStatus = authorizationStatus;
    }

    volunteer.approvedBy = req.user._id;
    volunteer.approvedAt = new Date();

    if (status === 'REJECTED') {
        volunteer.rejectionReason = reason;
    }

    await volunteer.save();

    // Notify volunteer
    await Notification.create({
        userId: volunteer.userId._id,
        type: 'VOLUNTEER_APPROVED',
        title: status === 'APPROVED' ? 'Application Approved' : 'Application Rejected',
        message: status === 'APPROVED'
            ? 'Your volunteer application has been approved'
            : `Your volunteer application was rejected: ${reason || 'No reason provided'}`,
        data: { status, authorizationStatus }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `Volunteer ${status.toLowerCase()} successfully`
    });
});

/**
 * Get pending forum posts for moderation
 * @route GET /api/admin/forum/pending
 * @access Private (Admin only)
 */
exports.getPendingPosts = catchAsync(async (req, res, next) => {
    const posts = await ForumPost.findPendingModeration()
        .populate('authorId', 'fullName email');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { posts }
    });
});

/**
 * Get flagged forum posts
 * @route GET /api/admin/forum/flagged
 * @access Private (Admin only)
 */
exports.getFlaggedPosts = catchAsync(async (req, res, next) => {
    const posts = await ForumPost.find({
        moderationStatus: 'FLAGGED',
        isDeleted: false
    })
        .populate('authorId', 'fullName email')
        .populate('flags.flaggedBy', 'fullName')
        .sort({ flagCount: -1 });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { posts }
    });
});

/**
 * Moderate forum post
 * @route POST /api/admin/forum/:id/moderate
 * @access Private (Admin only)
 */
exports.moderatePost = catchAsync(async (req, res, next) => {
    const { status, reason } = req.body;

    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    post.moderationStatus = status;
    post.moderatedBy = req.user._id;
    post.moderatedAt = new Date();

    if (status === 'REJECTED') {
        post.rejectionReason = reason;
    }

    await post.save();

    // Notify author
    await Notification.create({
        userId: post.authorId,
        type: status === 'APPROVED' ? 'FORUM_POST_APPROVED' : 'FORUM_POST_REJECTED',
        title: 'Post Moderation Update',
        message: status === 'APPROVED'
            ? 'Your forum post has been approved'
            : `Your forum post was not approved: ${reason || 'No reason provided'}`,
        data: { postId: post._id, status }
    });

    // Log moderation
    await SystemLog.log({
        userId: req.user._id,
        action: 'FORUM_POST_MODERATED',
        module: 'ADMIN',
        severity: 'INFO',
        details: { postId: post._id, status, reason }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `Post ${status.toLowerCase()} successfully`
    });
});

/**
 * Get audit logs
 * @route GET /api/admin/audit-logs
 * @access Private (Admin only)
 */
exports.getAuditLogs = catchAsync(async (req, res, next) => {
    const { module, severity, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    if (module) query.module = module;
    if (severity) query.severity = severity;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await SystemLog.find(query)
        .populate('userId', 'email fullName')
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await SystemLog.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            logs,
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
 * Create announcement (system-wide notification)
 * @route POST /api/admin/announcement
 * @access Private (Admin only)
 */
exports.createAnnouncement = catchAsync(async (req, res, next) => {
    const { title, message, targetUserTypes } = req.body;

    // Find target users
    const query = { isActive: true };
    if (targetUserTypes && targetUserTypes.length > 0) {
        query.userType = { $in: targetUserTypes };
    }

    const users = await User.find(query).select('_id');

    // Create notifications for all target users
    const notifications = users.map(user => ({
        userId: user._id,
        type: 'SYSTEM_ALERT',
        title,
        message,
        priority: 'HIGH',
        data: { isAnnouncement: true }
    }));

    await Notification.insertMany(notifications);

    // Log announcement
    await SystemLog.log({
        userId: req.user._id,
        action: 'ANNOUNCEMENT_CREATED',
        module: 'ADMIN',
        severity: 'INFO',
        details: { title, targetCount: users.length, targetUserTypes }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: `Announcement sent to ${users.length} users`
    });
});

/**
 * Get system health
 * @route GET /api/admin/health
 * @access Private (Admin only)
 */
exports.getSystemHealth = catchAsync(async (req, res, next) => {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState];

    // Get error rates
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const errors = await SystemLog.countDocuments({
        severity: { $in: ['ERROR', 'CRITICAL'] },
        timestamp: { $gte: lastHour }
    });

    const totalRequests = await SystemLog.countDocuments({
        timestamp: { $gte: lastHour }
    });

    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            database: {
                status: dbStatus,
                healthy: dbState === 1
            },
            performance: {
                errorRate: errorRate.toFixed(2) + '%',
                errorsLastHour: errors
            },
            timestamp: new Date().toISOString()
        }
    });
});


/**
 * Get master licenses based on type filter
 * @route GET /api/admin/licenses
 * @access Private (Admin only)
 */
exports.getLicenses = catchAsync(async (req, res, next) => {
    const { type = 'LAWYER', search, page = 1, limit = 50 } = req.query;
    const query = {};
    let Model;

    if (type === 'LAWYER') { Model = MasterLawyer; if (search) query.$or = [{ licenseNumber: { $regex: search, $options: 'i' } }, { lawyerName: { $regex: search, $options: 'i' } }]; }
    else if (type === 'VOLUNTEER') { Model = MasterVolunteer; if (search) query.$or = [{ studentId: { $regex: search, $options: 'i' } }, { fullName: { $regex: search, $options: 'i' } }]; }
    else if (type === 'PRO_BONO') { Model = MasterProBono; if (search) query.$or = [{ barLicenseNumber: { $regex: search, $options: 'i' } }, { lawyerName: { $regex: search, $options: 'i' } }]; }
    else return next(new AppError('Invalid license type', HTTP_STATUS.BAD_REQUEST));

    const licenses = await Model.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Model.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            licenses,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        }
    });
});

/**
 * Add a single license to master database
 * @route POST /api/admin/licenses
 * @access Private (Admin only)
 */
exports.addLicense = catchAsync(async (req, res, next) => {
    const { type, ...data } = req.body;
    let newLicense;

    if (type === 'LAWYER') newLicense = await MasterLawyer.create(data);
    else if (type === 'VOLUNTEER') newLicense = await MasterVolunteer.create(data);
    else if (type === 'PRO_BONO') newLicense = await MasterProBono.create(data);
    else return next(new AppError('Invalid license type', HTTP_STATUS.BAD_REQUEST));

    res.status(HTTP_STATUS.CREATED).json({ status: 'success', data: { license: newLicense } });
});

/**
 * Update a license in master database
 * @route PUT /api/admin/licenses/:id
 * @access Private (Admin only)
 */
exports.updateLicense = catchAsync(async (req, res, next) => {
    const { type, ...data } = req.body;
    let license;

    // Check which db the id belongs to or pass the type and check
    if (type === 'LAWYER') license = await MasterLawyer.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    else if (type === 'VOLUNTEER') license = await MasterVolunteer.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    else if (type === 'PRO_BONO') license = await MasterProBono.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    else return next(new AppError('Invalid license type', HTTP_STATUS.BAD_REQUEST));

    if (!license) return next(new AppError('License not found', HTTP_STATUS.NOT_FOUND));

    res.status(HTTP_STATUS.OK).json({ status: 'success', data: { license } });
});

/**
 * Delete a license from master database
 * @route DELETE /api/admin/licenses/:id
 * @access Private (Admin only)
 */
exports.deleteLicense = catchAsync(async (req, res, next) => {
    const { type } = req.query; // pass type as query param
    let license;

    if (type === 'LAWYER') license = await MasterLawyer.findByIdAndDelete(req.params.id);
    else if (type === 'VOLUNTEER') license = await MasterVolunteer.findByIdAndDelete(req.params.id);
    else if (type === 'PRO_BONO') license = await MasterProBono.findByIdAndDelete(req.params.id);
    else return next(new AppError('Invalid or missing license type parameter', HTTP_STATUS.BAD_REQUEST));

    if (!license) return next(new AppError('License not found', HTTP_STATUS.NOT_FOUND));

    res.status(HTTP_STATUS.OK).json({ status: 'success', message: 'License deleted' });
});

/**
 * Bulk upload licenses via JSON representation of CSV
 * @route POST /api/admin/licenses/bulk-upload
 * @access Private (Admin only)
 */
exports.bulkUploadLicenses = catchAsync(async (req, res, next) => {
    const { type, items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
        return next(new AppError('Items array is required and must not be empty', HTTP_STATUS.BAD_REQUEST));
    }

    let result;
    if (type === 'LAWYER') result = await MasterLawyer.insertMany(items, { ordered: false }).catch(e => e); // catch duplicates
    else if (type === 'VOLUNTEER') result = await MasterVolunteer.insertMany(items, { ordered: false }).catch(e => e);
    else if (type === 'PRO_BONO') result = await MasterProBono.insertMany(items, { ordered: false }).catch(e => e);
    else return next(new AppError('Invalid license type', HTTP_STATUS.BAD_REQUEST));

    res.status(HTTP_STATUS.CREATED).json({ 
        status: 'success', 
        message: 'Bulk upload completed',
        data: {
             // In mongoose, ordered: false throws if there are duplicates, but inserts valid ones. Let's send back what we can.
            insertedCount: result.insertedDocs ? result.insertedDocs.length : items.length,
            errorCount: result.writeErrors ? result.writeErrors.length : 0
        }
    });
});

/**
 * Verify incoming lawyer/volunteer request against master DB
 * @route POST /api/admin/lawyers/:id/verify-against-db
 * @access Private (Admin only)
 */
exports.verifyAgainstMasterDb = catchAsync(async (req, res, next) => {
    const targetUserId = req.params.id; // User ID
    const user = await User.findById(targetUserId);

    if (!user) return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));

    let matchResult = { matchFound: false, status: 'NOT_FOUND', details: null };

    if (user.userType === 'LAWYER') {
        const lawyer = await Lawyer.findOne({ userId: targetUserId });
        if (!lawyer) return next(new AppError('Lawyer profile not found', HTTP_STATUS.NOT_FOUND));
        
        let masterRecord = await MasterLawyer.findOne({ licenseNumber: lawyer.licenseNumber });
        if (!masterRecord && lawyer.barLicenseNumber) {
            masterRecord = await MasterProBono.findOne({ barLicenseNumber: lawyer.barLicenseNumber });
        }
        
        if (masterRecord) {
            matchResult.matchFound = true;
            matchResult.status = masterRecord.status;
            matchResult.details = masterRecord;
        }
    } else if (user.userType.includes('VOLUNTEER')) {
        const volunteer = await Volunteer.findOne({ userId: targetUserId });
        if (!volunteer) return next(new AppError('Volunteer profile not found', HTTP_STATUS.NOT_FOUND));
        
        const masterRecord = await MasterVolunteer.findOne({ studentId: volunteer.education?.institutionId || volunteer.studentId });
        
        if (masterRecord) {
            matchResult.matchFound = true;
            matchResult.status = masterRecord.status;
            matchResult.details = masterRecord;
        }
    }

    res.status(HTTP_STATUS.OK).json({ status: 'success', data: { verification: matchResult } });
});

module.exports = exports;