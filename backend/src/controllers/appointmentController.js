/**
 * Appointment Controller
 * Handles appointment scheduling, management, reminders, and feedback
 */

const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Volunteer = require('../models/Volunteer');
const Notification = require('../models/Notification');
const SystemLog = require('../models/SystemLog');
const { APPOINTMENT_STATUS, APPOINTMENT_TYPES, HTTP_STATUS } = require('../config/constants');
const { sendSMS } = require('../services/smsService');
const { sendEmail } = require('../services/emailService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get all appointments for current user
 * @route GET /api/appointments
 * @access Private
 */
exports.getAppointments = catchAsync(async (req, res, next) => {
    const { status, type, page = 1, limit = 20 } = req.query;

    // Build query based on user role
    let query = {};

    if (req.user.userType === 'CLIENT') {
        query.clientId = req.user._id;
    } else if (req.user.userType === 'LAWYER') {
        query.lawyerId = req.user._id;
    } else if (req.user.userType === 'VOLUNTEER_ADVISOR' || req.user.userType === 'VOLUNTEER_REPRESENTATIVE') {
        query.volunteerId = req.user._id;
    }

    if (status) {
        query.status = status;
    }

    if (type) {
        query.appointmentType = type;
    }

    const appointments = await Appointment.find(query)
        .populate('clientId', 'fullName email phone')
        .populate('lawyerId', 'fullName')
        .populate('volunteerId', 'fullName')
        .sort({ date: -1, startTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            appointments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get upcoming appointments
 * @route GET /api/appointments/upcoming
 * @access Private
 */
exports.getUpcomingAppointments = catchAsync(async (req, res, next) => {
    let query = {
        date: { $gte: new Date() },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    };

    if (req.user.userType === 'CLIENT') {
        query.clientId = req.user._id;
    } else if (req.user.userType === 'LAWYER') {
        query.lawyerId = req.user._id;
    } else if (req.user.userType === 'VOLUNTEER_ADVISOR' || req.user.userType === 'VOLUNTEER_REPRESENTATIVE') {
        query.volunteerId = req.user._id;
    }

    const appointments = await Appointment.find(query)
        .populate('clientId', 'fullName email phone')
        .populate('lawyerId', 'fullName')
        .populate('volunteerId', 'fullName')
        .sort({ date: 1, startTime: 1 })
        .limit(10);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { appointments }
    });
});

/**
 * Get appointment by ID
 * @route GET /api/appointments/:id
 * @access Private
 */
exports.getAppointmentById = catchAsync(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('clientId', 'fullName email phone')
        .populate('lawyerId', 'fullName email phone')
        .populate('volunteerId', 'fullName email phone')
        .populate('documents');

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check authorization
    const isAuthorized =
        appointment.clientId._id.toString() === req.user._id.toString() ||
        (appointment.lawyerId && appointment.lawyerId._id.toString() === req.user._id.toString()) ||
        (appointment.volunteerId && appointment.volunteerId._id.toString() === req.user._id.toString()) ||
        req.user.userType === 'ADMIN';

    if (!isAuthorized) {
        return next(new AppError('You are not authorized to view this appointment', HTTP_STATUS.FORBIDDEN));
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { appointment }
    });
});

/**
 * Create new appointment
 * @route POST /api/appointments
 * @access Private
 */
exports.createAppointment = catchAsync(async (req, res, next) => {
    const {
        lawyerId,
        volunteerId,
        appointmentType,
        title,
        description,
        caseType,
        date,
        startTime,
        endTime,
        location
    } = req.body;

    // Validate appointment type
    if (!lawyerId && !volunteerId) {
        return next(new AppError('Either lawyer or volunteer must be specified', HTTP_STATUS.BAD_REQUEST));
    }

    // Check availability
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (lawyerId) {
        const lawyer = await Lawyer.findOne({ userId: lawyerId });
        if (!lawyer) {
            return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
        }

        // Check lawyer availability
        const isAvailable = await lawyer.isAvailable(date, startTime);
        if (!isAvailable) {
            return next(new AppError('Lawyer is not available at this time', HTTP_STATUS.CONFLICT));
        }
    }

    if (volunteerId) {
        const volunteer = await Volunteer.findOne({ userId: volunteerId });
        if (!volunteer) {
            return next(new AppError('Volunteer not found', HTTP_STATUS.NOT_FOUND));
        }

        // Check volunteer availability
        const isAvailable = await volunteer.isAvailable(date, startTime);
        if (!isAvailable) {
            return next(new AppError('Volunteer is not available at this time', HTTP_STATUS.CONFLICT));
        }
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
        $or: [
            { lawyerId, date, startTime },
            { volunteerId, date, startTime }
        ],
        status: { $in: ['SCHEDULED', 'CONFIRMED'] }
    });

    if (conflictingAppointment) {
        return next(new AppError('Time slot is already booked', HTTP_STATUS.CONFLICT));
    }

    // Create appointment
    const appointment = await Appointment.create({
        clientId: req.user._id,
        lawyerId,
        volunteerId,
        appointmentType,
        title,
        description,
        caseType,
        date,
        startTime,
        endTime,
        location,
        createdBy: req.user._id
    });

    // Create notifications
    const recipientId = lawyerId || volunteerId;
    await Notification.create({
        userId: recipientId,
        type: 'APPOINTMENT_SCHEDULED',
        title: 'New Appointment Scheduled',
        message: `You have a new ${appointmentType.toLowerCase()} appointment on ${date} at ${startTime}`,
        data: { appointmentId: appointment._id },
        priority: 'HIGH'
    });

    // Log creation
    await SystemLog.log({
        userId: req.user._id,
        action: 'APPOINTMENT_CREATED',
        module: 'APPOINTMENT',
        severity: 'INFO',
        details: { appointmentId: appointment._id, appointmentType }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Appointment created successfully',
        data: { appointment }
    });
});

