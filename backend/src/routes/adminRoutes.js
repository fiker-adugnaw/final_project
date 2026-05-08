const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const { validate, idValidation, paginationValidation } = require('../middleware/validation');
const { adminBypassLimiter, defaultLimiter } = require('../middleware/rateLimiter');

// All admin routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

/**
 * @route   GET /api/admin/statistics
 * @desc    Get system statistics
 * @access  Private (Admin only)
 */
router.get('/statistics', adminController.getStatistics);

/**
 * @route   GET /api/admin/health
 * @desc    Get system health
 * @access  Private (Admin only)
 */
router.get('/health', adminController.getSystemHealth);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin only)
 */
router.get('/users', paginationValidation, validate, adminController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/users/:id', idValidation, validate, adminController.getUserById);

/**
 * @route   PATCH /api/admin/users/:id/verify
 * @desc    Verify user
 * @access  Private (Admin only)
 */
router.patch('/users/:id/verify', idValidation, validate, adminController.verifyUser);

/**
 * @route   POST /api/admin/users/:id/suspend
 * @desc    Suspend user
 * @access  Private (Admin only)
 */
router.post('/users/:id/suspend', idValidation, validate, adminController.suspendUser);

/**
 * @route   GET /api/admin/verification/stats
 * @desc    Get verification queue statistics
 * @access  Private (Admin only)
 */
router.get('/verification/stats', adminController.getVerificationStats);

/**
 * @route   GET /api/admin/lawyers/pending
 * @desc    Get lawyer verifications with filters (status, specialization, search, sort, page)
 * @access  Private (Admin only)
 */
router.get('/lawyers/pending', adminController.getPendingLawyers);

/**
 * @route   GET /api/admin/lawyers/:id/detail
 * @desc    Get single lawyer full detail (for verification modal)
 * @access  Private (Admin only)
 */
router.get('/lawyers/:id/detail', idValidation, validate, adminController.getLawyerDetail);

/**
 * @route   PATCH /api/admin/lawyers/:id/verify
 * @desc    Update lawyer verification status (UNDER_REVIEW / VERIFIED / REJECTED)
 * @access  Private (Admin only)
 */
router.patch('/lawyers/:id/verify', idValidation, validate, adminController.verifyLawyer);

// Keep backward-compat POST alias
router.post('/lawyers/:id/verify', idValidation, validate, adminController.verifyLawyer);

/**
 * @route   POST /api/admin/lawyers/:id/suspend
 * @desc    Suspend a lawyer (requires reason)
 * @access  Private (Admin only)
 */
router.post('/lawyers/:id/suspend', idValidation, validate, adminController.suspendLawyer);

/**
 * @route   POST /api/admin/lawyers/:id/reinstate
 * @desc    Reinstate a suspended lawyer
 * @access  Private (Admin only)
 */
router.post('/lawyers/:id/reinstate', idValidation, validate, adminController.reinstateLawyer);

/**
 * @route   GET /api/admin/appeals
 * @desc    Get all lawyer appeals (filter by status)
 * @access  Private (Admin only)
 */
router.get('/appeals', adminController.getAppeals);

/**
 * @route   PATCH /api/admin/appeals/:id/resolve
 * @desc    Resolve a lawyer appeal (APPROVED or REJECTED)
 * @access  Private (Admin only)
 */
router.patch('/appeals/:id/resolve', idValidation, validate, adminController.resolveAppeal);

/**
 * @route   GET /api/admin/volunteers/pending
 * @desc    Get pending volunteers
 * @access  Private (Admin only)
 */
router.get('/volunteers/pending', adminController.getPendingVolunteers);

/**
 * @route   GET /api/admin/volunteers/:id/detail
 * @desc    Get single volunteer full detail
 * @access  Private (Admin only)
 */
router.get('/volunteers/:id/detail', idValidation, validate, adminController.getVolunteerDetail);

/**
 * @route   POST /api/admin/volunteers/:id/approve
 * @desc    Approve volunteer
 * @access  Private (Admin only)
 */
router.post('/volunteers/:id/approve', idValidation, validate, adminController.approveVolunteer);

/**
 * @route   GET /api/admin/forum/pending
 * @desc    Get pending forum posts
 * @access  Private (Admin only)
 */
router.get('/forum/pending', adminController.getPendingPosts);

/**
 * @route   GET /api/admin/forum/flagged
 * @desc    Get flagged forum posts
 * @access  Private (Admin only)
 */
router.get('/forum/flagged', adminController.getFlaggedPosts);

/**
 * @route   POST /api/admin/forum/:id/moderate
 * @desc    Moderate forum post
 * @access  Private (Admin only)
 */
router.post('/forum/:id/moderate', idValidation, validate, adminController.moderatePost);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (Admin only)
 */
router.get('/audit-logs', paginationValidation, validate, adminController.getAuditLogs);

/**
 * @route   POST /api/admin/announcement
 * @desc    Create system announcement
 * @access  Private (Admin only)
 */
router.post('/announcement', adminController.createAnnouncement);
/**
 * @route   GET /api/admin/licenses
 * @desc    Get master licenses (lawyers, volunteers, pro_bono)
 * @access  Private (Admin only)
 */
router.get('/licenses', adminController.getLicenses);

/**
 * @route   POST /api/admin/licenses
 * @desc    Add a single license to master database
 * @access  Private (Admin only)
 */
router.post('/licenses', adminController.addLicense);

/**
 * @route   PUT /api/admin/licenses/:id
 * @desc    Update a license in master database
 * @access  Private (Admin only)
 */
router.put('/licenses/:id', idValidation, validate, adminController.updateLicense);

/**
 * @route   DELETE /api/admin/licenses/:id
 * @desc    Delete a license from master database
 * @access  Private (Admin only)
 */
router.delete('/licenses/:id', idValidation, validate, adminController.deleteLicense);

/**
 * @route   POST /api/admin/licenses/bulk-upload
 * @desc    Bulk upload licenses (CSV)
 * @access  Private (Admin only)
 */
router.post('/licenses/bulk-upload', adminController.bulkUploadLicenses);

/**
 * @route   POST /api/admin/lawyers/:id/verify-against-db
 * @desc    Verify incoming lawyer/volunteer request against master DB
 * @access  Private (Admin only)
 */
router.post('/lawyers/:id/verify-against-db', idValidation, validate, adminController.verifyAgainstMasterDb);

module.exports = router;