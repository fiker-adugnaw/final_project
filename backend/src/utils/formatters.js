/**
 * Formatters
 * Pure display/formatting functions for the AI Legal Assistance Platform.
 * Used in API responses, email templates, and admin exports.
 */

// ─── Date & Time Formatters ────────────────────────────────────────────────────

const ETHIOPIC_LOCALE = 'am-ET'; // Amharic Ethiopia locale
const ENGLISH_LOCALE = 'en-ET';  // English Ethiopia locale

/**
 * Format a date as a short readable date.
 * @param {Date|string} date
 * @param {string} language - 'Amharic' | 'English'
 */
const formatDate = (date, language = 'English') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d)) return '';

    try {
        return d.toLocaleDateString(
            language === 'Amharic' ? ETHIOPIC_LOCALE : ENGLISH_LOCALE,
            { year: 'numeric', month: 'long', day: 'numeric' }
        );
    } catch {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
};

/**
 * Format a date + time string.
 */
const formatDateTime = (date, language = 'English') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d)) return '';

    try {
        return d.toLocaleString(
            language === 'Amharic' ? ETHIOPIC_LOCALE : ENGLISH_LOCALE,
            { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        );
    } catch {
        return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
};

/**
 * Format time only.
 */
const formatTime = (date, language = 'English') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d)) return '';

    try {
        return d.toLocaleTimeString(
            language === 'Amharic' ? ETHIOPIC_LOCALE : ENGLISH_LOCALE,
            { hour: '2-digit', minute: '2-digit' }
        );
    } catch {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
};

/**
 * Return a relative time label (e.g. "3 hours ago", "in 2 days").
 */
const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = Date.now();
    const ms = new Date(date).getTime() - now;
    const absSec = Math.abs(ms) / 1000;

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (absSec < 60) return rtf.format(Math.round(ms / 1000), 'second');
    if (absSec < 3600) return rtf.format(Math.round(ms / 60000), 'minute');
    if (absSec < 86400) return rtf.format(Math.round(ms / 3600000), 'hour');
    if (absSec < 2592000) return rtf.format(Math.round(ms / 86400000), 'day');
    if (absSec < 31536000) return rtf.format(Math.round(ms / 2592000000), 'month');
    return rtf.format(Math.round(ms / 31536000000), 'year');
};

/**
 * Format milliseconds into "Xm Ys" (e.g. "2m 35s")
 */
