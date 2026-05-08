const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles all email communications for the AI Legal Assistance Platform
 * Supports both English and Amharic content
 */

// Create reusable transporter
let transporter = null;

const createTransporter = () => {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    return transporter;
};

// ─── Base HTML Template ────────────────────────────────────────────────────────
const baseTemplate = (content, title = 'AI Legal Assistance Platform') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a3c6e 0%, #2563eb 100%); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .header p { color: #bfdbfe; margin: 8px 0 0; font-size: 13px; }
        .body { padding: 35px 40px; color: #374151; line-height: 1.7; }
        .body h2 { color: #1a3c6e; margin-top: 0; font-size: 20px; }
        .btn { display: inline-block; padding: 14px 30px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
        .info-box { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .info-box p { margin: 5px 0; font-size: 14px; }
        .footer { background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-error { background: #fee2e2; color: #991b1b; }
        .divider { border: none; border-top: 1px solid #e5e7eb; margin: 25px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1a3c6e; text-align: center; padding: 20px; background: #f0f4ff; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚖️ AI Legal Assistance Platform</h1>
            <p>Ethiopian Legal Aid System | Ethiopian Law | ስርዓተ ህግ</p>
        </div>
        <div class="body">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} AI Legal Assistance Platform — Ethiopia</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
            <p style="color:#9ca3af; font-size:11px;">If you did not request this email, please ignore it or contact support.</p>
        </div>
    </div>
</body>
</html>
`;

// ─── Core Send Function ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
    try {
        const transport = createTransporter();

        const mailOptions = {
            from: `"AI Legal Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            text: text || '',
            attachments
        };

        const info = await transport.sendMail(mailOptions);

        console.log(`[EmailService] Email sent to ${to} | MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
        // Do not throw — email failures should not crash the platform
        return { success: false, error: error.message };
    }
};

// ─── Welcome Email ─────────────────────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
    const content = `
        <h2>Welcome to AI Legal Assistance Platform! 🎉</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>Thank you for joining Ethiopia's premier AI-powered legal assistance platform. Your account has been successfully created.</p>
        <div class="info-box">
            <p><strong>Account Type:</strong> ${user.userType}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Registered:</strong> ${new Date().toLocaleDateString('en-ET')}</p>
        </div>
        <p>You can now access:</p>
        <ul>
            <li>🤖 AI-powered legal Q&A in English and Amharic</li>
            <li>👨‍⚖️ Verified Lawyer Directory</li>
            <li>📅 Appointment Scheduling</li>
            <li>📁 Secure Document Management</li>
            <li>💬 Community Legal Forum</li>
        </ul>
        <p style="text-align:center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Get Started →</a>
        </p>
        <hr class="divider"/>
        <p style="font-size:13px; color:#6b7280;">
            <strong>Disclaimer:</strong> The AI assistant provides general legal information only and does not constitute legal advice.
            For specific legal advice, please consult a verified lawyer on our platform.
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: '🎉 Welcome to AI Legal Assistance Platform',
        html: baseTemplate(content, 'Welcome'),
        text: `Welcome ${user.fullName || user.email}! Your account on AI Legal Assistance Platform has been created.`
    });
};

// ─── Email Verification ────────────────────────────────────────────────────────
const sendVerificationEmail = async (user, token) => {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const content = `
        <h2>Verify Your Email Address</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>Please verify your email address to activate all features of your account.</p>
        <p style="text-align:center;">
            <a href="${verifyUrl}" class="btn">✅ Verify Email</a>
        </p>
        <div class="info-box">
            <p>⏳ This link expires in <strong>24 hours</strong>.</p>
            <p>If the button doesn't work, copy and paste this link:</p>
            <p style="word-break:break-all; color:#2563eb;">${verifyUrl}</p>
        </div>
    `;

    return sendEmail({
        to: user.email,
        subject: '✅ Verify your email — AI Legal Platform',
        html: baseTemplate(content, 'Email Verification'),
        text: `Please verify your email: ${verifyUrl}`
    });
};

// ─── OTP / Two-Factor Authentication ──────────────────────────────────────────
const sendOTPEmail = async (user, otp) => {
    const content = `
        <h2>Your One-Time Password (OTP)</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>Use the following OTP to complete your login:</p>
        <div class="otp-code">${otp}</div>
        <div class="info-box">
            <p>⏳ This OTP expires in <strong>10 minutes</strong>.</p>
            <p>⚠️ Do NOT share this code with anyone, including platform staff.</p>
        </div>
        <p>If you did not request this OTP, please immediately change your password.</p>
    `;

    return sendEmail({
        to: user.email,
        subject: `🔐 Your OTP Code: ${otp} — AI Legal Platform`,
        html: baseTemplate(content, 'OTP Verification'),
        text: `Your OTP is: ${otp}. It expires in 10 minutes.`
    });
};

// ─── Password Reset ────────────────────────────────────────────────────────────
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const content = `
        <h2>Password Reset Request</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="text-align:center;">
            <a href="${resetUrl}" class="btn">🔑 Reset Password</a>
        </p>
        <div class="info-box">
            <p>⏳ This link expires in <strong>1 hour</strong>.</p>
            <p>If you did not make this request, ignore this email — your password will remain unchanged.</p>
        </div>
        <p>For security, if you did not initiate this request, please contact our support team immediately.</p>
    `;

    return sendEmail({
        to: user.email,
        subject: '🔑 Password Reset Request — AI Legal Platform',
        html: baseTemplate(content, 'Password Reset'),
        text: `Reset your password: ${resetUrl}. This link expires in 1 hour.`
    });
};

// ─── Password Changed Confirmation ────────────────────────────────────────────
const sendPasswordChangedEmail = async (user) => {
    const content = `
        <h2>Password Changed Successfully</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>Your password was successfully changed on <strong>${new Date().toLocaleString('en-ET')}</strong>.</p>
        <div class="info-box">
            <p>⚠️ If you did not make this change, contact support immediately!</p>
        </div>
        <p style="text-align:center;">
            <a href="${process.env.FRONTEND_URL}/support" class="btn">Contact Support</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: '🔒 Your password was changed — AI Legal Platform',
        html: baseTemplate(content, 'Password Changed'),
        text: `Your password was changed. If you did not do this, contact support.`
    });
};

// ─── Appointment Confirmation ──────────────────────────────────────────────────
const sendAppointmentConfirmation = async (user, appointment, lawyer) => {
    const content = `
        <h2>Appointment Confirmed ✅</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>Your legal consultation appointment has been confirmed.</p>
        <div class="info-box">
            <p><strong>📅 Date:</strong> ${new Date(appointment.scheduledDate).toLocaleDateString('en-ET')}</p>
            <p><strong>🕐 Time:</strong> ${new Date(appointment.scheduledDate).toLocaleTimeString('en-ET')}</p>
            <p><strong>👨‍⚖️ Lawyer:</strong> ${lawyer.userId?.fullName || 'Assigned Lawyer'}</p>
            <p><strong>📋 Type:</strong> ${appointment.appointmentType}</p>
            <p><strong>🆔 Booking ID:</strong> ${appointment.appointmentId}</p>
            ${appointment.meetingLink ? `<p><strong>🔗 Meeting Link:</strong> <a href="${appointment.meetingLink}">${appointment.meetingLink}</a></p>` : ''}
        </div>
        <p style="text-align:center;">
            <a href="${process.env.FRONTEND_URL}/appointments/${appointment._id}" class="btn">View Appointment</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: `📅 Appointment Confirmed — ${new Date(appointment.scheduledDate).toLocaleDateString('en-ET')}`,
        html: baseTemplate(content, 'Appointment Confirmed'),
        text: `Your appointment with ${lawyer.userId?.fullName} on ${new Date(appointment.scheduledDate).toLocaleDateString()} has been confirmed.`
    });
};

