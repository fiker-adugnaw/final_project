const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Core user authentication and basic info
 * This is the base schema that all other profiles reference
 */
const userSchema = new mongoose.Schema({
    // Core identification fields
    username: {
        type: String,
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },

    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [
            /^\+?[0-9]{10,15}$/,
            'Please provide a valid phone number (10-15 digits, optional + prefix)'
        ]
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false, // Don't return password by default
        validate: {
            validator: function (v) {
                // Password must contain at least one uppercase, one lowercase, one number
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        }
    },

    // User type determines role and permissions
    userType: {
        type: String,
        enum: {
            values: ['CLIENT', 'LAWYER', 'VOLUNTEER_ADVISOR', 'VOLUNTEER_REPRESENTATIVE', 'PRO_BONO', 'ADMIN'],
            message: '{VALUE} is not a valid user type'
        },
        required: [true, 'User type is required']
    },

    // Basic profile information
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },

    profilePicture: {
        type: String,
        default: 'default-avatar.png'
    },

    // Location information
    region: {
        type: String,
        trim: true
    },

    city: {
        type: String,
        trim: true
    },

    subCity: {
        type: String,
        trim: true
    },

    woreda: {
        type: String,
        trim: true
    },

    kebele: {
        type: String,
        trim: true
    },

    // Preferences
    languagePreference: {
        type: String,
        enum: {
            values: ['Amharic', 'English'],
            message: '{VALUE} is not a valid language'
        },
        default: 'Amharic'
    },

    // Account status
    isVerified: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    registrationStatus: {
        type: String,
        enum: ['PENDING_VERIFICATION', 'PENDING_PROFILE', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'],
        default: 'PENDING_VERIFICATION'
    },

    rejectionReason: {
        type: String,
        default: null
    },

    // Verification tokens
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    phoneVerificationCode: String,
    phoneVerificationExpires: Date,

    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Security
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },

    twoFactorSecret: {
        type: String,
        select: false
    },

    loginAttempts: {
        type: Number,
        default: 0
    },

    lockUntil: {
        type: Date,
        default: null
    },

    lastLogin: {
        type: Date,
        default: null
    },

    lastLoginIP: String,

    // Notification preferences
    notificationPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: false }
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Enable virtuals for populated fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for profile (populated based on userType)
userSchema.virtual('profile', {
    ref: function () {
        switch (this.userType) {
            case 'LAWYER': return 'Lawyer';
            case 'CLIENT': return 'Client';
            case 'VOLUNTEER_ADVISOR':
            case 'VOLUNTEER_REPRESENTATIVE': return 'Volunteer';
            default: return null;
        }
    },
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function () {
    // Only hash if password is modified
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
});

// Pre-save middleware to set username from email if not provided
userSchema.pre('save', async function () {
    if (!this.username && this.email) {
        const prefix = this.email.split('@')[0];
        const suffix = Math.floor(Math.random() * 10000);
        this.username = `${prefix}_${suffix}`;
    }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

// Instance method to generate email verification token
userSchema.methods.createEmailVerificationToken = function () {
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
};

// Instance method to generate phone verification code (6 digits)
userSchema.methods.createPhoneVerificationCode = function () {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    this.phoneVerificationCode = code;
    this.phoneVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return code;
};

// Instance method to handle failed login attempts
userSchema.methods.incLoginAttempts = function () {
    this.loginAttempts += 1;

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts >= 5) {
        this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }

    return this.save();
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function (ip) {
    this.lastLogin = Date.now();
    this.lastLoginIP = ip;
    return this.save();
};

// Static method to find by email with password
userSchema.statics.findByEmailWithPassword = function (email) {
    return this.findOne({ email }).select('+password');
};

// Static method to check if email exists
userSchema.statics.emailExists = async function (email) {
    const user = await this.findOne({ email });
    return !!user;
};

// Static method to check if phone exists
userSchema.statics.phoneExists = async function (phone) {
    const user = await this.findOne({ phone });
    return !!user;
};

// Static method to get users by type
userSchema.statics.findByType = function (userType, limit = 50, skip = 0) {
    return this.find({ userType, isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Indexes for performance



userSchema.index({ userType: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
