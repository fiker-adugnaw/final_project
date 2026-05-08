/**
 * Platform Constants
 * Single source of truth for all enums, limits, and configuration
 * values used across the AI Legal Assistance Platform.
 */

// ─── User Roles ────────────────────────────────────────────────────────────────
const USER_TYPES = Object.freeze({
    CLIENT: 'CLIENT',
    LAWYER: 'LAWYER',
    VOLUNTEER_ADVISOR: 'VOLUNTEER_ADVISOR',
    PRO_BONO: 'PRO_BONO',
    ADMIN: 'ADMIN'
});

const USER_TYPE_VALUES = Object.values(USER_TYPES);

// Roles that are considered "legal professionals"
const PROFESSIONAL_ROLES = [
    USER_TYPES.LAWYER,
    USER_TYPES.VOLUNTEER_ADVISOR,
    USER_TYPES.PRO_BONO
];

// ─── Verification Status ───────────────────────────────────────────────────────
const VERIFICATION_STATUS = Object.freeze({
    PENDING: 'PENDING',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    SUSPENDED: 'SUSPENDED'
});

const REGISTRATION_STATUS = Object.freeze({
    PENDING_VERIFICATION: 'PENDING_VERIFICATION',
    PENDING_PROFILE: 'PENDING_PROFILE',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    ACTIVE: 'ACTIVE',
    REJECTED: 'REJECTED',
    SUSPENDED: 'SUSPENDED'
});

// ─── Appointment ───────────────────────────────────────────────────────────────
const APPOINTMENT_STATUS = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
    RESCHEDULED: 'RESCHEDULED'
});

const APPOINTMENT_TYPES = Object.freeze({
    IN_PERSON: 'IN_PERSON',
    VIDEO_CALL: 'VIDEO_CALL',
    PHONE_CALL: 'PHONE_CALL',
    CHAT: 'CHAT'
});

// ─── Document ─────────────────────────────────────────────────────────────────
const DOCUMENT_TYPES = Object.freeze({
    PETITION: 'PETITION',
    EVIDENCE: 'EVIDENCE',
    CONTRACT: 'CONTRACT',
    COURT_ORDER: 'COURT_ORDER',
    IDENTIFICATION: 'IDENTIFICATION',
    LEGAL_BRIEF: 'LEGAL_BRIEF',
    AFFIDAVIT: 'AFFIDAVIT',
    OTHER: 'OTHER'
});

const FILE_TYPES = Object.freeze({
    PDF: 'PDF',
    DOC: 'DOC',
    DOCX: 'DOCX',
    JPG: 'JPG',
    PNG: 'PNG',
    TXT: 'TXT',
    OTHER: 'OTHER'
});

// ─── Forum ────────────────────────────────────────────────────────────────────
const FORUM_CATEGORIES = Object.freeze({
    FAMILY_LAW: 'FAMILY_LAW',
    CRIMINAL_LAW: 'CRIMINAL_LAW',
    CIVIL_LAW: 'CIVIL_LAW',
    EMPLOYMENT_LAW: 'EMPLOYMENT_LAW',
    PROPERTY_LAW: 'PROPERTY_LAW',
    CONTRACT_LAW: 'CONTRACT_LAW',
    HUMAN_RIGHTS: 'HUMAN_RIGHTS',
    IMMIGRATION: 'IMMIGRATION',
    BUSINESS_LAW: 'BUSINESS_LAW',
    GENERAL: 'GENERAL'
});

const POST_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED',
    ARCHIVED: 'ARCHIVED',
    DELETED: 'DELETED',
    PENDING_REVIEW: 'PENDING_REVIEW'
});

// ─── AI / Jurisdiction ────────────────────────────────────────────────────────
const JURISDICTION = Object.freeze({
    ETHIOPIAN: 'ETHIOPIAN',
    FOREIGN: 'FOREIGN',
    MIXED: 'MIXED',
    UNKNOWN: 'UNKNOWN'
});

const QUERY_LANGUAGES = Object.freeze({
    AMHARIC: 'Amharic',
    ENGLISH: 'English'
});

const WARNING_TYPES = Object.freeze({
    FOREIGN_JURISDICTION: 'FOREIGN_JURISDICTION',
    NON_LEGAL: 'NON_LEGAL',
    AMBIGUOUS: 'AMBIGUOUS',
    SENSITIVE: 'SENSITIVE'
});

// ─── System Logs ──────────────────────────────────────────────────────────────
const LOG_MODULES = Object.freeze({
    AUTH: 'AUTH',
    USER: 'USER',
    LAWYER: 'LAWYER',
    CLIENT: 'CLIENT',
    VOLUNTEER: 'VOLUNTEER',
    APPOINTMENT: 'APPOINTMENT',
    DOCUMENT: 'DOCUMENT',
    AI: 'AI',
    FORUM: 'FORUM',
    NOTIFICATION: 'NOTIFICATION',
    ADMIN: 'ADMIN',
    SYSTEM: 'SYSTEM'
});

const LOG_SEVERITY = Object.freeze({
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
});

// ─── Notification ─────────────────────────────────────────────────────────────
const NOTIFICATION_TYPES = Object.freeze({
    APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
    APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
    APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
    APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
    DOCUMENT_SHARED: 'DOCUMENT_SHARED',
    DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',
    MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
    VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
    VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
    SYSTEM_ALERT: 'SYSTEM_ALERT',
    FORUM_REPLY: 'FORUM_REPLY',
    FORUM_MENTION: 'FORUM_MENTION'
});

const NOTIFICATION_CHANNELS = Object.freeze({
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app'
});

