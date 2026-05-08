const crypto = require('crypto');
const { SECURITY, PAGINATION } = require('./constants');

/**
 * Helpers
 * General-purpose utility functions used across the platform.
 */

// ─── Token & Code Generators ───────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token (hex).
 * Used for email verification, password reset, etc.
 * @param {number} bytes - Length of random bytes (resulting hex is 2× longer)
 * @returns {{ rawToken: string, hashedToken: string }}
 */
const generateSecureToken = (bytes = 32) => {
    const rawToken = crypto.randomBytes(bytes).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, hashedToken };
};

/**
 * Hash a raw token with SHA-256 (for DB lookup against stored hashed token).
 */
const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

/**
 * Generate a numeric OTP code of configurable length.
 * @param {number} length - OTP length (default: 6)
 */
const generateOTP = (length = SECURITY.OTP_LENGTH) => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
};

/**
 * Generate a random alphanumeric ID string.
 * @param {number} length
 */
const generateRandomId = (length = 12) => {
    return crypto.randomBytes(length).toString('base64url').slice(0, length).toUpperCase();
};

// ─── Pagination ───────────────────────────────────────────────────────────────

/**
 * Parse pagination parameters from a query string object.
 * Clamps limit to PAGINATION.MAX_LIMIT.
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (query = {}) => {
    const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
        PAGINATION.MAX_LIMIT,
        Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT)
    );
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * Build a standard paginated response envelope.
 */
const paginatedResponse = (data, total, page, limit) => ({
    data,
    pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
    }
});

// ─── Sort Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a sort query param into a Mongoose-compatible sort object.
 * @param {string} sortStr  - e.g. "-createdAt" or "fullName"
 * @param {Object} [defaults] - Fallback sort object
 * @param {string[]} [allowed] - Whitelist of allowed sort fields
 */
const parseSort = (sortStr, defaults = { createdAt: -1 }, allowed = []) => {
    if (!sortStr) return defaults;

    const isDesc = sortStr.startsWith('-');
    const field = isDesc ? sortStr.slice(1) : sortStr;

    if (allowed.length && !allowed.includes(field)) return defaults;

    return { [field]: isDesc ? -1 : 1 };
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Return a Date N hours from now.
 */
const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

/**
 * Return a Date N minutes from now.
 */
const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

/**
 * Return a Date N days from now.
 */
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Check if a date has expired (is in the past).
 */
const isExpired = (date) => !date || new Date(date) < new Date();

/**
 * Get start and end boundaries for a given day.
 */
const getDayBoundaries = (date = new Date()) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// ─── String Helpers ───────────────────────────────────────────────────────────

/**
 * Capitalise the first letter of each word.
 */
const toTitleCase = (str) =>
    (str || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Slugify a string (URL-safe, lowercase, hyphens).
 */
const slugify = (str) =>
    (str || '')
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-');

/**
 * Mask an email address for display: john****@gmail.com
 */
const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    const visible = local.slice(0, Math.min(3, local.length));
    return `${visible}****@${domain}`;
};

/**
 * Mask a phone number: +2519****5678
 */
const maskPhone = (phone) => {
    if (!phone) return '';
    const s = phone.replace(/\s/g, '');
    if (s.length < 6) return '****';
    return `${s.slice(0, 4)}****${s.slice(-4)}`;
};

/**
 * Truncate a string to a max length, appending ellipsis if needed.
 */
const truncate = (str, maxLength = 100) => {
    if (!str) return '';
    return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
};

// ─── Object Helpers ───────────────────────────────────────────────────────────

/**
 * Pick specific fields from an object (safe object projection).
 * @param {Object} obj
 * @param {string[]} fields
 */
const pick = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return {};
    return fields.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
};

/**
 * Omit specific fields from an object.
 */
const omit = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return {};
    return Object.keys(obj).reduce((acc, key) => {
        if (!fields.includes(key)) acc[key] = obj[key];
        return acc;
    }, {});
};

/**
 * Deep-flatten a nested object to dot-notation keys.
 * Useful for MongoDB $set operations.
 */
const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
            Object.assign(acc, flattenObject(obj[key], fullKey));
        } else {
            acc[fullKey] = obj[key];
        }
        return acc;
    }, {});
};

/**
 * Remove keys with null / undefined values from an object.
 */
const removeEmpty = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
};

// ─── API Response Builders ────────────────────────────────────────────────────

/**
 * Build a success response.
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    const body = { success: true, message };
    if (data !== null) body.data = data;
    return res.status(statusCode).json(body);
};

/**
 * Build a created (201) response.
 */
const createdResponse = (res, data, message = 'Created successfully') =>
    successResponse(res, data, message, 201);

/**
 * Build a no-content (204) response.
 */
const noContentResponse = (res) => res.status(204).send();

// ─── IP / Request Utilities ───────────────────────────────────────────────────

/**
 * Extract the real client IP, accounting for proxies/load balancers.
 */
const getClientIP = (req) => {
    return (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown'
    );
};

// ─── Sleep ────────────────────────────────────────────────────────────────────

/** Async sleep / delay helper */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Retry ────────────────────────────────────────────────────────────────────

/**
 * Retry an async function N times with exponential back-off.
 * @param {Function} fn      - Async function to retry
 * @param {number}   retries - Max attempts (default: 3)
 * @param {number}   delayMs - Base delay in ms (doubles each attempt)
 */
const withRetry = async (fn, retries = 3, delayMs = 500) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < retries) {
                await sleep(delayMs * Math.pow(2, attempt - 1));
            }
        }
    }
    throw lastError;
};

// ─── File Size Formatter ──────────────────────────────────────────────────────

/**
 * Format bytes into a human-readable string.
 */
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

module.exports = {
    // Tokens & OTP
    generateSecureToken,
    hashToken,
    generateOTP,
    generateRandomId,

    // Pagination
    parsePagination,
    paginatedResponse,
    parseSort,

    // Dates
    hoursFromNow,
    minutesFromNow,
    daysFromNow,
    isExpired,
    getDayBoundaries,

    // Strings
    toTitleCase,
    slugify,
    maskEmail,
    maskPhone,
    truncate,

    // Objects
    pick,
    omit,
    flattenObject,
    removeEmpty,

    // API responses
    successResponse,
    createdResponse,
    noContentResponse,

    // Request
    getClientIP,

    // Async
    sleep,
    withRetry,

    // Files
    formatBytes
};
