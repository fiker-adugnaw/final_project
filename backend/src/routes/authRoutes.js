const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, registerValidation, loginValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, registerValidation, validate, authController.register);
router.post('/register/lawyer', authLimiter, authController.registerLawyer);
router.post('/register/probono', authLimiter, authController.registerProBono);
router.post('/register/volunteer', authLimiter, authController.registerVolunteer);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, validate, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email/:token', authController.verifyEmail);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password/:token', authController.resetPassword);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post('/change-password', protect, authController.changePassword);

/**
 * @route   POST /api/auth/send-phone-otp
 * @desc    Send phone verification OTP
 * @access  Private
 */
router.post('/send-phone-otp', protect, authController.sendPhoneOTP);

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Verify phone number with OTP
 * @access  Private
 */
router.post('/verify-phone', protect, authController.verifyPhone);

/**
 * @route   POST /api/auth/complete-profile
 * @desc    Complete player profile based on user role
 * @access  Private
 */
router.post('/complete-profile', protect, authController.completeProfile);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

module.exports = router;