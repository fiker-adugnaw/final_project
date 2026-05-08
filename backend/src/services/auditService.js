const SystemLog = require('../models/SystemLog');

/**
 * Audit Service
 * Wraps SystemLog model with a clean, consistent interface for logging
 * all security and compliance-critical events across the platform.
 */

// ─── Core Logging ──────────────────────────────────────────────────────────────

/**
 * Log any action to the audit trail.
 * @param {Object} data - Audit log fields conforming to SystemLog schema
 */
const log = async (data) => {
    try {
        await SystemLog.log(data);
    } catch (err) {
        // Audit failures are logged to console but do NOT crash the platform
        console.error('[AuditService] Failed to write audit log:', err.message);
    }
};

/**
 * Log an action performed by an authenticated user.
 * @param {Object} user  - Mongoose User document (must have _id, email, userType)
 * @param {string} action - Action identifier e.g. 'LOGIN', 'CREATE_APPOINTMENT'
 * @param {string} module - Module enum value e.g. 'AUTH', 'APPOINTMENT'
 * @param {Object} details - Additional context data
 * @param {Object} req    - Express request object (optional)
 */
const logUserAction = async (user, action, module, details = {}, req = null) => {
    try {
        const logData = {
            userId: user._id,
            userEmail: user.email,
            userType: user.userType,
            action,
            module,
            details,
            severity: 'INFO',
            timestamp: new Date()
        };

        if (req) {
            logData.ipAddress = req.ip || req.connection?.remoteAddress;
            logData.userAgent = req.get('User-Agent');
            logData.method = req.method;
            logData.url = req.originalUrl;
            logData.sessionId = req.sessionID;
        }

        await SystemLog.create(logData);
    } catch (err) {
        console.error('[AuditService] logUserAction failed:', err.message);
    }
};

/**
 * Log a system error with full stack trace.
 * @param {Error}  error  - The error object
 * @param {Object} req    - Express request object (optional)
 * @param {string} userId - MongoDB ObjectId string (optional)
 */
const logError = async (error, req = null, userId = null) => {
    try {
        await SystemLog.logError(error, req, userId);
    } catch (err) {
        console.error('[AuditService] logError failed:', err.message);
    }
};

// ─── Authentication Events ─────────────────────────────────────────────────────

const logLogin = (user, req) =>
    logUserAction(user, 'LOGIN', 'AUTH', { method: 'password' }, req);

const logFailedLogin = async (email, reason, req) => {
    await log({
        userEmail: email,
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        severity: 'WARNING',
        details: { reason },
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        url: req?.originalUrl
    });
};

const logLogout = (user, req) =>
    logUserAction(user, 'LOGOUT', 'AUTH', {}, req);

const logPasswordChange = (user, req) =>
    logUserAction(user, 'PASSWORD_CHANGED', 'AUTH', {}, req);

const logPasswordReset = async (email, req) => {
    await log({
        userEmail: email,
        action: 'PASSWORD_RESET_REQUESTED',
        module: 'AUTH',
        severity: 'INFO',
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
    });
};

const logTokenRefresh = (user, req) =>
    logUserAction(user, 'TOKEN_REFRESHED', 'AUTH', {}, req);

// ─── User Management Events ────────────────────────────────────────────────────

const logUserRegistered = (user, req) =>
    logUserAction(user, 'USER_REGISTERED', 'USER', { userType: user.userType }, req);

const logEmailVerified = (user, req) =>
    logUserAction(user, 'EMAIL_VERIFIED', 'USER', {}, req);

const logProfileUpdated = (user, changes, req) =>
    logUserAction(user, 'PROFILE_UPDATED', 'USER', { fields: Object.keys(changes) }, req);

const logAccountDeactivated = (admin, targetUser, reason) =>
    logUserAction(admin, 'ACCOUNT_DEACTIVATED', 'ADMIN', {
        targetUserId: targetUser._id,
        targetEmail: targetUser.email,
        reason
    });

// ─── Lawyer / Volunteer Events ─────────────────────────────────────────────────

const logLawyerVerificationRequest = (user, req) =>
    logUserAction(user, 'VERIFICATION_REQUESTED', 'LAWYER', {}, req);

const logLawyerVerificationDecision = (admin, lawyer, status, notes) =>
    logUserAction(admin, `LAWYER_${status}`, 'ADMIN', {
        targetLawyerId: lawyer._id,
        status,
        notes
    });

const logVolunteerVerificationDecision = (admin, volunteer, status, notes) =>
    logUserAction(admin, `VOLUNTEER_${status}`, 'ADMIN', {
        targetVolunteerId: volunteer._id,
        status,
        notes
    });

// ─── Appointment Events ────────────────────────────────────────────────────────

const logAppointmentCreated = (user, appointment, req) =>
    logUserAction(user, 'APPOINTMENT_CREATED', 'APPOINTMENT', {
        appointmentId: appointment.appointmentId,
        appointmentType: appointment.appointmentType
    }, req);

const logAppointmentCancelled = (user, appointment, reason) =>
    logUserAction(user, 'APPOINTMENT_CANCELLED', 'APPOINTMENT', {
        appointmentId: appointment.appointmentId,
        reason
    });

const logAppointmentStatusChanged = (user, appointment, newStatus) =>
    logUserAction(user, 'APPOINTMENT_STATUS_CHANGED', 'APPOINTMENT', {
        appointmentId: appointment.appointmentId,
        newStatus
    });

// ─── Document Events ───────────────────────────────────────────────────────────

const logDocumentUploaded = (user, document, req) =>
    logUserAction(user, 'DOCUMENT_UPLOADED', 'DOCUMENT', {
        documentId: document.documentId,
        documentType: document.documentType,
        fileSize: document.fileSize
    }, req);

