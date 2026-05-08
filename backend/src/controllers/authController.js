/**
 * Authentication Controller
 * Handles user registration, login, logout, password management, and email verification
 */

const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Client = require('../models/Client');
const Volunteer = require('../models/Volunteer');
const SystemLog = require('../models/SystemLog');
const { generateToken, generateRefreshToken, verifyToken, generateEmailVerificationToken, generatePasswordResetToken, generatePhoneOTP, compareHash, sanitizeUser, validatePasswordStrength } = require('../config/auth');
const { USER_TYPES, HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../config/constants');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = catchAsync(async (req, res, next) => {
    const { email, password, phone, userType, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
        const msg = `${ERROR_MESSAGES.en.EMAIL_EXISTS} | ${ERROR_MESSAGES.am.EMAIL_EXISTS}`;
        return next(new AppError(msg, HTTP_STATUS.CONFLICT));
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
        return next(new AppError(passwordValidation.errors.join(', '), HTTP_STATUS.BAD_REQUEST));
    }

    // Create user with PENDING_VERIFICATION status
    const user = await User.create({
        email,
        password,
        phone,
        userType,
        fullName,
        registrationStatus: 'PENDING_VERIFICATION'
    });

    // Generate email verification token
    const { token, hash, expiresIn } = generateEmailVerificationToken();
    user.emailVerificationToken = hash;
    user.emailVerificationExpires = expiresIn;
    await user.save();

    // Send verification email
    try {
        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email',
            template: 'email-verification',
            context: {
                name: user.fullName,
                token
            }
        });
    } catch (err) {
        console.error('Email failed to send:', err);
        // We don't block registration if email fails in dev, but in prod we might
    }

    // Generate JWT
    const jwtToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log registration
    await SystemLog.log({
        userId: user._id,
        action: 'USER_REGISTERED',
        module: 'AUTH',
        severity: 'INFO',
        details: { userType, email: user.email }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: `${SUCCESS_MESSAGES.en.REGISTER} | ${SUCCESS_MESSAGES.am.REGISTER}`,
        data: {
            user: sanitizeUser(user),
            token: jwtToken,
            refreshToken
        }
    });
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    if (!user) {
        const msg = `${ERROR_MESSAGES.en.INVALID_CREDENTIALS} | ${ERROR_MESSAGES.am.INVALID_CREDENTIALS}`;
        return next(new AppError(msg, HTTP_STATUS.UNAUTHORIZED));
    }

    // Check if account is locked
    if (user.isLocked) {
        return next(new AppError(ERROR_MESSAGES.en.ACCOUNT_LOCKED, HTTP_STATUS.UNAUTHORIZED));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        await user.incLoginAttempts();
        const msg = `${ERROR_MESSAGES.en.INVALID_CREDENTIALS} | ${ERROR_MESSAGES.am.INVALID_CREDENTIALS}`;
        return next(new AppError(msg, HTTP_STATUS.UNAUTHORIZED));
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Check if account is verified/active (Verification Flow)
    if (user.registrationStatus === 'PENDING_APPROVAL') {
        return next(new AppError('⚠ ACCOUNT NOT ACTIVE YET. Your account is pending admin verification. Please wait for approval notification.', HTTP_STATUS.FORBIDDEN));
    }
    if (user.registrationStatus === 'REJECTED') {
        return next(new AppError(`⚠ ACCOUNT REJECTED. Reason: ${user.rejectionReason}. Please contact support or re-register with corrected info.`, HTTP_STATUS.FORBIDDEN));
    }
    if (user.registrationStatus === 'SUSPENDED') {
        return next(new AppError('⚠ ACCOUNT SUSPENDED. Your account has been suspended for policy violations.', HTTP_STATUS.FORBIDDEN));
    }

    // Update last login
    await user.updateLastLogin(req.ip);

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log login
    await SystemLog.log({
        userId: user._id,
        action: 'USER_LOGIN',
        module: 'AUTH',
        severity: 'INFO',
        details: { email: user.email, ip: req.ip }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.LOGIN,
        data: {
            user: sanitizeUser(user),
            token,
            refreshToken
        }
    });
});

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    // Log logout
    await SystemLog.log({
        userId: req.user._id,
        action: 'USER_LOGOUT',
        module: 'AUTH',
        severity: 'INFO',
        details: { email: req.user.email }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.LOGOUT
    });
});

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('Refresh token required', HTTP_STATUS.BAD_REQUEST));
    }

    // Verify refresh token and get user
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
        return next(new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.UNAUTHORIZED));
    }

    // Generate new access token
    const newToken = generateToken(user);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            token: newToken
        }
    });
});

