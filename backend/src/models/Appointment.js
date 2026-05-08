const mongoose = require('mongoose');

/**
 * Appointment Schema - For scheduling consultations
 * Links clients with lawyers or volunteers
 */
const appointmentSchema = new mongoose.Schema({
    // Unique appointment ID for reference
    appointmentId: {
        type: String,
        unique: true,
        default: function () {
            return 'APPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        }
    },

    // Participants
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Client ID is required']
    },

    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function (v) {
                // Either lawyerId or volunteerId must be present
                return v || this.volunteerId;
            },
            message: 'Either lawyer or volunteer must be assigned'
        }
    },

    volunteerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function (v) {
                // Either lawyerId or volunteerId must be present
                return v || this.lawyerId;
            },
            message: 'Either lawyer or volunteer must be assigned'
        }
    },

    // Appointment details
    appointmentType: {
        type: String,
        enum: {
            values: ['CONSULTATION', 'REPRESENTATION', 'ADVISORY'],
            message: '{VALUE} is not a valid appointment type'
        },
        required: [true, 'Appointment type is required']
    },

    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },

    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    caseType: {
        type: String,
        enum: [
            'FAMILY_LAW', 'CRIMINAL_LAW', 'CIVIL_LAW', 'COMMERCIAL_LAW',
            'LABOR_LAW', 'PROPERTY_LAW', 'CONTRACT_LAW', 'HUMAN_RIGHTS',
            'OTHER'
        ]
    },

    // Scheduling
    date: {
        type: Date,
        required: [true, 'Date is required'],
        validate: {
            validator: function (v) {
                return v >= new Date(new Date().setHours(0, 0, 0, 0));
            },
            message: 'Date cannot be in the past'
        }
    },

    startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time in HH:MM format']
    },

    endTime: {
        type: String,
        required: [true, 'End time is required'],
        validate: {
            validator: function (v) {
                // Validate that end time is after start time
                const start = this.startTime.split(':').map(Number);
                const end = v.split(':').map(Number);
                const startMinutes = start[0] * 60 + start[1];
                const endMinutes = end[0] * 60 + end[1];
                return endMinutes > startMinutes;
            },
            message: 'End time must be after start time'
        }
    },

    duration: {
        type: Number, // in minutes
        default: function () {
            if (this.startTime && this.endTime) {
                const start = this.startTime.split(':').map(Number);
                const end = this.endTime.split(':').map(Number);
                return (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
            }
            return 60;
        }
    },

    // Status tracking
    status: {
        type: String,
        enum: {
            values: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
            message: '{VALUE} is not a valid status'
        },
        default: 'SCHEDULED'
    },

    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default: 'MEDIUM'
    },

    // Location/meeting details
    location: {
        type: {
            type: String,
            enum: ['IN_PERSON', 'PHONE', 'VIDEO_CALL'],
            default: 'PHONE'
        },
        address: String,
        meetingLink: String,
        phoneNumber: String,
        notes: String
    },

    // Reminders
    reminders: [{
        type: {
            type: String,
            enum: ['EMAIL', 'SMS'],
            required: true
        },
        scheduledFor: Date,
        sentAt: Date,
        status: {
            type: String,
            enum: ['PENDING', 'SENT', 'FAILED'],
            default: 'PENDING'
        }
    }],

    // Documents related to this appointment
    documents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],

    // Cancellation details
    cancellationReason: String,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date,

    // Rescheduling details
    rescheduledFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },

    rescheduledTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },

    // Feedback
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        providedAt: Date,
        isPublic: {
            type: Boolean,
            default: false
        }
    },

    // Notes (internal)
    notes: String,

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware
appointmentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save middleware to set reminders
appointmentSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('date') || this.isModified('startTime')) {
        // Create reminders (24 hours and 2 hours before)
        const appointmentDate = new Date(this.date);
        const [hours, minutes] = this.startTime.split(':');
        appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0);

        const reminder24h = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
        const reminder2h = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);

        this.reminders = [
            {
                type: 'EMAIL',
                scheduledFor: reminder24h,
                status: 'PENDING'
            },
            {
                type: 'SMS',
                scheduledFor: reminder2h,
                status: 'PENDING'
            }
        ];
    }
    next();
});

// Instance method to confirm appointment
appointmentSchema.methods.confirm = function (userId) {
    this.status = 'CONFIRMED';
    this.updatedAt = Date.now();
    return this.save();
};

// Instance method to cancel appointment
appointmentSchema.methods.cancel = function (reason, userId) {
    this.status = 'CANCELLED';
    this.cancellationReason = reason;
    this.cancelledBy = userId;
    this.cancelledAt = Date.now();
    this.updatedAt = Date.now();
    return this.save();
};

// Instance method to reschedule appointment
appointmentSchema.methods.reschedule = function (newDate, newStartTime, newEndTime, userId) {
    // Create new appointment
    const Appointment = mongoose.model('Appointment');
    const newAppointment = new Appointment({
        ...this.toObject(),
        _id: new mongoose.Types.ObjectId(),
        appointmentId: undefined, // Generate new ID
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'SCHEDULED',
        rescheduledFrom: this._id,
        createdBy: userId
    });

    // Update current appointment
    this.status = 'RESCHEDULED';
    this.rescheduledTo = newAppointment._id;
    this.updatedAt = Date.now();

    return Promise.all([this.save(), newAppointment.save()]);
};

// Instance method to add feedback
appointmentSchema.methods.addFeedback = function (rating, comment, isPublic = false) {
    this.feedback = {
        rating,
        comment,
        providedAt: Date.now(),
        isPublic
    };
    this.updatedAt = Date.now();
    return this.save();
};

// Static method to find upcoming appointments for a user
appointmentSchema.statics.findUpcoming = function (userId, role) {
    const query = {
        date: { $gte: new Date() },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    };

    if (role === 'client') query.clientId = userId;
    else if (role === 'lawyer') query.lawyerId = userId;
    else if (role === 'volunteer') query.volunteerId = userId;

    return this.find(query)
        .populate('clientId', 'fullName email phone')
        .populate('lawyerId', 'fullName')
        .populate('volunteerId', 'fullName')
        .sort({ date: 1, startTime: 1 });
};

// Static method to get appointments that need reminders
appointmentSchema.statics.getPendingReminders = function () {
    const now = new Date();
    return this.find({
        'reminders': {
            $elemMatch: {
                scheduledFor: { $lte: now },
                status: 'PENDING'
            }
        },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    }).populate('clientId', 'fullName email phone notificationPreferences');
};

// Indexes for performance

appointmentSchema.index({ clientId: 1, date: -1 });
appointmentSchema.index({ lawyerId: 1, date: -1 });
appointmentSchema.index({ volunteerId: 1, date: -1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ 'reminders.scheduledFor': 1, 'reminders.status': 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
