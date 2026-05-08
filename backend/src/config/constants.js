/**
 * Application Constants
 * Centralized configuration for all constant values used throughout the application
 */

// ============================================
// USER TYPES AND ROLES
// ============================================

const USER_TYPES = {
    CLIENT: 'CLIENT',
    LAWYER: 'LAWYER',
    VOLUNTEER_ADVISOR: 'VOLUNTEER_ADVISOR',
    VOLUNTEER_REPRESENTATIVE: 'VOLUNTEER_REPRESENTATIVE',
    PRO_BONO: 'PRO_BONO',
    ADMIN: 'ADMIN'
};

const USER_TYPES_LIST = Object.values(USER_TYPES);

const USER_TYPE_LABELS = {
    [USER_TYPES.CLIENT]: {
        en: 'Client',
        am: 'ደንበኛ'
    },
    [USER_TYPES.LAWYER]: {
        en: 'Lawyer',
        am: 'ጠበቃ'
    },
    [USER_TYPES.VOLUNTEER_ADVISOR]: {
        en: 'Volunteer Advisor',
        am: 'በጎ ፈቃደኛ አማካሪ'
    },
    [USER_TYPES.VOLUNTEER_REPRESENTATIVE]: {
        en: 'Volunteer Representative',
        am: 'በጎ ፈቃደኛ ወኪል'
    },
    [USER_TYPES.PRO_BONO]: {
        en: 'Pro Bono Lawyer',
        am: 'ፕሮ ቦኖ ጠበቃ'
    },
    [USER_TYPES.ADMIN]: {
        en: 'Administrator',
        am: 'አስተዳዳሪ'
    }
};

// ============================================
// LAWYER SPECIALIZATIONS
// ============================================

const LAWYER_SPECIALIZATIONS = {
    FAMILY_LAW: 'FAMILY_LAW',
    CRIMINAL_LAW: 'CRIMINAL_LAW',
    CIVIL_LAW: 'CIVIL_LAW',
    COMMERCIAL_LAW: 'COMMERCIAL_LAW',
    LABOR_LAW: 'LABOR_LAW',
    PROPERTY_LAW: 'PROPERTY_LAW',
    CONTRACT_LAW: 'CONTRACT_LAW',
    HUMAN_RIGHTS: 'HUMAN_RIGHTS',
    ADMINISTRATIVE_LAW: 'ADMINISTRATIVE_LAW',
    TAX_LAW: 'TAX_LAW',
    IMMIGRATION_LAW: 'IMMIGRATION_LAW',
    INTELLECTUAL_PROPERTY: 'INTELLECTUAL_PROPERTY'
};

const LAWYER_SPECIALIZATIONS_LIST = Object.values(LAWYER_SPECIALIZATIONS);

const LAWYER_SPECIALIZATION_LABELS = {
    [LAWYER_SPECIALIZATIONS.FAMILY_LAW]: {
        en: 'Family Law',
        am: 'የቤተሰብ ህግ'
    },
    [LAWYER_SPECIALIZATIONS.CRIMINAL_LAW]: {
        en: 'Criminal Law',
        am: 'የወንጀል ህግ'
    },
    [LAWYER_SPECIALIZATIONS.CIVIL_LAW]: {
        en: 'Civil Law',
        am: 'የፍትሐ ብሔር ህግ'
    },
    [LAWYER_SPECIALIZATIONS.COMMERCIAL_LAW]: {
        en: 'Commercial Law',
        am: 'የንግድ ህግ'
    },
    [LAWYER_SPECIALIZATIONS.LABOR_LAW]: {
        en: 'Labor Law',
        am: 'የሰራተኛ ህግ'
    },
    [LAWYER_SPECIALIZATIONS.PROPERTY_LAW]: {
        en: 'Property Law',
        am: 'የንብረት ህግ'
    },
    [LAWYER_SPECIALIZATIONS.CONTRACT_LAW]: {
        en: 'Contract Law',
        am: 'የውል ህግ'
    },
    [LAWYER_SPECIALIZATIONS.HUMAN_RIGHTS]: {
        en: 'Human Rights',
        am: 'ሰብአዊ መብቶች'
    },
    [LAWYER_SPECIALIZATIONS.ADMINISTRATIVE_LAW]: {
        en: 'Administrative Law',
        am: 'የአስተዳደር ህግ'
    },
    [LAWYER_SPECIALIZATIONS.TAX_LAW]: {
        en: 'Tax Law',
        am: 'የግብር ህግ'
    },
    [LAWYER_SPECIALIZATIONS.IMMIGRATION_LAW]: {
        en: 'Immigration Law',
        am: 'የኢሚግሬሽን ህግ'
    },
    [LAWYER_SPECIALIZATIONS.INTELLECTUAL_PROPERTY]: {
        en: 'Intellectual Property',
        am: 'የአዕምሯዊ ንብረት ህግ'
    }
};