// ─── Appointment Reminder ──────────────────────────────────────────────────────
const sendAppointmentReminder = async (user, appointment, lawyer, hoursLeft) => {
    const content = `
        <h2>⏰ Appointment Reminder</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        <p>You have an upcoming legal consultation in <strong>${hoursLeft} hour(s)</strong>.</p>
        <div class="info-box">
            <p><strong>📅 Date:</strong> ${new Date(appointment.scheduledDate).toLocaleDateString('en-ET')}</p>
            <p><strong>🕐 Time:</strong> ${new Date(appointment.scheduledDate).toLocaleTimeString('en-ET')}</p>
            <p><strong>👨‍⚖️ Lawyer:</strong> ${lawyer.userId?.fullName || 'Your Lawyer'}</p>
            ${appointment.meetingLink ? `<p><strong>🔗 Join Link:</strong> <a href="${appointment.meetingLink}">Click to Join</a></p>` : ''}
        </div>
        <p style="text-align:center;">
            <a href="${process.env.FRONTEND_URL}/appointments/${appointment._id}" class="btn">View Details</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: `⏰ Reminder: Your appointment in ${hoursLeft}h — AI Legal Platform`,
        html: baseTemplate(content, 'Appointment Reminder'),
        text: `Reminder: Your appointment is in ${hoursLeft} hours.`
    });
};

// ─── Lawyer Verification Result ────────────────────────────────────────────────
const sendLawyerVerificationResult = async (user, status, notes = '') => {
    const isApproved = status === 'APPROVED';

    const content = `
        <h2>Lawyer Verification ${isApproved ? 'Approved ✅' : 'Update 📋'}</h2>
        <p>Dear <strong>${user.fullName || user.email}</strong>,</p>
        ${isApproved
            ? `<p>Congratulations! Your lawyer profile has been <span class="badge badge-success">APPROVED</span>. You can now accept client appointments and appear in the lawyer directory.</p>`
            : `<p>Your lawyer verification status is: <span class="badge badge-warning">${status}</span>.</p>`
        }
        ${notes ? `<div class="info-box"><p><strong>Admin Notes:</strong> ${notes}</p></div>` : ''}
        <p style="text-align:center;">
            <a href="${process.env.FRONTEND_URL}/profile" class="btn">View Profile</a>
        </p>
    `;

    return sendEmail({
        to: user.email,
        subject: `⚖️ Lawyer Verification ${isApproved ? 'Approved' : 'Update'} — AI Legal Platform`,
        html: baseTemplate(content, 'Verification Result'),
        text: `Your lawyer verification status: ${status}. ${notes}`
    });
};

// ─── Document Shared ───────────────────────────────────────────────────────────
const sendDocumentSharedEmail = async (recipient, sharer, document) => {
    const content = `
        <h2>📄 Document Shared With You</h2>
        <p>Dear <strong>${recipient.fullName || recipient.email}</strong>,</p>
        <p><strong>${sharer.fullName || sharer.email}</strong> has shared a legal document with you.</p>
        <div class="info-box">
            <p><strong>📄 Document:</strong> ${document.fileName}</p>
            <p><strong>📂 Type:</strong> ${document.documentType}</p>
            <p><strong>📏 Size:</strong> ${(document.fileSize / 1024).toFixed(1)} KB</p>
        </div>
        <p style="text-align:center;">
            <a href="${process.env.FRONTEND_URL}/documents/${document._id}" class="btn">View Document</a>
        </p>
    `;

    return sendEmail({
        to: recipient.email,
        subject: `📄 Document shared: "${document.fileName}" — AI Legal Platform`,
        html: baseTemplate(content, 'Document Shared'),
        text: `${sharer.fullName} shared "${document.fileName}" with you.`
    });
};

// ─── Admin Notification ────────────────────────────────────────────────────────
const sendAdminNotification = async (subject, message, data = {}) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return { success: false, error: 'No admin email configured' };

    const rows = Object.entries(data)
        .map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`)
        .join('');

    const content = `
        <h2>🔔 Admin Notification</h2>
        <p>${message}</p>
        ${rows ? `<div class="info-box">${rows}</div>` : ''}
        <p><em>Timestamp: ${new Date().toISOString()}</em></p>
    `;

    return sendEmail({
        to: adminEmail,
        subject: `[Admin] ${subject}`,
        html: baseTemplate(content, 'Admin Notification'),
        text: `${subject}\n${message}\n${JSON.stringify(data)}`
    });
};

// ─── Test Connection ───────────────────────────────────────────────────────────
const verifyEmailConnection = async () => {
    try {
        const transport = createTransporter();
        await transport.verify();
        console.log('[EmailService] SMTP server is ready');
        return true;
    } catch (error) {
        console.error('[EmailService] SMTP verification failed:', error.message);
        return false;
    }
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendVerificationEmail,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendAppointmentConfirmation,
    sendAppointmentReminder,
    sendLawyerVerificationResult,
    sendDocumentSharedEmail,
    sendAdminNotification,
    verifyEmailConnection
};