/**
 * Verify email
 * @route POST /api/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = catchAsync(async (req, res, next) => {
    const { token } = req.params;
    let user;

    // For prototype phase, support demo code 123456 as a universal verification
    if (token === '123456') {
        user = await User.findOne({ 
            registrationStatus: 'PENDING_VERIFICATION' 
        }).sort({ createdAt: -1 });
    } else {
        // Find user with matching verification token
        user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });
    }

    if (!user) {
        return next(new AppError(ERROR_MESSAGES.en.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST));
    }

    // Mark email as verified and move to PENDING_PROFILE
    user.isVerified = true;
    user.registrationStatus = 'PENDING_PROFILE';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Log verification
    await SystemLog.log({
        userId: user._id,
        action: 'EMAIL_VERIFIED',
        module: 'AUTH',
        severity: 'INFO',
        details: { email: user.email }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.EMAIL_VERIFIED,
        data: {
            registrationStatus: user.registrationStatus
        }
    });
});

/**
 * Specialized Lawyer Registration
 * @route POST /api/auth/register/lawyer
 */
exports.registerLawyer = catchAsync(async (req, res, next) => {
    const { email, password, phone, fullName, ...lawyerData } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) return next(new AppError(ERROR_MESSAGES.en.EMAIL_EXISTS, HTTP_STATUS.CONFLICT));

    const user = await User.create({
        email, password, phone, fullName,
        userType: 'LAWYER',
        registrationStatus: 'PENDING_APPROVAL',
        isActive: false
    });

    await Lawyer.create({
        userId: user._id,
        ...lawyerData,
        verificationStatus: 'PENDING_VERIFICATION'
    });

    await SystemLog.log({
        userId: user._id,
        action: 'LAWYER_REGISTERED',
        module: 'AUTH',
        severity: 'INFO',
        details: { email: user.email, license: lawyerData.licenseNumber }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: '✅ YOUR REQUEST HAS BEEN SENT TO THE ADMINISTRATOR',
        data: { userId: user._id }
    });
});

/**
 * Specialized Pro Bono Registration
 */
exports.registerProBono = catchAsync(async (req, res, next) => {
    const { email, password, phone, fullName, ...proBonoData } = req.body;

    const user = await User.create({
        email, password, phone, fullName,
        userType: 'PRO_BONO',
        registrationStatus: 'PENDING_APPROVAL',
        isActive: false
    });

    await Lawyer.create({
        userId: user._id,
        licenseNumber: proBonoData.lawyerLicenseNumber,
        proBono: { available: true, ...proBonoData },
        verificationStatus: 'PENDING_VERIFICATION'
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: '✅ YOUR REQUEST HAS BEEN SENT TO THE ADMINISTRATOR'
    });
});

/**
 * Specialized Volunteer Registration
 */
exports.registerVolunteer = catchAsync(async (req, res, next) => {
    const { email, password, phone, fullName, volunteerRole, ...volunteerData } = req.body;

    const user = await User.create({
        email, password, phone, fullName,
        userType: volunteerRole === 'ADVISOR' ? 'VOLUNTEER_ADVISOR' : 'VOLUNTEER_REPRESENTATIVE',
        registrationStatus: 'PENDING_APPROVAL',
        isActive: false
    });

    await Volunteer.create({
        userId: user._id,
        volunteerType: volunteerRole,
        ...volunteerData,
        status: 'PENDING'
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: '✅ YOUR REQUEST HAS BEEN SENT TO THE ADMINISTRATOR'
    });
});

/**
 * Complete user profile
 * @route POST /api/auth/complete-profile
 * @access Private
 */