// ============================================
// VOLUNTEER TYPES
// ============================================

const VOLUNTEER_TYPES = {
    ADVISOR: 'ADVISOR',
    REPRESENTATIVE: 'REPRESENTATIVE'
};

const VOLUNTEER_TYPES_LIST = Object.values(VOLUNTEER_TYPES);

const VOLUNTEER_TYPE_LABELS = {
    [VOLUNTEER_TYPES.ADVISOR]: {
        en: 'Legal Advisor',
        am: 'የህግ አማካሪ'
    },
    [VOLUNTEER_TYPES.REPRESENTATIVE]: {
        en: 'Legal Representative',
        am: 'የህግ ወኪል'
    }
};

// ============================================
// APPOINTMENT STATUS
// ============================================

const APPOINTMENT_STATUS = {
    SCHEDULED: 'SCHEDULED',
    CONFIRMED: 'CONFIRMED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    RESCHEDULED: 'RESCHEDULED',
    NO_SHOW: 'NO_SHOW'
};

const APPOINTMENT_STATUS_LIST = Object.values(APPOINTMENT_STATUS);

const APPOINTMENT_STATUS_LABELS = {
    [APPOINTMENT_STATUS.SCHEDULED]: {
        en: 'Scheduled',
        am: 'ታቅዷል'
    },
    [APPOINTMENT_STATUS.CONFIRMED]: {
        en: 'Confirmed',
        am: 'ተረጋግጧል'
    },
    [APPOINTMENT_STATUS.COMPLETED]: {
        en: 'Completed',
        am: 'ተጠናቋል'
    },
    [APPOINTMENT_STATUS.CANCELLED]: {
        en: 'Cancelled',
        am: 'ተሰርዟል'
    },
    [APPOINTMENT_STATUS.RESCHEDULED]: {
        en: 'Rescheduled',
        am: 'ተቀይሯል'
    },
    [APPOINTMENT_STATUS.NO_SHOW]: {
        en: 'No Show',
        am: 'አልተገኘም'
    }
};

// ============================================
// APPOINTMENT TYPES
// ============================================

const APPOINTMENT_TYPES = {
    CONSULTATION: 'CONSULTATION',
    REPRESENTATION: 'REPRESENTATION',
    ADVISORY: 'ADVISORY'
};

const APPOINTMENT_TYPES_LIST = Object.values(APPOINTMENT_TYPES);

const APPOINTMENT_TYPE_LABELS = {
    [APPOINTMENT_TYPES.CONSULTATION]: {
        en: 'Consultation',
        am: 'ምክክር'
    },
    [APPOINTMENT_TYPES.REPRESENTATION]: {
        en: 'Court Representation',
        am: 'የፍርድ ቤት ውክልና'
    },
    [APPOINTMENT_TYPES.ADVISORY]: {
        en: 'Legal Advisory',
        am: 'የህግ ምክር'
    }
};

// ============================================
// APPOINTMENT PRIORITY
// ============================================

const APPOINTMENT_PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
};

const APPOINTMENT_PRIORITY_LIST = Object.values(APPOINTMENT_PRIORITY);

// ============================================
// LOCATION TYPES
// ============================================

