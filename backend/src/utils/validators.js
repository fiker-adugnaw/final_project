/**
 * Validators
 * Platform-wide validation functions using Joi and custom rules.
 * All validators return { error?, value } consistent with Joi's pattern.
 *
 * Where a registered Joi schema is needed for a controller body,
 * use the exported Joi schemas directly.
 */
const Joi = require('joi').extend(require('@joi/date'));

// ─── Reusable Field Definitions ────────────────────────────────────────────────

const ETHIOPIAN_PHONE_REGEX = /^(\+?251|0)[79]\d{8}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const fields = {
    email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim(),
    phone: Joi.string().pattern(ETHIOPIAN_PHONE_REGEX).messages({
        'string.pattern.base': 'Phone number must be a valid Ethiopian number (e.g. 0911234567 or +251911234567)'
    }),
    password: Joi.string().pattern(PASSWORD_REGEX).messages({
        'string.pattern.base': 'Password must be at least 8 characters with uppercase, lowercase, and a number'
    }),
    username: Joi.string().pattern(USERNAME_REGEX).messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores (3–30 chars)'
    }),
    mongoId: Joi.string().hex().length(24),
    language: Joi.string().valid('Amharic', 'English'),
    userType: Joi.string().valid(
        'CLIENT', 'LAWYER', 'VOLUNTEER_ADVISOR', 'VOLUNTEER_REPRESENTATIVE', 'ADMIN'
    ),
    paginationPage: Joi.number().integer().min(1).default(1),
    paginationLimit: Joi.number().integer().min(1).max(100).default(20)
};

// ─── Auth Schemas ──────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required(),
    username: fields.username.optional(),
    email: fields.email.required(),
    phone: fields.phone.required(),
    password: fields.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match'
    }),
    userType: fields.userType.required(),
    languagePreference: fields.language.default('Amharic'),
    region: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional()
});

const loginSchema = Joi.object({
    email: fields.email.optional(),
    phone: fields.phone.optional(),
    password: Joi.string().required(),
    twoFactorCode: Joi.string().length(6).optional()
}).or('email', 'phone').messages({
    'object.missing': 'Either email or phone is required'
});

const passwordResetRequestSchema = Joi.object({
    email: fields.email.required()
});

const passwordResetSchema = Joi.object({
    token: Joi.string().required(),
    password: fields.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match'
    })
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: fields.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'New passwords do not match'
    })
});

// ─── Lawyer Schemas ────────────────────────────────────────────────────────────

const lawyerProfileSchema = Joi.object({
    barNumber: Joi.string().trim().required(),
    licenseNumber: Joi.string().trim().optional(),
    practiceAreas: Joi.array().items(Joi.string()).min(1).required(),
    yearsOfExperience: Joi.number().integer().min(0).max(60).required(),
    education: Joi.array().items(
        Joi.object({
            institution: Joi.string().required(),
            degree: Joi.string().required(),
            year: Joi.number().integer().min(1950).max(new Date().getFullYear())
        })
    ).optional(),
    courtLicenses: Joi.array().items(Joi.string()).optional(),
    officeAddress: Joi.string().trim().max(200).optional(),
    consultationFee: Joi.number().min(0).optional(),
    bio: Joi.string().trim().max(1000).optional(),
    languages: Joi.array().items(Joi.string()).optional()
});

// ─── Appointment Schemas ───────────────────────────────────────────────────────

const appointmentSchema = Joi.object({
    lawyerId: fields.mongoId.required(),
    scheduledDate: Joi.date().greater('now').required().messages({
        'date.greater': 'Appointment must be in the future'
    }),
    appointmentType: Joi.string()
        .valid('IN_PERSON', 'VIDEO_CALL', 'PHONE_CALL', 'CHAT')
        .required(),
    caseType: Joi.string().trim().optional(),
    description: Joi.string().trim().max(500).optional(),
    duration: Joi.number().integer().min(15).max(180).default(60)
});

const rescheduleSchema = Joi.object({
    scheduledDate: Joi.date().greater('now').required(),
    reason: Joi.string().trim().max(300).optional()
});

// ─── Document Schemas ──────────────────────────────────────────────────────────

const documentMetaSchema = Joi.object({
    documentType: Joi.string().valid(
        'PETITION', 'EVIDENCE', 'CONTRACT', 'COURT_ORDER',
        'IDENTIFICATION', 'LEGAL_BRIEF', 'AFFIDAVIT', 'OTHER'
    ).required(),
    description: Joi.string().trim().max(500).optional(),
    caseType: Joi.string().trim().optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    isTemplate: Joi.boolean().default(false),
    templateCategory: Joi.string().trim().optional()
});