// ─── HTTP Status Codes ────────────────────────────────────────────────────────
const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    LOCKED: 423,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    SERVICE_UNAVAILABLE: 503
});

// ─── File Upload Limits ───────────────────────────────────────────────────────
const FILE_LIMITS = Object.freeze({
    MAX_DOCUMENT_SIZE: 10 * 1024 * 1024,  // 10 MB
    MAX_PROFILE_PHOTO_SIZE: 3 * 1024 * 1024, // 3 MB
    MAX_FORUM_ATTACHMENT_SIZE: 5 * 1024 * 1024, // 5 MB
    MAX_CREDENTIALS_FILES: 5,
    MAX_FORUM_ATTACHMENTS: 3
});

const ALLOWED_MIME_TYPES = Object.freeze([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
]);

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGINATION = Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
});

// ─── Security ─────────────────────────────────────────────────────────────────
const SECURITY = Object.freeze({
    MAX_LOGIN_ATTEMPTS: 5,
    LOCK_DURATION_MINUTES: 120, // 2 hours
    JWT_EXPIRY: '7d',
    REFRESH_TOKEN_EXPIRY: '30d',
    OTP_EXPIRY_MINUTES: 10,
    EMAIL_VERIFY_TOKEN_EXPIRY_HOURS: 24,
    PASSWORD_RESET_EXPIRY_MINUTES: 60,
    BCRYPT_ROUNDS: 12,
    OTP_LENGTH: 6
});

// ─── Ethiopian Administrative Regions ─────────────────────────────────────────
const ETHIOPIAN_REGIONS = Object.freeze([
    'Addis Ababa',
    'Afar',
    'Amhara',
    'Benishangul-Gumuz',
    'Dire Dawa',
    'Gambela',
    'Harari',
    'Oromia',
    'Sidama',
    'Somali',
    'South Ethiopia',
    'Southwest Ethiopia',
    'Southern Nations, Nationalities, and Peoples (SNNP)',
    'Tigray'
]);

// ─── Ethiopian Legal Practice Areas ───────────────────────────────────────────
const LEGAL_PRACTICE_AREAS = Object.freeze([
    'Family Law',
    'Criminal Law',
    'Civil Law',
    'Employment & Labour Law',
    'Property & Land Law',
    'Contract Law',
    'Human Rights Law',
    'Immigration Law',
    'Business & Commercial Law',
    'Constitutional Law',
    'Administrative Law',
    'Tax Law',
    'Environmental Law',
    'Intellectual Property',
    'Banking & Finance Law',
    'International Law',
    'Child & Women Rights Law',
    'Refugee Law'
]);

// ─── Ethiopian Languages ───────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = Object.freeze(['Amharic', 'English']);

// ─── Ethiopian Legal References ───────────────────────────────────────────────
const ETHIOPIAN_LAW_TYPES = Object.freeze({
    CONSTITUTION: 'CONSTITUTION',
    PROCLAMATION: 'PROCLAMATION',
    REGULATION: 'REGULATION',
    COURT_DECISION: 'COURT_DECISION',
    CODE: 'CODE'
});

// ─── Legal Disclaimers ────────────────────────────────────────────────────────
const LEGAL_DISCLAIMER = Object.freeze({
    English: 'This is general legal information only and does not constitute legal advice. For specific legal advice, please consult a verified lawyer.',
    Amharic: 'ይህ አጠቃላይ የህግ መረጃ ብቻ ነው እንጂ የህግ ምክር አይደለም። ለተወሰነ የህግ ምክር እባክዎን የተረጋገጠ ጠበቃ ያማክሩ።'
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const RATE_LIMITS = Object.freeze({
    GLOBAL_WINDOW_MS: 15 * 60 * 1000,    // 15 minutes
    GLOBAL_MAX: 200,
    AUTH_WINDOW_MS: 15 * 60 * 1000,      // 15 minutes
    AUTH_MAX: 10,
    AI_WINDOW_MS: 60 * 1000,             // 1 minute
    AI_MAX: 5
});

// ─── Volunteer Types ──────────────────────────────────────────────────────────
const VOLUNTEER_TYPES = Object.freeze({
    ADVISOR: 'ADVISOR',
    REPRESENTATIVE: 'REPRESENTATIVE'
});

// ─── Case Types ───────────────────────────────────────────────────────────────
const CASE_TYPES = Object.freeze([
    'Criminal',
    'Civil',
    'Family',
    'Employment',
    'Property',
    'Business',
    'Constitutional',
    'Administrative',
    'Human Rights',
    'Other'
]);

module.exports = {
    USER_TYPES,
    USER_TYPE_VALUES,
    PROFESSIONAL_ROLES,
    VERIFICATION_STATUS,
    APPOINTMENT_STATUS,
    APPOINTMENT_TYPES,
    DOCUMENT_TYPES,
    FILE_TYPES,
    FORUM_CATEGORIES,
    POST_STATUS,
    JURISDICTION,
    QUERY_LANGUAGES,
    WARNING_TYPES,
    LOG_MODULES,
    LOG_SEVERITY,
    NOTIFICATION_TYPES,
    NOTIFICATION_CHANNELS,
    HTTP_STATUS,
    FILE_LIMITS,
    ALLOWED_MIME_TYPES,
    PAGINATION,
    SECURITY,
    ETHIOPIAN_REGIONS,
    LEGAL_PRACTICE_AREAS,
    SUPPORTED_LANGUAGES,
    ETHIOPIAN_LAW_TYPES,
    LEGAL_DISCLAIMER,
    RATE_LIMITS,
    REGISTRATION_STATUS,
    VOLUNTEER_TYPES,
    CASE_TYPES
};
