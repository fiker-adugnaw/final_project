/**
 * Role-Based Access Control Middleware
 * Checks if user has required roles/permissions
 */

const { USER_TYPES, HTTP_STATUS } = require('../config/constants');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Check if user has any of the allowed roles
 * @param {...string} allowedRoles - Roles that are allowed to access
 * @returns {Function} Middleware function
 */
exports.restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
        }

        if (!allowedRoles.includes(req.user.userType)) {
            return next(new AppError('You do not have permission to perform this action.', HTTP_STATUS.FORBIDDEN));
        }

        next();
    };
};

/**
 * Check if user is admin
 * @returns {Function} Middleware function
 */
exports.isAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.ADMIN) {
        return next(new AppError('Admin access required.', HTTP_STATUS.FORBIDDEN));
    }

    next();
};

/**
 * Check if user is a lawyer
 * @returns {Function} Middleware function
 */
exports.isLawyer = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.LAWYER) {
        return next(new AppError('Lawyer access required.', HTTP_STATUS.FORBIDDEN));
    }

    next();
};

/**
 * Check if user is a client
 * @returns {Function} Middleware function
 */
exports.isClient = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.CLIENT) {
        return next(new AppError('Client access required.', HTTP_STATUS.FORBIDDEN));
    }

    next();
};

/**
 * Check if user is a volunteer (advisor or representative)
 * @returns {Function} Middleware function
 */
exports.isVolunteer = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    const volunteerTypes = [USER_TYPES.VOLUNTEER_ADVISOR, USER_TYPES.VOLUNTEER_REPRESENTATIVE];
    if (!volunteerTypes.includes(req.user.userType)) {
        return next(new AppError('Volunteer access required.', HTTP_STATUS.FORBIDDEN));
    }

    next();
};

/**
 * Check if user is a volunteer advisor
 * @returns {Function} Middleware function
 */
exports.isVolunteerAdvisor = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.VOLUNTEER_ADVISOR) {
        return next(new AppError('Volunteer advisor access required.', HTTP_STATUS.FORBIDDEN));
    }

    next();
};

/**
 * Check if user is a volunteer representative
 * @returns {Function} Middleware function
 */
exports.isVolunteerRepresentative = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.VOLUNTEER_REPRESENTATIVE) {
        return next(new AppError('Volunteer representative access required.', HTTP_STATUS.FORBIDDEN));
    }

    next();
};

/**
 * Check if user has verified lawyer status
 * @returns {Function} Middleware function
 */
exports.isVerifiedLawyer = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.LAWYER) {
        return next(new AppError('Lawyer access required.', HTTP_STATUS.FORBIDDEN));
    }

    const Lawyer = require('../models/Lawyer');
    const lawyer = await Lawyer.findOne({ userId: req.user._id });

    if (!lawyer || lawyer.verificationStatus !== 'VERIFIED') {
        return next(new AppError('Your lawyer account must be verified to perform this action.', HTTP_STATUS.FORBIDDEN));
    }

    next();
});

/**
 * Check if user is authorized volunteer representative
 * @returns {Function} Middleware function
 */
exports.isAuthorizedRepresentative = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
    }

    if (req.user.userType !== USER_TYPES.VOLUNTEER_REPRESENTATIVE) {
        return next(new AppError('Volunteer representative access required.', HTTP_STATUS.FORBIDDEN));
    }

    const Volunteer = require('../models/Volunteer');
    const volunteer = await Volunteer.findOne({ userId: req.user._id });

    if (!volunteer || volunteer.authorizationStatus !== 'AUTHORIZED') {
        return next(new AppError('You must be authorized to provide representation services.', HTTP_STATUS.FORBIDDEN));
    }

    next();
});

/**
 * Check if user is the resource owner or admin
 * @param {Function} getOwnerId - Function that returns the owner ID from the request
 * @returns {Function} Middleware function
 */
exports.ownerOrAdmin = (getOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
        }

        // Admin has full access
        if (req.user.userType === USER_TYPES.ADMIN) {
            return next();
        }

        try {
            const ownerId = await getOwnerId(req);

            if (req.user._id.toString() !== ownerId.toString()) {
                return next(new AppError('You do not have permission to access this resource.', HTTP_STATUS.FORBIDDEN));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if user has any of the allowed permissions
 * @param {...string} allowedPermissions - Permissions required
 * @returns {Function} Middleware function
 */
exports.hasPermission = (...allowedPermissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
        }

        // Admin has all permissions
        if (req.user.userType === USER_TYPES.ADMIN) {
            return next();
        }

        // Get user permissions (you would fetch from database)
        const userPermissions = req.user.permissions || [];

        const hasRequiredPermission = allowedPermissions.some(permission =>
            userPermissions.includes(permission)
        );

        if (!hasRequiredPermission) {
            return next(new AppError('You do not have the required permissions.', HTTP_STATUS.FORBIDDEN));
        }

        next();
    };
};

/**
 * Combined middleware for resource access
 * Checks if user is resource owner or has specific role
 * @param {Function} getOwnerId - Function that returns the owner ID
 * @param {...string} allowedRoles - Roles that can access
 * @returns {Function} Middleware function
 */
exports.ownerOrRole = (getOwnerId, ...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next(new AppError('You are not logged in.', HTTP_STATUS.UNAUTHORIZED));
        }

        // Check if user has allowed role
        if (allowedRoles.includes(req.user.userType)) {
            return next();
        }

        // Check if user is owner
        try {
            const ownerId = await getOwnerId(req);

            if (req.user._id.toString() === ownerId.toString()) {
                return next();
            }

            return next(new AppError('You do not have permission to access this resource.', HTTP_STATUS.FORBIDDEN));
        } catch (error) {
            next(error);
        }
    };
};

module.exports = exports;