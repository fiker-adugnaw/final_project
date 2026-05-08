/**
 * SMS Service
 * Handles all SMS communications for the AI Legal Assistance Platform
 * Primary provider: Africa's Talking (optimized for Ethiopian carriers)
 * Fallback provider: Twilio
 * Supports both English and Amharic (UTF-8) messages
 */

// ─── Provider Initialization ───────────────────────────────────────────────────

let africasTalkingClient = null;
let twilioClient = null;

/**
 * Initialize Africa's Talking client (preferred for Ethiopian carriers)
 */
const getAfricasTalkingClient = () => {
    if (africasTalkingClient) return africasTalkingClient;

    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
        console.warn("[SMSService] Africa's Talking credentials not configured.");
        return null;
    }

    try {
        const AfricasTalking = require('africastalking');
        const at = AfricasTalking({
            apiKey: process.env.AT_API_KEY,
            username: process.env.AT_USERNAME
        });
        africasTalkingClient = at.SMS;
        return africasTalkingClient;
    } catch (err) {
        console.warn("[SMSService] africastalking package not installed:", err.message);
        return null;
    }
};

/**
 * Initialize Twilio client (fallback)
 */
const getTwilioClient = () => {
    if (twilioClient) return twilioClient;

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return null;
    }

    try {
        const twilio = require('twilio');
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        return twilioClient;
    } catch (err) {
        console.warn("[SMSService] twilio package not installed:", err.message);
        return null;
    }
};

// ─── Phone Number Formatter ────────────────────────────────────────────────────

/**
 * Normalize phone number to international format for Ethiopian numbers.
 * Ethiopian numbers: 09XXXXXXXX → +2519XXXXXXXX
 *                    07XXXXXXXX → +2517XXXXXXXX
 */
const normalizePhoneNumber = (phone) => {
    if (!phone) return null;

    // Remove all spaces, dashes, parentheses
    let normalized = phone.replace(/[\s\-\(\)]/g, '');

    // Already in international format
    if (normalized.startsWith('+251')) return normalized;
    if (normalized.startsWith('251')) return `+${normalized}`;

    // Ethiopian local format
    if (normalized.startsWith('0')) {
        return `+251${normalized.substring(1)}`;
    }

    // Assume it's already international without the +
    if (normalized.length === 12 && normalized.startsWith('251')) {
        return `+${normalized}`;
    }

    return normalized;
};

// ─── Core Send Function ────────────────────────────────────────────────────────

/**
 * Send SMS via Africa's Talking
 */
const sendViaAfricasTalking = async (to, message) => {
    const sms = getAfricasTalkingClient();
    if (!sms) throw new Error("Africa's Talking not configured");

    const result = await sms.send({
        to: [to],
        message,
        from: process.env.AT_SENDER_ID || 'LegalAid'
    });

    const recipient = result.SMSMessageData?.Recipients?.[0];
    if (recipient && recipient.status === 'Success') {
        return { success: true, provider: 'africas_talking', messageId: recipient.messageId };
    }

    throw new Error(recipient?.status || "Africa's Talking send failed");
};

/**
 * Send SMS via Twilio (fallback)
 */
const sendViaTwilio = async (to, message) => {
    const client = getTwilioClient();
    if (!client) throw new Error('Twilio not configured');

    const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
    });

    return { success: true, provider: 'twilio', messageId: result.sid };
};

/**
 * Main SMS send function with fallback support
 */
const sendSMS = async (phone, message) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
        console.error('[SMSService] Invalid phone number provided.');
        return { success: false, error: 'Invalid phone number' };
    }

    // Skip in test/development if configured
    if (process.env.SMS_DISABLED === 'true') {
        console.log(`[SMSService] SMS DISABLED — Would send to ${normalizedPhone}: "${message}"`);
        return { success: true, skipped: true, provider: 'disabled' };
    }

    // Try Africa's Talking first (best for Ethiopian carriers)
    try {
        const result = await sendViaAfricasTalking(normalizedPhone, message);
        console.log(`[SMSService] Sent via AT to ${normalizedPhone} | MsgId: ${result.messageId}`);
        return result;
    } catch (atError) {
        console.warn(`[SMSService] Africa's Talking failed: ${atError.message}. Trying Twilio...`);
    }

    // Fallback to Twilio
    try {
        const result = await sendViaTwilio(normalizedPhone, message);
        console.log(`[SMSService] Sent via Twilio to ${normalizedPhone} | SID: ${result.messageId}`);
        return result;
    } catch (twilioError) {
        console.error(`[SMSService] All providers failed for ${normalizedPhone}: ${twilioError.message}`);
        return { success: false, error: twilioError.message };
    }
};

// ─── OTP SMS ───────────────────────────────────────────────────────────────────

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {string} language - 'Amharic' | 'English'
 */
const sendOTPSMS = async (phone, otp, language = 'English') => {
    const messages = {
        English: `Your AI Legal Platform verification code is: ${otp}. Valid for 10 minutes. Do NOT share this code.`,
        Amharic: `የ AI ህጋዊ ፕሌትፎርም ማረጋገጫ ኮድዎ፡ ${otp}። ለ10 ደቂቃ የሚሰራ ነው። ኮዱን ከማንም ጋር አይጋሩ።`
    };

    const message = messages[language] || messages.English;
    return sendSMS(phone, message);
};

// ─── Appointment Reminder SMS ──────────────────────────────────────────────────

