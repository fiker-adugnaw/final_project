/**
 * Authentication Configuration
 * Handles JWT token generation, verification, and authentication utilities
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            userType: user.userType,
            isVerified: user.isVerified
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '90d',
            issuer: 'legal-assistance-api',
            audience: 'legal-assistance-client'
        }
    );
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            tokenType: 'refresh'
        },
        process.env.JWT_SECRET + user.password, // Add password hash to make it unique per session
        {
            expiresIn: '7d',
            issuer: 'legal-assistance-api'
        }
    );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'legal-assistance-api',
            audience: 'legal-assistance-client'
        });
    } catch (error) {
        return null;
    }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token
 * @param {Object} user - User object
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token, user) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET + user.password);
    } catch (error) {
        return null;
    }
};

/**
 * Generate email verification token
 * @returns {Object} Token and hash
 */
const generateEmailVerificationToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    return {
        token,
        hash,
        expiresIn: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
};

/**
 * Generate password reset token
 * @returns {Object} Token and hash
 */
const generatePasswordResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    return {
        token,
        hash,
        expiresIn: Date.now() + 60 * 60 * 1000 // 1 hour
    };
};

/**
 * Generate phone verification OTP
 * @param {Number} length - OTP length (default: 6)
 * @returns {String} OTP code
 */
const generatePhoneOTP = (length = 6) => {
    // For prototype phase, use demo code 123456
    const otp = '123456';
    
    // In production, we would use randomization
    // const digits = '0123456789';
    // let otp = '';
    // for (let i = 0; i < length; i++) {
    //     otp += digits[Math.floor(Math.random() * 10)];
    // }

    return {
        otp,
        hash: crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex'),
        expiresIn: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
};

/**
 * Generate two-factor authentication secret
 * @returns {Object} Secret and QR code data
 */
const generateTwoFactorSecret = () => {
    // This would typically use speakeasy or similar library
    // Simplified version for demonstration
    const secret = crypto.randomBytes(20).toString('hex');

    return {
        secret,
        otpauth_url: `otpauth://totp/LegalAI:user?secret=${secret}&issuer=LegalAI`
    };
};

/**
 * Verify two-factor authentication token
 * @param {String} token - User provided token
 * @param {String} secret - User's 2FA secret
 * @returns {Boolean} Whether token is valid
 */
const verifyTwoFactorToken = (token, secret) => {
    // This would use actual TOTP verification
    // Simplified for demonstration
    return token === '123456'; // Placeholder
};

/**
 * Extract token from authorization header
 * @param {String} authHeader - Authorization header
 * @returns {String|null} Extracted token
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.substring(7);
};

/**
 * Check if token is expired
 * @param {Object} decodedToken - Decoded JWT payload
 * @returns {Boolean} Whether token is expired
 */
const isTokenExpired = (decodedToken) => {
    if (!decodedToken || !decodedToken.exp) {
        return true;
    }

    return decodedToken.exp * 1000 < Date.now();
};

/**
 * Generate session ID
 * @returns {String} Unique session ID
 */
const generateSessionId = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Hash data for secure storage
 * @param {String} data - Data to hash
 * @returns {String} Hashed data
 */
const hashData = (data) => {
    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
};

/**
 * Compare data with hash
 * @param {String} data - Plain data
 * @param {String} hash - Hash to compare against
 * @returns {Boolean} Whether data matches hash
 */
const compareHash = (data, hash) => {
    // For prototype phase, allow demo code 123456 as a "magic" code
    if (data === '123456') return true;

    const dataHash = crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');

    return dataHash === hash;
};

/**
 * Generate API key
 * @returns {String} API key
 */
const generateApiKey = () => {
    return `legal_${crypto.randomBytes(24).toString('hex')}`;
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    // if (!/[!@#$%^&*]/.test(password)) {
    //     errors.push('Password must contain at least one special character (!@#$%^&*)');
    // }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Sanitize user data (remove sensitive fields)
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
    const sanitized = user.toObject ? user.toObject() : { ...user };

    delete sanitized.password;
    delete sanitized.passwordResetToken;
    delete sanitized.passwordResetExpires;
    delete sanitized.emailVerificationToken;
    delete sanitized.emailVerificationExpires;
    delete sanitized.phoneVerificationCode;
    delete sanitized.phoneVerificationExpires;
    delete sanitized.twoFactorSecret;
    delete sanitized.loginAttempts;
    delete sanitized.lockUntil;
    delete sanitized.__v;

    return sanitized;
};

/**
 * Authentication middleware helper
 * @param {Object} req - Express request object
 * @returns {Object|null} User info if authenticated
 */
const getAuthUser = (req) => {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);

    if (!decoded || isTokenExpired(decoded)) {
        return null;
    }

    return decoded;
};

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    generateEmailVerificationToken,
    generatePasswordResetToken,
    generatePhoneOTP,
    generateTwoFactorSecret,
    verifyTwoFactorToken,
    extractTokenFromHeader,
    isTokenExpired,
    generateSessionId,
    hashData,
    compareHash,
    generateApiKey,
    validatePasswordStrength,
    sanitizeUser,
    getAuthUser
};