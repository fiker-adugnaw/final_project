const mongoose = require('mongoose');

/**
 * System Log Schema - Audit trail for all critical actions
 */
const systemLogSchema = new mongoose.Schema({
    logId: {
        type: String,
        unique: true,
        default: function () {
            return 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    },

    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    userEmail: String,

    userType: String,

    // Action details
    action: {
        type: String,
        required: true,
        index: true
    },

    module: {
        type: String,
        enum: {
            values: [
                'AUTH', 'USER', 'LAWYER', 'CLIENT', 'VOLUNTEER',
                'APPOINTMENT', 'DOCUMENT', 'AI', 'FORUM', 'NOTIFICATION',
                'ADMIN', 'SYSTEM'
            ],
            message: '{VALUE} is not a valid module'
        },
        required: true,
        index: true
    },

    description: String,

    // Data snapshot
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    beforeData: mongoose.Schema.Types.Mixed,
    afterData: mongoose.Schema.Types.Mixed,

    // Resource identifiers
    resourceId: String,
    resourceType: String,

    // Request information
    ipAddress: String,
    userAgent: String,
    method: String,
    url: String,

    // Response information
    statusCode: Number,
    responseTime: Number, // in milliseconds

    // Error tracking
    error: {
        name: String,
        message: String,
        stack: String
    },

    // Severity
    severity: {
        type: String,
        enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default: 'INFO',
        index: true
    },

    // Session information
    sessionId: String,

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Static method to log an action
systemLogSchema.statics.log = function (data) {
    return this.create({
        ...data,
        timestamp: new Date()
    });
};

// Static method to log user action
systemLogSchema.statics.logUserAction = async function (user, action, module, details = {}) {
    return this.create({
        userId: user._id,
        userEmail: user.email,
        userType: user.userType,
        action,
        module,
        details,
        severity: 'INFO',
        timestamp: new Date()
    });
};

// Static method to log error
systemLogSchema.statics.logError = function (error, req = null, userId = null) {
    const logData = {
        action: 'ERROR',
        module: 'SYSTEM',
        severity: 'ERROR',
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        timestamp: new Date()
    };

    if (userId) logData.userId = userId;

    if (req) {
        logData.ipAddress = req.ip;
        logData.userAgent = req.get('User-Agent');
        logData.method = req.method;
        logData.url = req.originalUrl;
    }

    return this.create(logData);
};

// Static method to get audit trail for a resource
systemLogSchema.statics.getAuditTrail = function (resourceId, resourceType) {
    return this.find({
        resourceId,
        resourceType
    })
        .sort({ timestamp: -1 })
        .populate('userId', 'email fullName');
};

// Static method to get logs by date range
systemLogSchema.statics.getByDateRange = function (startDate, endDate, module = null) {
    const query = {
        timestamp: {
            $gte: startDate,
            $lte: endDate
        }
    };

    if (module) query.module = module;

    return this.find(query).sort({ timestamp: -1 });
};

// Static method to get summary statistics
systemLogSchema.statics.getSummary = function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
            $group: {
                _id: {
                    module: '$module',
                    severity: '$severity'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.module': 1, '_id.severity': 1 } }
    ]);
};

// Indexes for performance

systemLogSchema.index({ userId: 1, timestamp: -1 });
systemLogSchema.index({ module: 1, timestamp: -1 });
systemLogSchema.index({ severity: 1, timestamp: -1 });

systemLogSchema.index({ resourceId: 1, resourceType: 1 });
systemLogSchema.index({ timestamp: -1 });

// TTL index for automatic cleanup (optional)
// systemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

module.exports = SystemLog;