const formatDuration = (ms) => {
    if (ms == null || isNaN(ms)) return '—';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

/**
 * Format milliseconds as response time string (e.g. "245ms")
 */
const formatResponseTime = (ms) => {
    if (ms == null) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

// ─── Number & Currency Formatters ─────────────────────────────────────────────

/**
 * Format Ethiopian Birr amount.
 * @param {number} amount
 * @param {string} language
 */
const formatCurrency = (amount, language = 'English') => {
    if (amount == null || isNaN(amount)) return '—';
    try {
        return new Intl.NumberFormat(
            language === 'Amharic' ? ETHIOPIC_LOCALE : ENGLISH_LOCALE,
            { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }
        ).format(amount);
    } catch {
        return `ETB ${Number(amount).toFixed(2)}`;
    }
};

/**
 * Format a plain number with locale-aware thousands separators.
 */
const formatNumber = (num, language = 'English') => {
    if (num == null || isNaN(num)) return '—';
    try {
        return new Intl.NumberFormat(
            language === 'Amharic' ? ETHIOPIC_LOCALE : ENGLISH_LOCALE
        ).format(num);
    } catch {
        return String(num);
    }
};

/**
 * Format bytes into a human-readable string.
 */
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format a percentage value with rounding.
 */
const formatPercent = (value, total, decimals = 1) => {
    if (!total || total === 0) return '0%';
    return `${((value / total) * 100).toFixed(decimals)}%`;
};

// ─── Name / Phone / Address Formatters ───────────────────────────────────────

/**
 * Format a full name (last, first → First Last).
 */
const formatFullName = (fullName) => {
    if (!fullName) return '';
    return fullName
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Format a phone number for display: +251 91 123 4567
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');

    // Ethiopian international: 251XXXXXXXXX → +251 9X XXX XXXX
    if (clean.startsWith('251') && clean.length === 12) {
        return `+251 ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
    }
    // Ethiopian local: 09XXXXXXXX
    if (clean.startsWith('0') && clean.length === 10) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    return phone;
};

/**
 * Format an Ethiopian address from fields.
 */
const formatAddress = ({ region, city, subCity, woreda, kebele } = {}) => {
    const parts = [kebele, woreda, subCity, city, region].filter(Boolean);
    return parts.join(', ') || '—';
};

// ─── Status Formatters ────────────────────────────────────────────────────────

/**
 * Map internal status codes to human-readable labels.
 */
const STATUS_LABELS = {
    // Appointments
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
    RESCHEDULED: 'Rescheduled',

    // Verification
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    SUSPENDED: 'Suspended',

    // Documents
    ACTIVE: 'Active',
    ARCHIVED: 'Archived',
    DELETED: 'Deleted',

    // Jurisdiction
    ETHIOPIAN: 'Ethiopian Law',
    FOREIGN: 'Foreign Law',
    MIXED: 'Mixed Jurisdiction',
    UNKNOWN: 'Unknown'
};

const formatStatus = (status) => STATUS_LABELS[status] || status || '—';

/**
 * Format a user type for display.
 */
const USER_TYPE_LABELS = {
    CLIENT: 'Client',
    LAWYER: 'Lawyer',
    VOLUNTEER_ADVISOR: 'Volunteer Advisor',
    VOLUNTEER_REPRESENTATIVE: 'Volunteer Representative',
    ADMIN: 'Administrator'
};

const formatUserType = (userType) => USER_TYPE_LABELS[userType] || userType || '—';

// ─── Score / Rating Formatters ────────────────────────────────────────────────

/**
 * Format a rating as stars: ★★★★☆
 */
const formatStarRating = (rating, max = 5) => {
    if (rating == null) return '—';
    const filled = Math.round(Math.min(max, Math.max(0, rating)));
    return '★'.repeat(filled) + '☆'.repeat(max - filled);
};

/**
 * Format a confidence score as a percentage label.
 */
const formatConfidence = (score) => {
    if (score == null) return '—';
    const pct = Math.round(score * 100);
    if (pct >= 85) return `${pct}% (High)`;
    if (pct >= 60) return `${pct}% (Medium)`;
    return `${pct}% (Low)`;
};

// ─── List Formatters ──────────────────────────────────────────────────────────

/**
 * Join an array into a readable list: "A, B, and C"
 */
const formatList = (items, conjunction = 'and') => {
    if (!items || items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
};

/**
 * Format practice areas list.
 */
const formatPracticeAreas = (areas) => {
    if (!areas || areas.length === 0) return '—';
    return areas.join(' • ');
};

// ─── API Response Formatters ──────────────────────────────────────────────────

/**
 * Sanitize and format a User to safe public fields.
 */
const formatUser = (user) => {
    if (!user) return null;
    const u = user.toObject ? user.toObject() : user;
    return {
        id: u._id,
        username: u.username,
        email: maskEmail(u.email),
        fullName: u.fullName,
        userType: formatUserType(u.userType),
        region: u.region,
        city: u.city,
        isVerified: u.isVerified,
        languagePreference: u.languagePreference,
        profilePicture: u.profilePicture,
        createdAt: formatDate(u.createdAt)
    };
};

/**
 * Mask email for safe display.
 */
const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    const visible = local.slice(0, Math.min(3, local.length));
    return `${visible}****@${domain}`;
};

/**
 * Format a paginated API response envelope.
 */
const formatPaginatedResponse = (items, total, page, limit) => ({
    success: true,
    count: items.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
    data: items
});

module.exports = {
    // Date/Time
    formatDate,
    formatDateTime,
    formatTime,
    formatRelativeTime,
    formatDuration,
    formatResponseTime,

    // Numbers
    formatCurrency,
    formatNumber,
    formatFileSize,
    formatPercent,

    // Name/Phone/Address
    formatFullName,
    formatPhoneNumber,
    formatAddress,
    maskEmail,

    // Status
    formatStatus,
    formatUserType,

    // Scores
    formatStarRating,
    formatConfidence,

    // Lists
    formatList,
    formatPracticeAreas,

    // API
    formatUser,
    formatPaginatedResponse
};
