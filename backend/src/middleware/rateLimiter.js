/**
 * Rate Limiter Middleware
 * Prevents abuse by limiting requests per IP
 */

const rateLimit = require('express-rate-limit');
const { HTTP_STATUS, RATE_LIMIT } = require('../config/constants');

/**
 * Default rate limiter
 * Limits all requests to 100 per 15 minutes
 */
const defaultLimiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.MAX_REQUESTS,
    message: {
        status: 'error',
        message: 'Too many requests from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Strict rate limiter for authentication routes
 * Limits login/register attempts to 5 per hour
 */
const authLimiter = rateLimit({
    windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
    max: RATE_LIMIT.AUTH_MAX_REQUESTS,
    message: {
        status: 'error',
        message: 'Too many authentication attempts. Please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * API key rate limiter (higher limits for API users)
 * @param {number} maxRequests - Maximum requests per window
 * @returns {Function} Rate limiter middleware
 */
const apiKeyLimiter = (maxRequests = 1000) => {
    return rateLimit({
        windowMs: RATE_LIMIT.WINDOW_MS,
        max: maxRequests,
        keyGenerator: (req) => {
            // Use API key as identifier instead of IP
            return req.headers['x-api-key'] || req.ip;
        },
        message: {
            status: 'error',
            message: 'API rate limit exceeded.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

/**
 * Sensitive data rate limiter
 * For endpoints that handle sensitive information
 */
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: {
        status: 'error',
        message: 'Too many requests to sensitive endpoints. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * File upload rate limiter
 * Limits file uploads to prevent abuse
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
        status: 'error',
        message: 'Too many upload attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * AI service rate limiter
 * Limits AI queries to prevent excessive usage
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 AI queries per hour
    message: {
        status: 'error',
        message: 'AI query limit reached. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Forum posting rate limiter
 * Limits forum posts to prevent spam
 */
const forumLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 posts per hour
    message: {
        status: 'error',
        message: 'Posting limit reached. Please wait before posting again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Custom rate limiter with dynamic limits
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
const createLimiter = (options = {}) => {
    const {
        windowMs = RATE_LIMIT.WINDOW_MS,
        max = RATE_LIMIT.MAX_REQUESTS,
        message = 'Too many requests. Please try again later.',
        keyGenerator = (req) => req.ip,
        skipSuccessfulRequests = false
    } = options;

    return rateLimit({
        windowMs,
        max,
        message: { status: 'error', message },
        keyGenerator,
        skipSuccessfulRequests,
        standardHeaders: true,
        legacyHeaders: false
    });
};

/**
 * Skip rate limiting for admin users
 * @param {Object} req - Express request object
 * @returns {boolean} Whether to skip rate limiting
 */
const skipForAdmin = (req) => {
    return req.user && req.user.userType === 'ADMIN';
};

/**
 * Admin bypass limiter
 * Skips rate limiting for admin users
 */
const adminBypassLimiter = (baseLimiter) => {
    return (req, res, next) => {
        if (skipForAdmin(req)) {
            return next();
        }
        return baseLimiter(req, res, next);
    };
};

module.exports = {
    defaultLimiter,
    authLimiter,
    sensitiveLimiter,
    uploadLimiter,
    aiLimiter,
    forumLimiter,
    apiKeyLimiter,
    createLimiter,
    adminBypassLimiter,
    skipForAdmin
};