const LOCATION_TYPES = {
    IN_PERSON: 'IN_PERSON',
    PHONE: 'PHONE',
    VIDEO_CALL: 'VIDEO_CALL'
};

const LOCATION_TYPES_LIST = Object.values(LOCATION_TYPES);

// ============================================
// DOCUMENT TYPES
// ============================================

const DOCUMENT_TYPES = {
    PETITION: 'PETITION',
    EVIDENCE: 'EVIDENCE',
    CONTRACT: 'CONTRACT',
    COURT_ORDER: 'COURT_ORDER',
    IDENTIFICATION: 'IDENTIFICATION',
    LEGAL_BRIEF: 'LEGAL_BRIEF',
    AFFIDAVIT: 'AFFIDAVIT',
    OTHER: 'OTHER'
};

const DOCUMENT_TYPES_LIST = Object.values(DOCUMENT_TYPES);

const DOCUMENT_TYPE_LABELS = {
    [DOCUMENT_TYPES.PETITION]: {
        en: 'Petition',
        am: 'አቤቱታ'
    },
    [DOCUMENT_TYPES.EVIDENCE]: {
        en: 'Evidence',
        am: 'ማስረጃ'
    },
    [DOCUMENT_TYPES.CONTRACT]: {
        en: 'Contract',
        am: 'ውል'
    },
    [DOCUMENT_TYPES.COURT_ORDER]: {
        en: 'Court Order',
        am: 'የፍርድ ቤት ትዕዛዝ'
    },
    [DOCUMENT_TYPES.IDENTIFICATION]: {
        en: 'Identification',
        am: 'መታወቂያ'
    },
    [DOCUMENT_TYPES.LEGAL_BRIEF]: {
        en: 'Legal Brief',
        am: 'የህግ ማጠቃለያ'
    },
    [DOCUMENT_TYPES.AFFIDAVIT]: {
        en: 'Affidavit',
        am: 'የምስክር ወረቀት'
    },
    [DOCUMENT_TYPES.OTHER]: {
        en: 'Other',
        am: 'ሌላ'
    }
};

// ============================================
// DOCUMENT STATUS
// ============================================

const DOCUMENT_STATUS = {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
};

const DOCUMENT_STATUS_LIST = Object.values(DOCUMENT_STATUS);

// ============================================
// FORUM CATEGORIES
// ============================================

const FORUM_CATEGORIES = {
    GENERAL: 'GENERAL',
    LEGAL_ADVICE: 'LEGAL_ADVICE',
    FAMILY_LAW: 'FAMILY_LAW',
    CRIMINAL_LAW: 'CRIMINAL_LAW',
    CIVIL_LAW: 'CIVIL_LAW',
    LABOR_LAW: 'LABOR_LAW',
    PROPERTY_LAW: 'PROPERTY_LAW',
    COMMERCIAL_LAW: 'COMMERCIAL_LAW',
    HUMAN_RIGHTS: 'HUMAN_RIGHTS',
    SUCCESS_STORIES: 'SUCCESS_STORIES',
    EMPLOYMENT_LAW: 'EMPLOYMENT_LAW',
    CONTRACT_LAW: 'CONTRACT_LAW',
    IMMIGRATION: 'IMMIGRATION',
    BUSINESS_LAW: 'BUSINESS_LAW'
};

const FORUM_CATEGORIES_LIST = Object.values(FORUM_CATEGORIES);