const logDocumentShared = (user, document, recipientId) =>
    logUserAction(user, 'DOCUMENT_SHARED', 'DOCUMENT', {
        documentId: document.documentId,
        recipientId
    });

const logDocumentDeleted = (user, document) =>
    logUserAction(user, 'DOCUMENT_DELETED', 'DOCUMENT', {
        documentId: document.documentId,
        documentType: document.documentType
    });

const logDocumentAccessed = (user, document) =>
    logUserAction(user, 'DOCUMENT_ACCESSED', 'DOCUMENT', {
        documentId: document.documentId
    });

// ─── AI Service Events ─────────────────────────────────────────────────────────

const logAIQuery = (user, query, response, req) =>
    logUserAction(user, 'AI_QUERY_SUBMITTED', 'AI', {
        responseId: response?.responseId,
        jurisdiction: response?.jurisdictionDetected,
        language: response?.queryLanguage,
        queryLength: query?.length
    }, req);

const logAIForeignJurisdiction = async (user, response) => {
    await log({
        userId: user._id,
        userEmail: user.email,
        userType: user.userType,
        action: 'AI_FOREIGN_JURISDICTION_DETECTED',
        module: 'AI',
        severity: 'WARNING',
        details: {
            responseId: response.responseId,
            jurisdictionDetected: response.jurisdictionDetected,
            foreignJurisdictions: response.foreignJurisdictions
        }
    });
};

// ─── Admin Events ──────────────────────────────────────────────────────────────

const logAdminAction = (admin, action, details, req) =>
    logUserAction(admin, action, 'ADMIN', details, req);

const logDataExport = (admin, exportType, filters) =>
    logUserAction(admin, 'DATA_EXPORTED', 'ADMIN', {
        exportType,
        filters
    });

const logBulkAction = (admin, action, affectedCount) =>
    logUserAction(admin, `BULK_${action}`, 'ADMIN', { affectedCount });

// ─── Security Events ───────────────────────────────────────────────────────────

const logSuspiciousActivity = async (details, req) => {
    await log({
        action: 'SUSPICIOUS_ACTIVITY',
        module: 'SYSTEM',
        severity: 'CRITICAL',
        details,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        url: req?.originalUrl
    });
};

const logRateLimitExceeded = async (ip, endpoint, req) => {
    await log({
        action: 'RATE_LIMIT_EXCEEDED',
        module: 'SYSTEM',
        severity: 'WARNING',
        details: { endpoint },
        ipAddress: ip,
        userAgent: req?.get('User-Agent'),
        url: endpoint
    });
};

const logUnauthorizedAccess = async (user, resource, req) => {
    await log({
        userId: user?._id,
        userEmail: user?.email,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        module: 'SYSTEM',
        severity: 'WARNING',
        details: { resource },
        ipAddress: req?.ip,
        url: req?.originalUrl
    });
};

// ─── Query Helpers ─────────────────────────────────────────────────────────────

/**
 * Get audit trail for a specific resource
 */
const getAuditTrail = (resourceId, resourceType) =>
    SystemLog.getAuditTrail(resourceId, resourceType);

/**
 * Query logs with filter options
 * @param {Object} filters - { module, severity, action, userId, startDate, endDate }
 * @param {Object} options - { page, limit, sort }
 */
const queryLogs = async (filters = {}, options = {}) => {
    const { module, severity, action, userId, startDate, endDate } = filters;
    const { page = 1, limit = 50, sort = { timestamp: -1 } } = options;

    const query = {};
    if (module) query.module = module;
    if (severity) query.severity = severity;
    if (action) query.action = action;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        SystemLog.find(query).sort(sort).skip(skip).limit(limit).populate('userId', 'email fullName'),
        SystemLog.countDocuments(query)
    ]);

    return {
        logs,
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};

/**
 * Get summary statistics (last N hours)
 */
const getSummary = (hours = 24) => SystemLog.getSummary(hours);

/**
 * Get counts by severity for dashboard
 */
const getSecurityDashboard = async (hours = 24) => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [criticalCount, warningCount, failedLogins, suspiciousActivity] = await Promise.all([
        SystemLog.countDocuments({ severity: 'CRITICAL', timestamp: { $gte: since } }),
        SystemLog.countDocuments({ severity: 'WARNING', timestamp: { $gte: since } }),
        SystemLog.countDocuments({ action: 'LOGIN_FAILED', timestamp: { $gte: since } }),
        SystemLog.countDocuments({ action: 'SUSPICIOUS_ACTIVITY', timestamp: { $gte: since } })
    ]);

    return { criticalCount, warningCount, failedLogins, suspiciousActivity, since };
};

module.exports = {
    // Core
    log,
    logUserAction,
    logError,

    // Auth
    logLogin,
    logFailedLogin,
    logLogout,
    logPasswordChange,
    logPasswordReset,
    logTokenRefresh,

    // User
    logUserRegistered,
    logEmailVerified,
    logProfileUpdated,
    logAccountDeactivated,

    // Lawyer/Volunteer
    logLawyerVerificationRequest,
    logLawyerVerificationDecision,
    logVolunteerVerificationDecision,

    // Appointments
    logAppointmentCreated,
    logAppointmentCancelled,
    logAppointmentStatusChanged,

    // Documents
    logDocumentUploaded,
    logDocumentShared,
    logDocumentDeleted,
    logDocumentAccessed,

    // AI
    logAIQuery,
    logAIForeignJurisdiction,

    // Admin
    logAdminAction,
    logDataExport,
    logBulkAction,

    // Security
    logSuspiciousActivity,
    logRateLimitExceeded,
    logUnauthorizedAccess,

    // Queries
    getAuditTrail,
    queryLogs,
    getSummary,
    getSecurityDashboard
};
