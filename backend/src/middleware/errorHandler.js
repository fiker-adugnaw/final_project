/**
 * Global Error Handler Middleware
 * Handles all errors and sends appropriate responses
 */

const mongoose = require('mongoose');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../config/constants');
const SystemLog = require('../models/SystemLog');
const AppError = require('../utils/AppError');

/**
 * Handle MongoDB duplicate key errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyPattern)[0];
    let message = `Duplicate value for ${field}`;
    
    if (field === 'email') {
        message = `${ERROR_MESSAGES.en.EMAIL_EXISTS} | ${ERROR_MESSAGES.am.EMAIL_EXISTS}`;
    } else if (field === 'phone') {
        message = `${ERROR_MESSAGES.en.PHONE_EXISTS} | ${ERROR_MESSAGES.am.PHONE_EXISTS}`;
    }
    
    return new AppError(message, HTTP_STATUS.CONFLICT);
};

/**
 * Handle MongoDB validation errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `${ERROR_MESSAGES.en.VALIDATION_ERROR}: ${errors.join('. ')} | ${ERROR_MESSAGES.am.VALIDATION_ERROR}`;
    return new AppError(message, HTTP_STATUS.BAD_REQUEST);
};

/**
 * Handle MongoDB CastError (invalid ObjectId)
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
const handleCastError = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, HTTP_STATUS.BAD_REQUEST);
};

/**
 * Handle JWT errors
 * @param {Error} err - Error object
 * @returns {AppError} Formatted error
 */
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Handle JWT expiration
 * @returns {AppError} Formatted error
 */
const handleJWTExpiredError = () => {
    return new AppError('Your token has expired. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Send error response for development
 * @param {Object} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Send error response for production
 * @param {Object} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err);

        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Something went wrong. Please try again later.'
        });
    }
};

/**
 * Log error to database
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 */
const logError = async (err, req) => {
    try {
        await SystemLog.logError(err, req, req.user?._id);
    } catch (logError) {
        console.error('Failed to log error:', logError);
    }
};

const errorHandler = (err, req, res, next) => {
    // Default error values
    err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    err.status = err.status || 'error';

    // Log error to database (non-blocking)
    logError(err, req).catch(logErr => console.error('Error logging failed:', logErr));

    // Handle specific error types
    if (err instanceof mongoose.Error.CastError) {
        err = handleCastError(err);
    }

    if (err instanceof mongoose.Error.ValidationError) {
        err = handleValidationError(err);
    }

    if (err.code === 11000) {
        err = handleDuplicateKeyError(err);
    }

    if (err.name === 'JsonWebTokenError') {
        err = handleJWTError();
    }

    if (err.name === 'TokenExpiredError') {
        err = handleJWTExpiredError();
    }

    // Send appropriate error response based on environment
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        sendErrorProd(err, res);
    }
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
    const err = new AppError(`Can't find ${req.originalUrl} on this server`, HTTP_STATUS.NOT_FOUND);
    next(err);
};

/**
 * Async wrapper to catch errors in async routes
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        const nextFunc = typeof next === 'function' ? next : (err) => {
            if (err && !res.headersSent) {
                res.status(500).json({ status: 'error', message: err.message || 'Server Error' });
            }
        };
        Promise.resolve(fn(req, res, nextFunc)).catch(nextFunc);
    };
};

module.exports = {
    errorHandler,
    notFound,
    catchAsync,
    handleDuplicateKeyError,
    handleValidationError,
    handleCastError,
    handleJWTError,
    handleJWTExpiredError
};