const FORUM_CATEGORY_LABELS = {
    [FORUM_CATEGORIES.GENERAL]: {
        en: 'General Discussion',
        am: 'አጠቃላይ ውይይት'
    },
    [FORUM_CATEGORIES.LEGAL_ADVICE]: {
        en: 'Legal Advice',
        am: 'የህግ ምክር'
    },
    [FORUM_CATEGORIES.FAMILY_LAW]: {
        en: 'Family Law',
        am: 'የቤተሰብ ህግ'
    },
    [FORUM_CATEGORIES.CRIMINAL_LAW]: {
        en: 'Criminal Law',
        am: 'የወንጀል ህግ'
    },
    [FORUM_CATEGORIES.CIVIL_LAW]: {
        en: 'Civil Law',
        am: 'የፍትሐ ብሔር ህግ'
    },
    [FORUM_CATEGORIES.LABOR_LAW]: {
        en: 'Labor Law',
        am: 'የሰራተኛ ህግ'
    },
    [FORUM_CATEGORIES.PROPERTY_LAW]: {
        en: 'Property Law',
        am: 'የንብረት ህግ'
    },
    [FORUM_CATEGORIES.COMMERCIAL_LAW]: {
        en: 'Commercial Law',
        am: 'የንግድ ህግ'
    },
    [FORUM_CATEGORIES.HUMAN_RIGHTS]: {
        en: 'Human Rights',
        am: 'ሰብአዊ መብቶች'
    },
    [FORUM_CATEGORIES.SUCCESS_STORIES]: {
        en: 'Success Stories',
        am: 'የስኬት ታሪኮች'
    },
    [FORUM_CATEGORIES.EMPLOYMENT_LAW]: {
        en: 'Employment Law',
        am: 'የስራ ስምሪት ህግ'
    },
    [FORUM_CATEGORIES.CONTRACT_LAW]: {
        en: 'Contract Law',
        am: 'የውል ህግ'
    },
    [FORUM_CATEGORIES.IMMIGRATION]: {
        en: 'Immigration Law',
        am: 'የኢሚግሬሽን ህግ'
    },
    [FORUM_CATEGORIES.BUSINESS_LAW]: {
        en: 'Business Law',
        am: 'የንግድ ስራ ህግ'
    }
};

// ============================================
// FORUM MODERATION STATUS
// ============================================

const FORUM_MODERATION_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    FLAGGED: 'FLAGGED'
};

const FORUM_MODERATION_STATUS_LIST = Object.values(FORUM_MODERATION_STATUS);

// ============================================
// FLAG REASONS
// ============================================

const FLAG_REASONS = {
    INAPPROPRIATE: 'INAPPROPRIATE',
    IRRELEVANT: 'IRRELEVANT',
    MISINFORMATION: 'MISINFORMATION',
    HARASSMENT: 'HARASSMENT',
    OTHER: 'OTHER'
};

const FLAG_REASONS_LIST = Object.values(FLAG_REASONS);

// ============================================
// NOTIFICATION TYPES
// ============================================

const NOTIFICATION_TYPES = {
    APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
    APPOINTMENT_CONFIRMATION: 'APPOINTMENT_CONFIRMATION',
    APPOINTMENT_CANCELLATION: 'APPOINTMENT_CANCELLATION',
    APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
    DOCUMENT_SHARED: 'DOCUMENT_SHARED',
    DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',
    LAWYER_VERIFIED: 'LAWYER_VERIFIED',
    VOLUNTEER_APPROVED: 'VOLUNTEER_APPROVED',
    VOLUNTEER_AUTHORIZED: 'VOLUNTEER_AUTHORIZED',
    FORUM_POST_APPROVED: 'FORUM_POST_APPROVED',
    FORUM_POST_REJECTED: 'FORUM_POST_REJECTED',
    FORUM_COMMENT_REPLY: 'FORUM_COMMENT_REPLY',
    FORUM_POST_FLAGGED: 'FORUM_POST_FLAGGED',
    MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
    CASE_UPDATE: 'CASE_UPDATE',
    SYSTEM_ALERT: 'SYSTEM_ALERT',
    WELCOME: 'WELCOME'
};

const NOTIFICATION_TYPES_LIST = Object.values(NOTIFICATION_TYPES);

// ============================================
// NOTIFICATION PRIORITY
// ============================================

const NOTIFICATION_PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
};

const NOTIFICATION_PRIORITY_LIST = Object.values(NOTIFICATION_PRIORITY);

// ============================================
// VERIFICATION STATUS
// ============================================

const VERIFICATION_STATUS = {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED'
};

const VERIFICATION_STATUS_LIST = Object.values(VERIFICATION_STATUS);