const shareDocumentSchema = Joi.object({
    userId: fields.mongoId.required(),
    permissions: Joi.object({
        view: Joi.boolean().default(true),
        download: Joi.boolean().default(false),
        edit: Joi.boolean().default(false),
        share: Joi.boolean().default(false)
    }).default({ view: true }),
    expiresAt: Joi.date().greater('now').optional()
});

// ─── Forum Schemas ─────────────────────────────────────────────────────────────

const forumPostSchema = Joi.object({
    title: Joi.string().trim().min(5).max(150).required(),
    content: Joi.string().trim().min(10).max(5000).required(),
    category: Joi.string().valid(
        'FAMILY_LAW', 'CRIMINAL_LAW', 'CIVIL_LAW', 'EMPLOYMENT_LAW',
        'PROPERTY_LAW', 'CONTRACT_LAW', 'HUMAN_RIGHTS', 'IMMIGRATION',
        'BUSINESS_LAW', 'GENERAL'
    ).required(),
    language: fields.language.required(),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(5).optional()
});

const forumReplySchema = Joi.object({
    content: Joi.string().trim().min(2).max(3000).required()
});

// ─── AI Query Schema ───────────────────────────────────────────────────────────

const aiQuerySchema = Joi.object({
    query: Joi.string().trim().min(5).max(5000).required().messages({
        'string.min': 'Query must be at least 5 characters',
        'string.max': 'Query cannot exceed 5000 characters'
    }),
    language: fields.language.optional()
});

const aiFeedbackSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().trim().max(500).optional()
});

// ─── Admin Schemas ─────────────────────────────────────────────────────────────

const verificationDecisionSchema = Joi.object({
    status: Joi.string().valid(
        'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'SUSPENDED'
    ).required(),
    notes: Joi.string().trim().max(500).optional()
});

const deactivateUserSchema = Joi.object({
    reason: Joi.string().trim().min(5).max(300).required()
});

const adminQuerySchema = Joi.object({
    page: fields.paginationPage,
    limit: fields.paginationLimit,
    userType: fields.userType.optional(),
    status: Joi.string().optional(),
    module: Joi.string().optional(),
    severity: Joi.string().valid('INFO', 'WARNING', 'ERROR', 'CRITICAL').optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    search: Joi.string().trim().max(100).optional()
});

// ─── Pagination Schema ─────────────────────────────────────────────────────────

const paginationSchema = Joi.object({
    page: fields.paginationPage,
    limit: fields.paginationLimit,
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
});

// ─── Validate Helper ───────────────────────────────────────────────────────────

/**
 * Validate data against a Joi schema.
 * Returns the validated + stripped value, or throws a descriptive AppError.
 *
 * @param {Object} schema - Joi schema
 * @param {Object} data   - Data to validate
 * @param {Object} [opts] - Joi options override
 */
const validate = (schema, data, opts = {}) => {
    const options = {
        abortEarly: false,
        stripUnknown: true,
        ...opts
    };

    const { error, value } = schema.validate(data, options);

    if (error) {
        const details = error.details.reduce((acc, d) => {
            const field = d.path.join('.');
            acc[field] = d.message.replace(/['"]/g, '');
            return acc;
        }, {});

        // Import inline to avoid circular dep
        const AppError = require('./AppError');
        throw AppError.validationError('Validation failed', details);
    }

    return value;
};

// ─── Standalone Validators (non-Joi) ──────────────────────────────────────────

/** Check if value is a valid MongoDB ObjectId */
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

/** Check if string is a valid Ethiopian phone number */
const isValidEthiopianPhone = (phone) => ETHIOPIAN_PHONE_REGEX.test(phone);

/** Check if email format is valid */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Check password meets requirements */
const isValidPassword = (password) => PASSWORD_REGEX.test(password);

/** Ensure a URL is absolute (starts with http:// or https://) */
const isAbsoluteUrl = (url) => /^https?:\/\//.test(url);

/** Check if date string is in the future */
const isFutureDate = (date) => new Date(date) > new Date();

module.exports = {
    // Schemas
    registerSchema,
    loginSchema,
    passwordResetRequestSchema,
    passwordResetSchema,
    changePasswordSchema,
    lawyerProfileSchema,
    appointmentSchema,
    rescheduleSchema,
    documentMetaSchema,
    shareDocumentSchema,
    forumPostSchema,
    forumReplySchema,
    aiQuerySchema,
    aiFeedbackSchema,
    verificationDecisionSchema,
    deactivateUserSchema,
    adminQuerySchema,
    paginationSchema,

    // Helper
    validate,

    // Standalone validators
    isValidObjectId,
    isValidEthiopianPhone,
    isValidEmail,
    isValidPassword,
    isAbsoluteUrl,
    isFutureDate
};
