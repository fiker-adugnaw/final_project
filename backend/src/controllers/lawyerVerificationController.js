/**
 * Lawyer Verification Controller
 * Handles lawyer-side verification workflow:
 * - View own verification status & history
 * - Upload verification documents
 * - Resubmit after rejection
 * - Submit appeal after suspension
 */

const Lawyer = require('../models/Lawyer');
const User = require('../models/User');
const VerificationAppeal = require('../models/VerificationAppeal');
const Notification = require('../models/Notification');
const SystemLog = require('../models/SystemLog');
const { HTTP_STATUS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads', 'verification');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Helper: map uploaded files to document objects ───────────────────────
const mapUploadedFiles = (files) => {
    const documents = [];

    const fieldTypeMap = {
        licenseDocument: 'LICENSE_DOCUMENT',
        barAssociationId: 'BAR_ASSOCIATION_ID',
        profilePhoto: 'PROFILE_PHOTO',
        additionalCertificates: 'ADDITIONAL_CERTIFICATE'
    };

    for (const [fieldName, fileArray] of Object.entries(files || {})) {
        if (!fileArray) continue;
        const docType = fieldTypeMap[fieldName] || 'OTHER';
        for (const file of fileArray) {
            // Validate minimum file size (50KB for license / bar ID)
            if (['licenseDocument', 'barAssociationId'].includes(fieldName) && file.size < 50 * 1024) {
                throw new AppError(
                    `${fieldName} is too small (minimum 50KB). Please upload a clear, high-quality document.`,
                    400
                );
            }
            documents.push({
                documentType: docType,
                documentUrl: `/uploads/verification/${file.filename}`,
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                uploadedAt: new Date()
            });
        }
    }

    return documents;
};

/**
 * GET /api/lawyers/my/verification-status
 * Returns lawyer's current verification status, history, and documents
 */
exports.getMyVerificationStatus = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findOne({ userId: req.user._id })
        .populate('userId', 'fullName email phone')
        .populate('verificationHistory.changedBy', 'fullName')
        .populate('suspendedBy', 'fullName');

    if (!lawyer) {
        // Return 200 OK with INCOMPLETE status for better UX
        return res.status(HTTP_STATUS.OK).json({
            status: 'success',
            data: {
                verificationStatus: 'INCOMPLETE',
                statusMessage: {
                    en: '📝 Your lawyer profile is incomplete. Please complete your profile to begin verification.',
                    am: '📝 የጠበቃ መገለጫዎ አልተሟላም። ማረጋገጫ ለመጀመር እባክዎ መገለጫዎን ያጠናቅቁ።'
                },
                resubmission: { canResubmit: false },
                appeal: { canAppeal: false }
            }
        });
    }

    // Calculate resubmission eligibility
    let canResubmit = false;
    let resubmitCooldownEnds = null;

    if (lawyer.verificationStatus === 'REJECTED') {
        if (lawyer.resubmissionCount >= 3) {
            canResubmit = false;
        } else if (lawyer.lastResubmittedAt) {
            const cooldownEnd = new Date(lawyer.lastResubmittedAt);
            cooldownEnd.setDate(cooldownEnd.getDate() + 7);  // 7-day cooldown
            if (new Date() >= cooldownEnd) {
                canResubmit = true;
            } else {
                canResubmit = false;
                resubmitCooldownEnds = cooldownEnd;
            }
        } else {
            canResubmit = true;
        }
    }

    // Calculate appeal eligibility for suspended accounts
    let canAppeal = false;
    let appealDeadline = null;
    let existingAppeal = null;

    if (lawyer.verificationStatus === 'SUSPENDED' && lawyer.suspendedAt) {
        const deadlineDate = new Date(lawyer.suspendedAt);
        deadlineDate.setDate(deadlineDate.getDate() + 30);  // 30-day window
        appealDeadline = deadlineDate;

        if (new Date() <= deadlineDate) {
            // Check if already appealed
            existingAppeal = await VerificationAppeal.findOne({
                lawyerId: lawyer._id,
                status: { $in: ['PENDING', 'UNDER_REVIEW'] }
            });
            canAppeal = !existingAppeal;
        }
    }

    const statusMessages = {
        PENDING_VERIFICATION: {
            en: '⏳ Your account is pending admin verification. Admin will review within 48 hours.',
            am: '⏳ መለያዎ በአስተዳዳሪ ማረጋገጫ ላይ ነው። አስተዳዳሪ በ48 ሰዓት ውስጥ ይመረምራል።'
        },
        UNDER_REVIEW: {
            en: '🔍 Your application is currently under review by our admin team.',
            am: '🔍 ማመልከቻዎ በአሁኑ ጊዜ በአስተዳዳሪ ቡድናችን ይገመገማል።'
        },
        VERIFIED: {
            en: '✅ Your account is VERIFIED. You are fully visible to clients.',
            am: '✅ መለያዎ ተረጋግጧል። ለደንበኞች ሙሉ በሙሉ ይታያሉ።'
        },
        REJECTED: {
            en: `❌ Your verification was rejected. Reason: ${lawyer.rejectionReason || 'See details below'}. Please correct and resubmit.`,
            am: `❌ ማረጋገጫዎ ውድቅ ተደርጓል። ምክንያት: ${lawyer.rejectionReason || 'ዝርዝሮቹን ይመልከቱ'}። እርምት ያድርጉ እና እንደገና ያስገቡ።`
        },
        SUSPENDED: {
            en: `⛔ Your account is SUSPENDED. Reason: ${lawyer.suspensionReason || 'Contact admin for details'}. Contact support to appeal.`,
            am: `⛔ መለያዎ ታግዷል። ምክንያት: ${lawyer.suspensionReason || 'ዝርዝሮት ለአስተዳዳሪ ያናግሩ'}። ይግባኝ ለማቅረብ ድጋፍ ያግኙ።`
        },
        EXPIRED: {
            en: '⚠️ Your license has expired. Please renew your license to continue practicing.',
            am: '⚠️ ፈቃድዎ ጊዜው አልፎበታል። ለማስቀጠል እባክዎ ፈቃድዎን ያድሱ።'
        }
    };

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            verificationStatus: lawyer.verificationStatus,
            statusMessage: statusMessages[lawyer.verificationStatus] || {},
            rejectionReason: lawyer.rejectionReason,
            suspensionReason: lawyer.suspensionReason,
            suspendedAt: lawyer.suspendedAt,
            verifiedAt: lawyer.verifiedAt,
            documents: lawyer.verificationDocuments,
            history: lawyer.verificationHistory,
            resubmission: {
                canResubmit,
                attemptsUsed: lawyer.resubmissionCount,
                maxAttempts: 3,
                cooldownEnds: resubmitCooldownEnds,
                lastResubmittedAt: lawyer.lastResubmittedAt
            },
            appeal: {
                canAppeal,
                deadline: appealDeadline,
                existingAppeal: existingAppeal ? {
                    status: existingAppeal.status,
                    submittedAt: existingAppeal.submittedAt
                } : null
            }
        }
    });
});