exports.completeProfile = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
    }

    if (user.registrationStatus !== 'PENDING_PROFILE') {
        return next(new AppError(`Invalid status for profile completion: ${user.registrationStatus}`, HTTP_STATUS.BAD_REQUEST));
    }

    const profileData = req.body;
    
    // Update basic user fields from profile data if provided
    if (profileData.languagePreference) {
        user.languagePreference = profileData.languagePreference;
    }
    if (profileData.region) user.region = profileData.region;
    if (profileData.city) user.city = profileData.city;

    // Create profile based on User Type
    if (user.userType === 'CLIENT') {
        await Client.create({
            userId: user._id,
            ...profileData
        });
        user.registrationStatus = 'ACTIVE';
        user.isActive = true; // Client is active immediately after profile
    } else if (user.userType === 'LAWYER') {
        // Create lawyer profile
        await Lawyer.create({
            userId: user._id,
            licenseNumber: profileData.licenseNumber,
            experience: profileData.experience,
            specialization: profileData.specialization,
            bio: Array.isArray(profileData.expertise) ? profileData.expertise.join(', ') : (profileData.expertise || profileData.bio || ''),
            verificationStatus: 'PENDING_VERIFICATION'
        });
        user.registrationStatus = 'PENDING_APPROVAL';
        user.isActive = false; // Lawyers require admin approval
    } else if (user.userType === 'VOLUNTEER_ADVISOR' || user.userType === 'VOLUNTEER_REPRESENTATIVE') {
        // Map specialization from frontend to expertise for volunteers
        const expertise = profileData.specialization || profileData.expertise || [];
        
        await Volunteer.create({
            userId: user._id,
            volunteerType: user.userType === 'VOLUNTEER_ADVISOR' ? 'ADVISOR' : 'REPRESENTATIVE',
            expertise: Array.isArray(expertise) ? expertise : [expertise],
            ...profileData,
            status: 'PENDING'
        });
        user.registrationStatus = 'PENDING_APPROVAL';
        user.isActive = false;
    }

    await user.save();

    // Log profile completion
    await SystemLog.log({
        userId: user._id,
        action: 'PROFILE_COMPLETED',
        module: 'AUTH',
        severity: 'INFO',
        details: { userType: user.userType, registrationStatus: user.registrationStatus }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Profile completed successfully',
        data: {
            user: sanitizeUser(user)
        }
    });
});

/**
 * Forgot password - send reset email
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return next(new AppError(ERROR_MESSAGES.en.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND));
    }

    // Generate reset token
    const { token, hash, expiresIn } = generatePasswordResetToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = expiresIn;
    await user.save();

    // Send reset email
    await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'password-reset',
        context: {
            name: user.fullName,
            token
        }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Password reset email sent'
    });
});

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 * @access Public
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
        return next(new AppError(passwordValidation.errors.join(', '), HTTP_STATUS.BAD_REQUEST));
    }

    // Find user with matching reset token
    const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError(ERROR_MESSAGES.en.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST));
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log password reset
    await SystemLog.log({
        userId: user._id,
        action: 'PASSWORD_RESET',
        module: 'AUTH',
        severity: 'INFO',
        details: { email: user.email }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.PASSWORD_CHANGED
    });
});

/**
 * Change password (authenticated user)
 * @route POST /api/auth/change-password
 * @access Private
 */
exports.changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
        return next(new AppError('Current password is incorrect', HTTP_STATUS.UNAUTHORIZED));
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
        return next(new AppError(passwordValidation.errors.join(', '), HTTP_STATUS.BAD_REQUEST));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    await SystemLog.log({
        userId: user._id,
        action: 'PASSWORD_CHANGED',
        module: 'AUTH',
        severity: 'INFO',
        details: { email: user.email }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.PASSWORD_CHANGED
    });
});

/**
 * Send phone verification OTP
 * @route POST /api/auth/send-phone-otp
 * @access Private
 */
exports.sendPhoneOTP = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    const { otp, hash, expiresIn } = generatePhoneOTP();

    user.phoneVerificationCode = hash;
    user.phoneVerificationExpires = expiresIn;
    await user.save();

    // Send SMS with OTP
    await sendSMS({
        to: user.phone,
        message: `Your verification code is: ${otp}`
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'OTP sent successfully'
    });
});

/**
 * Verify phone number with OTP
 * @route POST /api/auth/verify-phone
 * @access Private
 */
exports.verifyPhone = catchAsync(async (req, res, next) => {
    const { otp } = req.body;

    const user = await User.findById(req.user._id);

    // Verify OTP
    const isValid = compareHash(otp, user.phoneVerificationCode);

    if (!isValid || user.phoneVerificationExpires < Date.now()) {
        return next(new AppError(ERROR_MESSAGES.en.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST));
    }

    user.isVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.en.PHONE_VERIFIED
    });
});

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id)
        .populate('profile');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            user: sanitizeUser(user)
        }
    });
});

module.exports = exports;