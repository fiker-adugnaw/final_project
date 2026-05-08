/**
 * Validation Middleware
 * Validates request data using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../config/constants');
const AppError = require('../utils/AppError');

/**
 * Check for validation errors
 * @returns {Function} Middleware function
 */
exports.validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return next(new AppError(errorMessages.join(', '), HTTP_STATUS.BAD_REQUEST));
    }

    next();
};

/**
 * User registration validation rules
 */
exports.registerValidation = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^\+?[0-9]{10,15}$/).withMessage('Please provide a valid phone number'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('userType')
        .notEmpty().withMessage('User type is required')
        .isIn(['CLIENT', 'LAWYER', 'VOLUNTEER_ADVISOR', 'VOLUNTEER_REPRESENTATIVE', 'PRO_BONO']).withMessage('Invalid user type'),

    body('region')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Region cannot exceed 100 characters'),

    body('city')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

    body('languagePreference')
        .optional()
        .isIn(['Amharic', 'English']).withMessage('Language preference must be Amharic or English')
];

/**
 * User login validation rules
 */
exports.loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address'),

    body('password')
        .notEmpty().withMessage('Password is required')
];

/**
 * Lawyer profile update validation
 */
exports.lawyerValidation = [
    body('licenseNumber')
        .optional()
        .trim()
        .isLength({ min: 5, max: 50 }).withMessage('License number must be between 5 and 50 characters'),

    body('specialization')
        .optional()
        .isArray().withMessage('Specialization must be an array'),

    body('specialization.*')
        .isIn(['FAMILY_LAW', 'CRIMINAL_LAW', 'CIVIL_LAW', 'COMMERCIAL_LAW', 'LABOR_LAW', 'PROPERTY_LAW', 'CONTRACT_LAW', 'HUMAN_RIGHTS'])
        .withMessage('Invalid specialization'),

    body('experience')
        .optional()
        .isInt({ min: 0, max: 70 }).withMessage('Experience must be between 0 and 70 years'),

    body('consultationFee.amount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),

    body('proBono.available')
        .optional()
        .isBoolean().withMessage('Pro bono available must be a boolean')
];

/**
 * Appointment creation validation
 */
exports.appointmentValidation = [
    body('lawyerId')
        .optional()
        .isMongoId().withMessage('Invalid lawyer ID'),

    body('volunteerId')
        .optional()
        .isMongoId().withMessage('Invalid volunteer ID'),

    body('appointmentType')
        .notEmpty().withMessage('Appointment type is required')
        .isIn(['CONSULTATION', 'REPRESENTATION', 'ADVISORY']).withMessage('Invalid appointment type'),

    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),

    body('date')
        .notEmpty().withMessage('Date is required')
        .isISO8601().withMessage('Invalid date format')
        .custom(value => {
            const date = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                throw new Error('Date cannot be in the past');
            }
            return true;
        }),

    body('startTime')
        .notEmpty().withMessage('Start time is required')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),

    body('endTime')
        .notEmpty().withMessage('End time is required')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)')
        .custom((endTime, { req }) => {
            const start = req.body.startTime;
            if (start && endTime <= start) {
                throw new Error('End time must be after start time');
            }
            return true;
        }),

    body('location.type')
        .optional()
        .isIn(['IN_PERSON', 'PHONE', 'VIDEO_CALL']).withMessage('Invalid location type')
];

/**
 * Forum post validation
 */
exports.forumPostValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),

    body('content')
        .trim()
        .notEmpty().withMessage('Content is required')
        .isLength({ min: 10, max: 10000 }).withMessage('Content must be between 10 and 10000 characters'),

    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['GENERAL', 'LEGAL_ADVICE', 'FAMILY_LAW', 'CRIMINAL_LAW', 'CIVIL_LAW', 'LABOR_LAW', 'PROPERTY_LAW', 'COMMERCIAL_LAW', 'HUMAN_RIGHTS', 'SUCCESS_STORIES', 'EMPLOYMENT_LAW', 'CONTRACT_LAW', 'IMMIGRATION', 'BUSINESS_LAW'])
        .withMessage('Invalid category'),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array'),

    body('tags.*')
        .optional()
        .isLength({ max: 30 }).withMessage('Each tag cannot exceed 30 characters')
];

/**
 * Document upload validation
 */
exports.documentValidation = [
    body('documentType')
        .notEmpty().withMessage('Document type is required')
        .isIn(['PETITION', 'EVIDENCE', 'CONTRACT', 'COURT_ORDER', 'IDENTIFICATION', 'LEGAL_BRIEF', 'AFFIDAVIT', 'OTHER'])
        .withMessage('Invalid document type'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
];

/**
 * AI guidance validation
 */
exports.aiGuidanceValidation = [
    body('query')
        .trim()
        .notEmpty().withMessage('Query is required')
        .isString().withMessage('Query must be a string')
        .isLength({ min: 1, max: 5000 }).withMessage('Query must be between 1 and 5000 characters'),

    body('language')
        .optional()
        .isIn(['Amharic', 'English', 'amharic', 'english']).withMessage('Language must be Amharic or English')
];

/**
 * Pagination validation
 */
exports.paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt()
];

/**
 * ID parameter validation
 */
exports.idValidation = [
    param('id')
        .notEmpty().withMessage('ID is required')
        .isMongoId().withMessage('Invalid ID format')
];

/**
 * MongoDB ID array validation
 */
exports.idsValidation = [
    body('ids')
        .isArray().withMessage('IDs must be an array')
        .notEmpty().withMessage('IDs array cannot be empty'),

    body('ids.*')
        .isMongoId().withMessage('Each ID must be a valid MongoDB ID')
];

/**
 * Date range validation
 */
exports.dateRangeValidation = [
    query('startDate')
        .optional()
        .isISO8601().withMessage('Start date must be a valid date'),

    query('endDate')
        .optional()
        .isISO8601().withMessage('End date must be a valid date')
        .custom((endDate, { req }) => {
            if (req.query.startDate && endDate < req.query.startDate) {
                throw new Error('End date must be after start date');
            }
            return true;
        })
];

/**
 * File upload validation (for multer)
 */
exports.fileValidation = (req, res, next) => {
    if (!req.file && !req.files) {
        return next(new AppError('Please upload a file', HTTP_STATUS.BAD_REQUEST));
    }

    let filesArray = [];
    if (req.files) {
        if (Array.isArray(req.files)) {
            filesArray = req.files;
        } else {
            // Flatten Multer fields object into an array
            filesArray = Object.values(req.files).flat();
        }
    } else if (req.file) {
        filesArray = [req.file];
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of filesArray) {
        if (!allowedTypes.includes(file.mimetype)) {
            return next(new AppError(`File type ${file.mimetype} is not allowed`, HTTP_STATUS.BAD_REQUEST));
        }

        if (file.size > maxSize) {
            return next(new AppError(`File ${file.originalname} exceeds 10MB limit`, HTTP_STATUS.BAD_REQUEST));
        }
    }

    next();
};

module.exports = exports;