/**
 * Update appointment
 * @route PATCH /api/appointments/:id
 * @access Private
 */
exports.updateAppointment = catchAsync(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check authorization
    const isAuthorized =
        appointment.clientId.toString() === req.user._id.toString() ||
        (appointment.lawyerId && appointment.lawyerId.toString() === req.user._id.toString()) ||
        (appointment.volunteerId && appointment.volunteerId.toString() === req.user._id.toString());

    if (!isAuthorized) {
        return next(new AppError('You are not authorized to update this appointment', HTTP_STATUS.FORBIDDEN));
    }

    // Only allow updates to certain fields
    const allowedFields = ['title', 'description', 'location'];
    const updateData = {};

    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    const updatedAppointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    // Log update
    await SystemLog.log({
        userId: req.user._id,
        action: 'APPOINTMENT_UPDATED',
        module: 'APPOINTMENT',
        severity: 'INFO',
        details: { appointmentId: appointment._id }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Appointment updated successfully',
        data: { appointment: updatedAppointment }
    });
});

/**
 * Cancel appointment
 * @route DELETE /api/appointments/:id
 * @access Private
 */
exports.cancelAppointment = catchAsync(async (req, res, next) => {
    const { reason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check authorization
    const isAuthorized =
        appointment.clientId.toString() === req.user._id.toString() ||
        (appointment.lawyerId && appointment.lawyerId.toString() === req.user._id.toString()) ||
        (appointment.volunteerId && appointment.volunteerId.toString() === req.user._id.toString());

    if (!isAuthorized) {
        return next(new AppError('You are not authorized to cancel this appointment', HTTP_STATUS.FORBIDDEN));
    }

    // Check if appointment is too close to cancel
    const appointmentTime = new Date(appointment.date);
    appointmentTime.setHours(
        parseInt(appointment.startTime.split(':')[0]),
        parseInt(appointment.startTime.split(':')[1])
    );

    const hoursUntilAppointment = (appointmentTime - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 2) {
        return next(new AppError('Appointments cannot be cancelled less than 2 hours before start time', HTTP_STATUS.BAD_REQUEST));
    }

    await appointment.cancel(reason, req.user._id);

    // Notify other party
    const otherPartyId = appointment.lawyerId || appointment.volunteerId;
    if (otherPartyId) {
        await Notification.create({
            userId: otherPartyId,
            type: 'APPOINTMENT_CANCELLED',
            title: 'Appointment Cancelled',
            message: `An appointment has been cancelled: ${reason || 'No reason provided'}`,
            data: { appointmentId: appointment._id }
        });
    }

    // Log cancellation
    await SystemLog.log({
        userId: req.user._id,
        action: 'APPOINTMENT_CANCELLED',
        module: 'APPOINTMENT',
        severity: 'INFO',
        details: { appointmentId: appointment._id, reason }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Appointment cancelled successfully'
    });
});

/**
 * Confirm appointment
 * @route POST /api/appointments/:id/confirm
 * @access Private (Lawyer/Volunteer only)
 */
exports.confirmAppointment = catchAsync(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check authorization (only lawyer/volunteer can confirm)
    const isAuthorized =
        (appointment.lawyerId && appointment.lawyerId.toString() === req.user._id.toString()) ||
        (appointment.volunteerId && appointment.volunteerId.toString() === req.user._id.toString());

    if (!isAuthorized) {
        return next(new AppError('Only the service provider can confirm appointments', HTTP_STATUS.FORBIDDEN));
    }

    await appointment.confirm(req.user._id);

    // Notify client
    await Notification.create({
        userId: appointment.clientId,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Appointment Confirmed',
        message: `Your appointment has been confirmed for ${appointment.date} at ${appointment.startTime}`,
        data: { appointmentId: appointment._id }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Appointment confirmed successfully'
    });
});

/**
 * Reschedule appointment
 * @route POST /api/appointments/:id/reschedule
 * @access Private
 */