/**
 * Send appointment reminder SMS
 */
const sendAppointmentReminderSMS = async (user, appointment, hoursLeft, language = 'English') => {
    const phone = user.phone || user.phoneNumber;
    if (!phone) return { success: false, error: 'No phone number for user' };

    const date = new Date(appointment.scheduledDate).toLocaleString('en-ET');

    const messages = {
        English: `Reminder: You have a legal consultation in ${hoursLeft} hour(s) on ${date}. Booking ID: ${appointment.appointmentId}. AI Legal Platform.`,
        Amharic: `አስታዋሽ: ${hoursLeft} ሰዓት ውስጥ የህግ ምክር አለዎት (${date})። ቁጥር: ${appointment.appointmentId}। AI ህጋዊ ፕሌትፎርም።`
    };

    const message = messages[language] || messages.English;
    return sendSMS(phone, message);
};

// ─── Appointment Confirmation SMS ─────────────────────────────────────────────

const sendAppointmentConfirmationSMS = async (user, appointment, language = 'English') => {
    const phone = user.phone || user.phoneNumber;
    if (!phone) return { success: false, error: 'No phone number for user' };

    const date = new Date(appointment.scheduledDate).toLocaleString('en-ET');

    const messages = {
        English: `Your appointment is confirmed for ${date}. Booking ID: ${appointment.appointmentId}. AI Legal Platform.`,
        Amharic: `ቀጠሮዎ ተረጋግጧል: ${date}። ቁጥር: ${appointment.appointmentId}. AI ህጋዊ ፕሌትፎርም።`
    };

    const message = messages[language] || messages.English;
    return sendSMS(phone, message);
};

// ─── Appointment Cancellation SMS ─────────────────────────────────────────────

const sendAppointmentCancellationSMS = async (user, appointment, reason, language = 'English') => {
    const phone = user.phone || user.phoneNumber;
    if (!phone) return { success: false, error: 'No phone number for user' };

    const messages = {
        English: `Your appointment (ID: ${appointment.appointmentId}) has been cancelled. Reason: ${reason || 'N/A'}. Contact us to reschedule. AI Legal Platform.`,
        Amharic: `ቀጠሮዎ (ቁጥር: ${appointment.appointmentId}) ተሰርዟል። ምክንያት: ${reason || 'N/A'}. AI ህጋዊ ፕሌትፎርም።`
    };

    const message = messages[language] || messages.English;
    return sendSMS(phone, message);
};

// ─── Account Alerts ────────────────────────────────────────────────────────────

/**
 * Send login alert SMS (for suspicious login from new device/location)
 */
const sendLoginAlertSMS = async (user, ipAddress, language = 'English') => {
    const phone = user.phone || user.phoneNumber;
    if (!phone) return { success: false, error: 'No phone number for user' };

    const messages = {
        English: `New login detected on your AI Legal Platform account from IP: ${ipAddress}. Not you? Change your password immediately.`,
        Amharic: `አዲስ ግባ ተፈቅዷል: ${ipAddress}። እርስዎ አይደሉምን? ወዲያውኑ የይለፍ ቃልዎን ይቀይሩ። AI ህጋዊ ፕሌትፎርም።`
    };

    const message = messages[language] || messages.English;
    return sendSMS(phone, message);
};

/**
 * Send verification status SMS to a lawyer
 */
const sendLawyerVerificationSMS = async (user, status, language = 'English') => {
    const phone = user.phone || user.phoneNumber;
    if (!phone) return { success: false, error: 'No phone number for user' };

    const isApproved = status === 'APPROVED';

    const messages = {
        English: isApproved
            ? `Congratulations! Your lawyer profile has been APPROVED on AI Legal Platform. You can now accept client consultations.`
            : `Your lawyer verification status has been updated to: ${status}. Log in for details. AI Legal Platform.`,
        Amharic: isApproved
            ? `እንኳን ደስ አለዎ! የጠበቃ መገለጫዎ ጸድቋል። ደንበኞችን መቀበል ይችላሉ። AI ህጋዊ ፕሌትፎርም።`
            : `የጠበቃ ሁኔታዎ ወደ ${status} ተቀይሯል። ለዝርዝር ይግቡ። AI ህጋዊ ፕሌትፎርም።`
    };

    const message = messages[language] || messages.English;
    return sendSMS(phone, message);
};

// ─── Bulk SMS ──────────────────────────────────────────────────────────────────

/**
 * Send SMS to multiple recipients
 * @returns {{ sent: number, failed: number, results: Array }}
 */
const sendBulkSMS = async (recipients, message, delayMs = 200) => {
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
        const phone = typeof recipient === 'string' ? recipient : (recipient.phone || recipient.phoneNumber);
        if (!phone) {
            results.push({ phone: 'unknown', success: false, error: 'No phone' });
            failed++;
            continue;
        }

        const result = await sendSMS(phone, message);
        results.push({ phone, ...result });

        if (result.success) sent++;
        else failed++;

        // Rate limiting delay
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log(`[SMSService] Bulk SMS: ${sent} sent, ${failed} failed`);
    return { sent, failed, results };
};

module.exports = {
    sendSMS,
    sendOTPSMS,
    sendAppointmentReminderSMS,
    sendAppointmentConfirmationSMS,
    sendAppointmentCancellationSMS,
    sendLoginAlertSMS,
    sendLawyerVerificationSMS,
    sendBulkSMS,
    normalizePhoneNumber
};
