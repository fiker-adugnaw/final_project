/**
 * AppError
 * Custom error class for all operational (known/expected) errors in the platform.
 * Distinguishes operational errors from programming bugs.
 *
 * Usage:
 *   throw new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
 *   throw new AppError('Email already registered', 409);
 */
class AppError extends Error {
    /**
     * @param {string}  message    - Human-readable error message
     * @param {number}  statusCode - HTTP status code (default: 500)
     * @param {string}  [code]     - Machine-readable error code (e.g. 'INVALID_CREDENTIALS')
     * @param {Object}  [details]  - Extra context (field errors, metadata) to send in the response
     */
    constructor(message, statusCode = 500, code = null, details = null) {
        super(message);

        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.code = code || AppError._defaultCodeForStatus(statusCode);
        this.details = details;

        // Mark as an operational error — handled errors that are expected
        this.isOperational = true;

        // Capture stack trace, excluding the constructor itself
        Error.captureStackTrace(this, this.constructor);
    }

    // ── Static factory helpers ──────────────────────────────────────────────────

    /** 400 Bad Request */
    static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details = null) {
        return new AppError(message, 400, code, details);
    }

    /** 401 Unauthorized */
    static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    /** 403 Forbidden */
    static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    /** 404 Not Found */
    static notFound(resource = 'Resource', code = 'NOT_FOUND') {
        return new AppError(`${resource} not found`, 404, code);
    }

    /** 409 Conflict */
    static conflict(message = 'Conflict with existing resource', code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }

    /** 422 Unprocessable Entity (validation failures) */
    static validationError(message = 'Validation failed', details = null) {
        return new AppError(message, 422, 'VALIDATION_ERROR', details);
    }

    /** 429 Too Many Requests */
    static tooManyRequests(message = 'Too many requests. Please try again later.', code = 'RATE_LIMIT_EXCEEDED') {
        return new AppError(message, 429, code);
    }

    /** 500 Internal Server Error */
    static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
        return new AppError(message, 500, code);
    }

    /** 503 Service Unavailable */
    static serviceUnavailable(service = 'Service', code = 'SERVICE_UNAVAILABLE') {
        return new AppError(`${service} is temporarily unavailable`, 503, code);
    }

    // ── Domain-specific factories ───────────────────────────────────────────────

    /** Invalid or expired JWT */
    static invalidToken(message = 'Invalid or expired token') {
        return new AppError(message, 401, 'INVALID_TOKEN');
    }

    /** Account locked due to too many failed attempts */
    static accountLocked(lockUntil) {
        const minutesLeft = lockUntil
            ? Math.ceil((lockUntil - Date.now()) / 60000)
            : '?';
        return new AppError(
            `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
            423, // Locked
            'ACCOUNT_LOCKED',
            { lockUntil }
        );
    }

    /** Email not yet verified */
    static emailNotVerified() {
        return new AppError('Please verify your email address before logging in.', 403, 'EMAIL_NOT_VERIFIED');
    }

    /** Account deactivated by admin */
    static accountDeactivated() {
        return new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    /** File upload error */
    static uploadError(message = 'File upload failed', code = 'UPLOAD_ERROR') {
        return new AppError(message, 400, code);
    }

    /** AI service unavailable */
    static aiUnavailable() {
        return new AppError('AI service is temporarily unavailable. Please try again shortly.', 503, 'AI_UNAVAILABLE');
    }

    /** Jurisdiction error — query involves non-Ethiopian law */
    static foreignJurisdiction(jurisdictions = []) {
        return new AppError(
            'This query involves foreign law, which is outside the scope of this platform. This platform specializes exclusively in Ethiopian law.',
            400,
            'FOREIGN_JURISDICTION',
            { detectedJurisdictions: jurisdictions }
        );
    }

    // ── Internal helpers ────────────────────────────────────────────────────────

    static _defaultCodeForStatus(status) {
        const map = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            422: 'VALIDATION_ERROR',
            423: 'ACCOUNT_LOCKED',
            429: 'RATE_LIMIT_EXCEEDED',
            500: 'INTERNAL_ERROR',
            503: 'SERVICE_UNAVAILABLE'
        };
        return map[status] || 'ERROR';
    }

    // ── Serialization ───────────────────────────────────────────────────────────

    /**
     * Serialize to a plain JSON-safe object for API responses
     * @param {boolean} includeStack - Include stack trace (dev only)
     */
    toJSON(includeStack = false) {
        const obj = {
            success: false,
            status: this.status,
            code: this.code,
            message: this.message
        };

        if (this.details) obj.details = this.details;
        if (includeStack) obj.stack = this.stack;

        return obj;
    }

    toString() {
        return `[AppError ${this.statusCode}] ${this.code}: ${this.message}`;
    }
}

module.exports = AppError;