/**
 * POST /api/lawyers/my/documents
 * Upload verification documents (license, bar ID, certificates)
 */
exports.uploadVerificationDocuments = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findOne({ userId: req.user._id });

    if (!lawyer) {
        return next(new AppError('Lawyer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Only allow upload in PENDING_VERIFICATION or REJECTED states
    if (!['PENDING_VERIFICATION', 'REJECTED'].includes(lawyer.verificationStatus)) {
        return next(new AppError(
            `Cannot upload documents in ${lawyer.verificationStatus} status.`,
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new AppError('No files uploaded', HTTP_STATUS.BAD_REQUEST));
    }

    let newDocuments;
    try {
        newDocuments = mapUploadedFiles(req.files);
    } catch (err) {
        return next(err);
    }

    // Replace existing documents by type (not append, so resubmit replaces old)
    for (const newDoc of newDocuments) {
        const existingIndex = lawyer.verificationDocuments.findIndex(
            d => d.documentType === newDoc.documentType
        );
        if (existingIndex >= 0) {
            lawyer.verificationDocuments[existingIndex] = newDoc;
        } else {
            lawyer.verificationDocuments.push(newDoc);
        }
    }

    await lawyer.save();

    // Log upload
    await SystemLog.log({
        userId: req.user._id,
        action: 'LAWYER_DOCUMENTS_UPLOADED',
        module: 'LAWYER_VERIFICATION',
        severity: 'INFO',
        details: { lawyerId: lawyer._id, documentsCount: newDocuments.length }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `${newDocuments.length} document(s) uploaded successfully`,
        data: { documents: lawyer.verificationDocuments }
    });
});

/**
 * POST /api/lawyers/my/resubmit
 * Resubmit verification after rejection
 */
exports.resubmitVerification = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findOne({ userId: req.user._id });

    if (!lawyer) {
        return next(new AppError('Lawyer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Must be REJECTED to resubmit
    if (lawyer.verificationStatus !== 'REJECTED') {
        return next(new AppError(
            `Resubmission is only available when status is REJECTED. Current status: ${lawyer.verificationStatus}`,
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    // Check max attempts
    if (lawyer.resubmissionCount >= 3) {
        return next(new AppError(
            'Maximum resubmission attempts (3) reached. Please contact support.',
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    // Check 7-day cooldown
    if (lawyer.lastResubmittedAt) {
        const cooldownEnd = new Date(lawyer.lastResubmittedAt);
        cooldownEnd.setDate(cooldownEnd.getDate() + 7);
        if (new Date() < cooldownEnd) {
            return next(new AppError(
                `Resubmission cooldown active. You can resubmit after ${cooldownEnd.toLocaleDateString()}.`,
                HTTP_STATUS.BAD_REQUEST
            ));
        }
    }

    // Check required documents present
    const hasLicense = lawyer.verificationDocuments.some(d => d.documentType === 'LICENSE_DOCUMENT');
    const hasBarId = lawyer.verificationDocuments.some(d => d.documentType === 'BAR_ASSOCIATION_ID');

    if (!hasLicense || !hasBarId) {
        return next(new AppError(
            'Please upload both a license document and bar association ID before resubmitting.',
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    // Update profile fields if provided
    const { specialization, experience, licenseNumber, bio } = req.body;
    if (specialization) lawyer.specialization = specialization;
    if (experience) lawyer.experience = experience;
    if (licenseNumber) lawyer.licenseNumber = licenseNumber;
    if (bio) lawyer.bio = bio;

    // Record previous rejection in history, then set new status
    lawyer.recordStatusChange('PENDING_VERIFICATION', req.user._id, 'Resubmitted by lawyer', null);

    // Update resubmission metadata
    lawyer.resubmissionCount += 1;
    lawyer.lastResubmittedAt = new Date();
    lawyer.rejectionReason = null;

    // Archive previous rejection
    await lawyer.save();

    // Notify admins via notification
    const admins = await User.find({ userType: 'ADMIN', isActive: true }).select('_id');
    const adminNotifications = admins.map(admin => ({
        userId: admin._id,
        type: 'LAWYER_RESUBMITTED',
        title: 'Lawyer Resubmitted for Verification',
        message: `${req.user.fullName} has resubmitted their verification (Attempt ${lawyer.resubmissionCount}/3). License: ${lawyer.licenseNumber || 'N/A'}`,
        priority: 'HIGH',
        data: { lawyerId: lawyer._id, attempt: lawyer.resubmissionCount }
    }));
    await Notification.insertMany(adminNotifications);

    // Audit log
    await SystemLog.log({
        userId: req.user._id,
        action: 'LAWYER_RESUBMITTED',
        module: 'LAWYER_VERIFICATION',
        severity: 'INFO',
        details: {
            lawyerId: lawyer._id,
            attemptNumber: lawyer.resubmissionCount,
            changesMade: { specialization, experience, licenseNumber }
        }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `Verification resubmitted successfully (Attempt ${lawyer.resubmissionCount}/3). Admin will review within 48 hours.`,
        data: {
            verificationStatus: lawyer.verificationStatus,
            resubmissionCount: lawyer.resubmissionCount
        }
    });
});

/**
 * POST /api/lawyers/my/appeal
 * Submit appeal for suspended account
 */
exports.submitAppeal = catchAsync(async (req, res, next) => {
    const lawyer = await Lawyer.findOne({ userId: req.user._id });

    if (!lawyer) {
        return next(new AppError('Lawyer profile not found', HTTP_STATUS.NOT_FOUND));
    }

    // Must be SUSPENDED to appeal
    if (lawyer.verificationStatus !== 'SUSPENDED') {
        return next(new AppError(
            `Appeals are only available for suspended accounts. Current status: ${lawyer.verificationStatus}`,
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    // Check 30-day appeal window
    if (!lawyer.suspendedAt) {
        return next(new AppError('Suspension date not recorded. Please contact admin.', HTTP_STATUS.BAD_REQUEST));
    }

    const appealDeadline = new Date(lawyer.suspendedAt);
    appealDeadline.setDate(appealDeadline.getDate() + 30);

    if (new Date() > appealDeadline) {
        return next(new AppError(
            `Appeal window has expired (30 days from suspension on ${lawyer.suspendedAt.toLocaleDateString()}).`,
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    // Check for existing pending appeal
    const existingAppeal = await VerificationAppeal.findOne({
        lawyerId: lawyer._id,
        status: { $in: ['PENDING', 'UNDER_REVIEW'] }
    });

    if (existingAppeal) {
        return next(new AppError(
            'You already have an active appeal under review. Please wait for a decision.',
            HTTP_STATUS.BAD_REQUEST
        ));
    }

    const { appealReason, additionalNotes } = req.body;

    if (!appealReason || appealReason.trim().length < 20) {
        return next(new AppError('Appeal reason must be at least 20 characters.', HTTP_STATUS.BAD_REQUEST));
    }

    // Map any uploaded supporting documents
    let supportingDocuments = [];
    if (req.files && Object.keys(req.files).length > 0) {
        try {
            const docs = mapUploadedFiles(req.files);
            supportingDocuments = docs.map(d => ({
                documentType: d.documentType,
                documentUrl: d.documentUrl,
                originalName: d.originalName,
                uploadedAt: d.uploadedAt
            }));
        } catch (err) {
            return next(err);
        }
    }

    const appeal = await VerificationAppeal.create({
        lawyerId: lawyer._id,
        userId: req.user._id,
        appealingAgainst: 'SUSPENDED',
        appealReason: appealReason.trim(),
        additionalNotes: additionalNotes?.trim(),
        supportingDocuments,
        suspendedAt: lawyer.suspendedAt,
        appealDeadline
    });

    // Notify admins
    const admins = await User.find({ userType: 'ADMIN', isActive: true }).select('_id');
    const adminNotifications = admins.map(admin => ({
        userId: admin._id,
        type: 'LAWYER_APPEAL_SUBMITTED',
        title: 'Lawyer Appeal Submitted',
        message: `${req.user.fullName} has submitted an appeal against their suspension. Please review within 5 business days.`,
        priority: 'HIGH',
        data: { appealId: appeal._id, lawyerId: lawyer._id }
    }));
    await Notification.insertMany(adminNotifications);

    // Audit log
    await SystemLog.log({
        userId: req.user._id,
        action: 'LAWYER_APPEAL_SUBMITTED',
        module: 'LAWYER_VERIFICATION',
        severity: 'INFO',
        details: { lawyerId: lawyer._id, appealId: appeal._id }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Appeal submitted successfully. Admin will review within 5 business days.',
        data: {
            appeal: {
                id: appeal._id,
                status: appeal.status,
                submittedAt: appeal.submittedAt,
                deadline: appeal.appealDeadline
            }
        }
    });
});

module.exports = exports;