// ============================================
// AUTHORIZATION STATUS
// ============================================

const AUTHORIZATION_STATUS = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    PENDING: 'PENDING',
    AUTHORIZED: 'AUTHORIZED'
};

const AUTHORIZATION_STATUS_LIST = Object.values(AUTHORIZATION_STATUS);

// ============================================
// VOLUNTEER STATUS
// ============================================

const VOLUNTEER_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    SUSPENDED: 'SUSPENDED',
    REJECTED: 'REJECTED'
};

const VOLUNTEER_STATUS_LIST = Object.values(VOLUNTEER_STATUS);

// ============================================
// LANGUAGES
// ============================================

const LANGUAGES = {
    AMHARIC: 'Amharic',
    ENGLISH: 'English',
    AFAN_OROMO: 'Afan Oromo',
    TIGRIGNA: 'Tigrigna',
    SOMALI: 'Somali',
    ARABIC: 'Arabic',
    OTHER: 'Other'
};

const LANGUAGES_LIST = Object.values(LANGUAGES);

const SUPPORTED_LANGUAGES = ['Amharic', 'English'];

// ============================================
// ETHIOPIAN REGIONS
// ============================================

const ETHIOPIAN_REGIONS = [
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
    'South West Ethiopia Peoples',
    'Southern Nations, Nationalities and Peoples',
    'Tigray'
];

// ============================================
// PAYMENT CURRENCIES
// ============================================

const CURRENCIES = {
    ETB: 'ETB',
    USD: 'USD'
};

const CURRENCIES_LIST = Object.values(CURRENCIES);

// ============================================
// JURISDICTION TYPES (For AI Service)
// ============================================

const JURISDICTION_TYPES = {
    ETHIOPIAN: 'ETHIOPIAN',
    FOREIGN: 'FOREIGN',
    MIXED: 'MIXED',
    INTERNATIONAL: 'INTERNATIONAL',
    UNKNOWN: 'UNKNOWN'
};

const JURISDICTION_TYPES_LIST = Object.values(JURISDICTION_TYPES);

// ============================================
// SYSTEM MODULES (For Audit Logs)
// ============================================

const SYSTEM_MODULES = {
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
};

const SYSTEM_MODULES_LIST = Object.values(SYSTEM_MODULES);

// ============================================
// SEVERITY LEVELS
// ============================================

const SEVERITY_LEVELS = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
};

const SEVERITY_LEVELS_LIST = Object.values(SEVERITY_LEVELS);

// ============================================
// HTTP STATUS CODES
// ============================================

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// ============================================
// ERROR MESSAGES
// ============================================

const ERROR_MESSAGES = {
    en: {
        UNAUTHORIZED: 'You are not authorized to perform this action',
        INVALID_CREDENTIALS: 'Invalid email or password',
        USER_NOT_FOUND: 'User not found',
        ACCOUNT_LOCKED: 'Account is locked due to too many failed attempts',
        EMAIL_EXISTS: 'Email already registered',
        PHONE_EXISTS: 'Phone number already registered',
        VERIFICATION_REQUIRED: 'Please verify your email/phone first',
        INVALID_TOKEN: 'Invalid or expired token',
        MISSING_FIELDS: 'Please fill in all required fields',
        NOT_FOUND: 'Resource not found',
        FORBIDDEN: 'You do not have permission to access this resource',
        VALIDATION_ERROR: 'Validation error',
        SERVER_ERROR: 'Internal server error',
        RATE_LIMIT: 'Too many requests, please try again later'
    },
    am: {
        UNAUTHORIZED: 'ይህን ተግባር ለማከናወን ፈቃድ የለዎትም',
        INVALID_CREDENTIALS: 'ልክ ያልሆነ ኢሜይል ወይም የይለፍ ቃል',
        USER_NOT_FOUND: 'ተጠቃሚ አልተገኘም',
        ACCOUNT_LOCKED: 'በብዙ ያልተሳኩ ሙከራዎች ምክንያት መለያዎ ተቆልፏል',
        EMAIL_EXISTS: 'ኢሜይል ቀድሞውንም ተመዝግቧል',
        PHONE_EXISTS: 'ስልክ ቁጥር ቀድሞውንም ተመዝግቧል',
        VERIFICATION_REQUIRED: 'እባክዎ መጀመሪያ ኢሜይል/ስልክዎን ያረጋግጡ',
        INVALID_TOKEN: 'ልክ ያልሆነ ወይም ጊዜው ያለፈበት ቶከን',
        MISSING_FIELDS: 'እባክዎ ሁሉንም አስፈላጊ መስኮች ይሙሉ',
        NOT_FOUND: 'የሚፈለገው ነገር አልተገኘም',
        FORBIDDEN: 'ይህን ሀብት ለማግኘት ፈቃድ የለዎትም',
        VALIDATION_ERROR: 'የማረጋገጫ ስህተት',
        SERVER_ERROR: 'የውስጥ አገልጋይ ስህተት',
        RATE_LIMIT: 'በጣም ብዙ ጥያቄዎች፣ እባክዎ ቆይተው ይሞክሩ'
    }
};

