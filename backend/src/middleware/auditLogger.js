/**
 * Audit Logger Middleware
 * Logs all incoming requests and responses for audit purposes
 */

const SystemLog = require('../models/SystemLog');
const { SEVERITY_LEVELS, SYSTEM_MODULES } = require('../config/constants');

/**
 * Generate audit log entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} startTime - Request start time
 */
const createAuditLog = async (req, res, startTime) => {
    const responseTime = Date.now() - startTime;

    // Determine severity based on status code
    let severity = SEVERITY_LEVELS.INFO;
    if (res.statusCode >= 400 && res.statusCode < 500) {
        severity = SEVERITY_LEVELS.WARNING;
    } else if (res.statusCode >= 500) {
        severity = SEVERITY_LEVELS.ERROR;
    }

    // Determine module from route
    let module = SYSTEM_MODULES.SYSTEM;
    if (req.path.includes('/auth')) module = SYSTEM_MODULES.AUTH;
    else if (req.path.includes('/users')) module = SYSTEM_MODULES.USER;
    else if (req.path.includes('/lawyers')) module = SYSTEM_MODULES.LAWYER;
    else if (req.path.includes('/clients')) module = SYSTEM_MODULES.CLIENT;
    else if (req.path.includes('/volunteers')) module = SYSTEM_MODULES.VOLUNTEER;
    else if (req.path.includes('/appointments')) module = SYSTEM_MODULES.APPOINTMENT;
    else if (req.path.includes('/documents')) module = SYSTEM_MODULES.DOCUMENT;
    else if (req.path.includes('/ai')) module = SYSTEM_MODULES.AI;
    else if (req.path.includes('/forum')) module = SYSTEM_MODULES.FORUM;
    else if (req.path.includes('/notifications')) module = SYSTEM_MODULES.NOTIFICATION;
    else if (req.path.includes('/admin')) module = SYSTEM_MODULES.ADMIN;

    const logData = {
        userId: req.user?._id,
        userEmail: req.user?.email,
        userType: req.user?.userType,
        action: `${req.method} ${req.path}`,
        module,
        method: req.method,
        url: req.originalUrl,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime,
        severity,
        details: {
            query: req.query,
            params: req.params,
            // Don't log sensitive data like passwords
            body: sanitizeBody(req.body)
        }
    };

    // Log asynchronously - don't block response
    setImmediate(async () => {
        try {
            await SystemLog.create(logData);
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    });
};

/**
 * Sanitize request body to remove sensitive data
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
const sanitizeBody = (body) => {
    if (!body) return {};

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'passwordConfirm', 'currentPassword', 'newPassword', 'token', 'refreshToken'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
};

/**
 * Main audit logger middleware
 */
const auditLogger = (req, res, next) => {
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override end function to capture response
    res.end = function (...args) {
        // Create audit log
        createAuditLog(req, res, startTime);

        // Call original end
        originalEnd.apply(this, args);
    };

    next();
};

/**
 * Specific logger for critical actions
 * @param {string} action - Action being performed
 * @param {Object} details - Additional details
 * @returns {Function} Middleware
 */
const logCriticalAction = (action, details = {}) => {
    return async (req, res, next) => {
        try {
            await SystemLog.create({
                userId: req.user?._id,
                userEmail: req.user?.email,
                action,
                module: SYSTEM_MODULES.ADMIN,
                severity: SEVERITY_LEVELS.CRITICAL,
                details: {
                    ...details,
                    ip: req.ip,
                    body: sanitizeBody(req.body)
                }
            });
        } catch (error) {
            console.error('Failed to log critical action:', error);
        }
        next();
    };
};

/**
 * Log user login attempts
 * @param {Object} req - Express request object
 * @param {boolean} success - Whether login was successful
 * @param {string} email - User email
 */
const logLoginAttempt = async (req, success, email) => {
    try {
        await SystemLog.create({
            action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
            module: SYSTEM_MODULES.AUTH,
            severity: success ? SEVERITY_LEVELS.INFO : SEVERITY_LEVELS.WARNING,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
                email,
                success,
                reason: success ? null : 'Invalid credentials'
            }
        });
    } catch (error) {
        console.error('Failed to log login attempt:', error);
    }
};

/**
 * Log user registration
 * @param {Object} req - Express request object
 * @param {Object} user - Created user
 */
const logRegistration = async (req, user) => {
    try {
        await SystemLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'USER_REGISTERED',
            module: SYSTEM_MODULES.AUTH,
            severity: SEVERITY_LEVELS.INFO,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
                userType: user.userType,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Failed to log registration:', error);
    }
};

/**
 * Log password change
 * @param {Object} req - Express request object
 * @param {Object} user - User
 */
const logPasswordChange = async (req, user) => {
    try {
        await SystemLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'PASSWORD_CHANGED',
            module: SYSTEM_MODULES.AUTH,
            severity: SEVERITY_LEVELS.INFO,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
                method: req.body.currentPassword ? 'authenticated' : 'reset'
            }
        });
    } catch (error) {
        console.error('Failed to log password change:', error);
    }
};

/**
 * Log data export
 * @param {Object} req - Express request object
 * @param {string} exportType - Type of data exported
 */
const logDataExport = async (req, exportType) => {
    try {
        await SystemLog.create({
            userId: req.user._id,
            userEmail: req.user.email,
            action: 'DATA_EXPORT',
            module: SYSTEM_MODULES.USER,
            severity: SEVERITY_LEVELS.INFO,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
                exportType,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Failed to log data export:', error);
    }
};

module.exports = {
    auditLogger,
    logCriticalAction,
    logLoginAttempt,
    logRegistration,
    logPasswordChange,
    logDataExport,
    sanitizeBody
};