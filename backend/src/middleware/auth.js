/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const { HTTP_STATUS } = require('../config/constants');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protect routes - verify user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.protect = catchAsync(async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies (optional)
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return next(new AppError('You are not logged in. Please log in to access this resource.', HTTP_STATUS.UNAUTHORIZED));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
        return next(new AppError('The user belonging to this token no longer exists.', HTTP_STATUS.UNAUTHORIZED));
    }

    // Check if user is active
    if (!user.isActive) {
        return next(new AppError('Your account has been deactivated. Please contact support.', HTTP_STATUS.UNAUTHORIZED));
    }

    // Check if account is locked
    if (user.isLocked) {
        return next(new AppError('Your account is locked due to too many failed attempts. Please try again later.', HTTP_STATUS.UNAUTHORIZED));
    }

    // Attach user to request
    req.user = user;
    next();
});

/**
 * Optional authentication - doesn't require login but attaches user if present
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (user && user.isActive && !user.isLocked) {
            req.user = user;
        }

        next();
    } catch (error) {
        // Token is invalid, but we still proceed without user
        next();
    }
});

/**
 * Verify email verification status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.requireVerifiedEmail = catchAsync(async (req, res, next) => {
    if (!req.user.isVerified) {
        return next(new AppError('Please verify your email address to access this resource.', HTTP_STATUS.FORBIDDEN));
    }
    next();
});

/**
 * Check account status (active, not locked)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.checkAccountStatus = catchAsync(async (req, res, next) => {
    if (!req.user.isActive) {
        return next(new AppError('Your account has been deactivated.', HTTP_STATUS.FORBIDDEN));
    }

    if (req.user.isLocked) {
        return next(new AppError('Your account is locked due to too many failed attempts.', HTTP_STATUS.FORBIDDEN));
    }

    next();
});

/**
 * Check if user is verified (either email or phone)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.requireVerification = catchAsync(async (req, res, next) => {
    if (!req.user.isVerified) {
        return next(new AppError('Please verify your account to access this resource.', HTTP_STATUS.FORBIDDEN));
    }
    next();
});

/**
 * Generate and attach API key user (for API access)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.apiAuth = catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return next(new AppError('API key required', HTTP_STATUS.UNAUTHORIZED));
    }

    // Find user with matching API key
    const user = await User.findOne({ apiKey, isActive: true });

    if (!user) {
        return next(new AppError('Invalid API key', HTTP_STATUS.UNAUTHORIZED));
    }

    req.user = user;
    req.isApiRequest = true;
    next();
});

/**
 * Refresh token middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('Refresh token required', HTTP_STATUS.BAD_REQUEST));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + process.env.REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
        return next(new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED));
    }

    req.user = user;
    next();
});

module.exports = exports;