// ============================================
// SUCCESS MESSAGES
// ============================================

const SUCCESS_MESSAGES = {
    en: {
        LOGIN: 'Login successful',
        LOGOUT: 'Logout successful',
        REGISTER: 'Registration successful',
        PROFILE_UPDATED: 'Profile updated successfully',
        PASSWORD_CHANGED: 'Password changed successfully',
        EMAIL_VERIFIED: 'Email verified successfully',
        PHONE_VERIFIED: 'Phone number verified successfully',
        DOCUMENT_UPLOADED: 'Document uploaded successfully',
        APPOINTMENT_CREATED: 'Appointment created successfully',
        APPOINTMENT_UPDATED: 'Appointment updated successfully',
        APPOINTMENT_CANCELLED: 'Appointment cancelled successfully',
        FEEDBACK_SUBMITTED: 'Feedback submitted successfully',
        LAWYER_VERIFIED: 'Lawyer verified successfully',
        VOLUNTEER_APPROVED: 'Volunteer approved successfully'
    },
    am: {
        LOGIN: 'በተሳካ ሁኔታ ገብተዋል',
        LOGOUT: 'በተሳካ ሁኔታ ወጥተዋል',
        REGISTER: 'በተሳካ ሁኔታ ተመዝግበዋል',
        PROFILE_UPDATED: 'መረጃ በተሳካ ሁኔታ ተዘምኗል',
        PASSWORD_CHANGED: 'የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል',
        EMAIL_VERIFIED: 'ኢሜይል በተሳካ ሁኔታ ተረጋግጧል',
        PHONE_VERIFIED: 'ስልክ ቁጥር በተሳካ ሁኔታ ተረጋግጧል',
        DOCUMENT_UPLOADED: 'ሰነድ በተሳካ ሁኔታ ተሰቅሏል',
        APPOINTMENT_CREATED: 'ቀጠሮ በተሳካ ሁኔታ ተፈጥሯል',
        APPOINTMENT_UPDATED: 'ቀጠሮ በተሳካ ሁኔታ ተዘምኗል',
        APPOINTMENT_CANCELLED: 'ቀጠሮ በተሳካ ሁኔታ ተሰርዟል',
        FEEDBACK_SUBMITTED: 'አስተያየት በተሳካ ሁኔታ ተልኳል',
        LAWYER_VERIFIED: 'ጠበቃ በተሳካ ሁኔታ ተረጋግጧል',
        VOLUNTEER_APPROVED: 'በጎ ፈቃደኛ በተሳካ ሁኔታ ጸድቋል'
    }
};

// ============================================
// PAGINATION DEFAULTS
// ============================================

const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

// ============================================
// DATE FORMATS
// ============================================

const DATE_FORMATS = {
    DEFAULT: 'YYYY-MM-DD',
    DISPLAY: 'MMM DD, YYYY',
    DISPLAY_TIME: 'MMM DD, YYYY HH:mm',
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    TIME: 'HH:mm'
};