exports.rescheduleAppointment = catchAsync(async (req, res, next) => {
    const { date, startTime, endTime } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check authorization
    const isAuthorized =
        appointment.clientId.toString() === req.user._id.toString() ||
        (appointment.lawyerId && appointment.lawyerId.toString() === req.user._id.toString()) ||
        (appointment.volunteerId && appointment.volunteerId.toString() === req.user._id.toString());

    if (!isAuthorized) {
        return next(new AppError('You are not authorized to reschedule this appointment', HTTP_STATUS.FORBIDDEN));
    }

    const [newAppointment] = await appointment.reschedule(date, startTime, endTime, req.user._id);

    // Notify other party
    const otherPartyId = appointment.clientId.toString() === req.user._id.toString()
        ? (appointment.lawyerId || appointment.volunteerId)
        : appointment.clientId;

    await Notification.create({
        userId: otherPartyId,
        type: 'APPOINTMENT_RESCHEDULED',
        title: 'Appointment Rescheduled',
        message: `Your appointment has been rescheduled to ${date} at ${startTime}`,
        data: { appointmentId: newAppointment._id }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Appointment rescheduled successfully',
        data: { appointment: newAppointment }
    });
});

/**
 * Add feedback to appointment
 * @route POST /api/appointments/:id/feedback
 * @access Private (Client only)
 */
exports.addFeedback = catchAsync(async (req, res, next) => {
    const { rating, comment, isPublic } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Only client can add feedback
    if (appointment.clientId.toString() !== req.user._id.toString()) {
        return next(new AppError('Only the client can provide feedback', HTTP_STATUS.FORBIDDEN));
    }

    // Check if appointment is completed
    if (appointment.status !== 'COMPLETED') {
        return next(new AppError('Feedback can only be added to completed appointments', HTTP_STATUS.BAD_REQUEST));
    }

    await appointment.addFeedback(rating, comment, isPublic);

    // Update lawyer/volunteer rating
    if (appointment.lawyerId) {
        const lawyer = await Lawyer.findOne({ userId: appointment.lawyerId });
        if (lawyer) {
            lawyer.reviews.push({
                clientId: req.user._id,
                rating,
                comment,
                appointmentId: appointment._id,
                isVerifiedPurchase: true
            });
            await lawyer.save();
        }
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Feedback submitted successfully'
    });
});

/**
 * Get available time slots
 * @route GET /api/appointments/available-slots
 * @access Public
 */
exports.getAvailableSlots = catchAsync(async (req, res, next) => {
    const { providerId, providerType, date } = req.query;

    if (!providerId || !providerType || !date) {
        return next(new AppError('Provider ID, type, and date are required', HTTP_STATUS.BAD_REQUEST));
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    let availableSlots = [];

    if (providerType === 'lawyer') {
        const lawyer = await Lawyer.findOne({ userId: providerId });
        if (!lawyer) {
            return next(new AppError('Lawyer not found', HTTP_STATUS.NOT_FOUND));
        }

        // Get schedule for that day
        const schedule = lawyer.workSchedule?.find(s => s.day === dayOfWeek);

        if (schedule && schedule.isAvailable) {
            // Generate time slots (assuming 1-hour slots)
            const start = schedule.startTime;
            const end = schedule.endTime;

            // Get booked appointments
            const bookedAppointments = await Appointment.find({
                lawyerId: providerId,
                date,
                status: { $in: ['SCHEDULED', 'CONFIRMED'] }
            }).select('startTime');

            const bookedTimes = bookedAppointments.map(a => a.startTime);

            // Generate slots
            const slots = [];
            let currentTime = start;

            while (currentTime < end) {
                if (!bookedTimes.includes(currentTime)) {
                    slots.push(currentTime);
                }

                // Increment by 1 hour
                const [hours, minutes] = currentTime.split(':').map(Number);
                const nextHour = hours + 1;
                currentTime = `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            availableSlots = slots;
        }
    }

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { availableSlots }
    });
});

/**
 * Send appointment reminder manually
 * @route POST /api/appointments/:id/reminder
 * @access Private
 */
exports.sendReminder = catchAsync(async (req, res, next) => {
    const appointment = await Appointment.findById(req.params.id)
        .populate('clientId', 'fullName email phone')
        .populate('lawyerId', 'fullName email phone')
        .populate('volunteerId', 'fullName email phone');

    if (!appointment) {
        return next(new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND));
    }

    // Send SMS reminder
    if (appointment.clientId.phone) {
        await sendSMS({
            to: appointment.clientId.phone,
            message: `Reminder: You have an appointment on ${appointment.date} at ${appointment.startTime}.`
        });
    }

    // Send email reminder
    if (appointment.clientId.email) {
        await sendEmail({
            to: appointment.clientId.email,
            subject: 'Appointment Reminder',
            template: 'appointment-reminder',
            context: {
                name: appointment.clientId.fullName,
                date: appointment.date,
                time: appointment.startTime,
                type: appointment.appointmentType
            }
        });
    }

    // Update reminder status
    appointment.reminders.push({
        type: 'SMS',
        sentAt: new Date(),
        status: 'SENT'
    });
    await appointment.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Reminder sent successfully'
    });
});

module.exports = exports;