// ============================================
// FILE UPLOAD LIMITS
// ============================================

const FILE_UPLOAD = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx']
};

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMIT = {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // 100 requests per window
    AUTH_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    AUTH_MAX_REQUESTS: 5 // 5 login attempts per hour
};

// ============================================
// CACHE KEYS
// ============================================

const CACHE_KEYS = {
    LAWYERS: 'lawyers',
    SPECIALIZATIONS: 'specializations',
    FORUM_POSTS: 'forum_posts',
    STATISTICS: 'statistics'
};

// ============================================
// CACHE TTL (in seconds)
// ============================================

const CACHE_TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAY: 86400 // 24 hours
};

// ============================================
// DISCLAIMER TEXT
// ============================================

const DISCLAIMER = {
    en: "This is general legal information only and does not constitute legal advice. For specific legal advice, please consult a verified lawyer.",
    am: "ይህ አጠቃላይ የህግ መረጃ ብቻ ነው እንጂ የህግ ምክር አይደለም። ለተወሰነ የህግ ምክር እባክዎን የተረጋገጠ ጠበቃ ያማክሩ።"
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // User Types
    USER_TYPES,
    USER_TYPES_LIST,
    USER_TYPE_LABELS,

    // Lawyer Specializations
    LAWYER_SPECIALIZATIONS,
    LAWYER_SPECIALIZATIONS_LIST,
    LAWYER_SPECIALIZATION_LABELS,

    // Volunteer Types
    VOLUNTEER_TYPES,
    VOLUNTEER_TYPES_LIST,
    VOLUNTEER_TYPE_LABELS,

    // Appointment
    APPOINTMENT_STATUS,
    APPOINTMENT_STATUS_LIST,
    APPOINTMENT_STATUS_LABELS,
    APPOINTMENT_TYPES,
    APPOINTMENT_TYPES_LIST,
    APPOINTMENT_TYPE_LABELS,
    APPOINTMENT_PRIORITY,
    APPOINTMENT_PRIORITY_LIST,
    LOCATION_TYPES,
    LOCATION_TYPES_LIST,

    // Documents
    DOCUMENT_TYPES,
    DOCUMENT_TYPES_LIST,
    DOCUMENT_TYPE_LABELS,
    DOCUMENT_STATUS,
    DOCUMENT_STATUS_LIST,

    // Forum
    FORUM_CATEGORIES,
    FORUM_CATEGORIES_LIST,
    FORUM_CATEGORY_LABELS,
    FORUM_MODERATION_STATUS,
    FORUM_MODERATION_STATUS_LIST,
    FLAG_REASONS,
    FLAG_REASONS_LIST,

    // Notifications
    NOTIFICATION_TYPES,
    NOTIFICATION_TYPES_LIST,
    NOTIFICATION_PRIORITY,
    NOTIFICATION_PRIORITY_LIST,

    // Status
    VERIFICATION_STATUS,
    VERIFICATION_STATUS_LIST,
    AUTHORIZATION_STATUS,
    AUTHORIZATION_STATUS_LIST,
    VOLUNTEER_STATUS,
    VOLUNTEER_STATUS_LIST,

    // Languages
    LANGUAGES,
    LANGUAGES_LIST,
    SUPPORTED_LANGUAGES,

    // Regions
    ETHIOPIAN_REGIONS,

    // Currencies
    CURRENCIES,
    CURRENCIES_LIST,

    // AI Service
    JURISDICTION_TYPES,
    JURISDICTION_TYPES_LIST,

    // System
    SYSTEM_MODULES,
    SYSTEM_MODULES_LIST,
    SEVERITY_LEVELS,
    SEVERITY_LEVELS_LIST,

    // HTTP
    HTTP_STATUS,

    // Messages
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    DISCLAIMER,

    // Pagination
    PAGINATION,

    // Date Formats
    DATE_FORMATS,

    // File Upload
    FILE_UPLOAD,

    // Rate Limiting
    RATE_LIMIT,

    // Cache
    CACHE_KEYS,
    CACHE_TTL
};