'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const path = require('path');

// ─── Middleware ────────────────────────────────────────────────────────────────
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { defaultLimiter } = require('./middleware/rateLimiter');
const { auditLogger } = require('./middleware/auditLogger');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const lawyerRoutes       = require('./routes/lawyerRoutes');
const clientRoutes       = require('./routes/clientRoutes');
const volunteerRoutes    = require('./routes/volunteerRoutes');
const appointmentRoutes  = require('./routes/appointmentRoutes');
const documentRoutes     = require('./routes/documentRoutes');
const aiRoutes           = require('./routes/aiRoutes');
const forumRoutes        = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes        = require('./routes/adminRoutes');

// ─── App Init ─────────────────────────────────────────────────────────────────
const app = express();

// ─── Trust Proxy (for correct client IPs behind Nginx/load balancer) ──────────
app.set('trust proxy', 1);

// ─── Security HTTP Headers ────────────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Allow embedding for PDF viewer
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
            connectSrc: ["'self'"]
        }
    }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173', // Vite default
    process.env.FRONTEND_URL,
    process.env.ALLOWED_ORIGINS
].filter(Boolean).flatMap(o => o.split(',').map(item => item.trim()));

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, mobile apps, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Pages']
}));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Rate Limiting (global) ───────────────────────────────────────────────────
app.use('/api/', defaultLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    // Combined log format in production (logs to stdout, captured by PM2/Docker)
    app.use(morgan('combined', {
        skip: (req) => req.url === '/api/health' // Don't log health checks
    }));
}

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Security: Input Sanitization (Express 5 compatible) ─────────────────────
// Manual sanitization middleware replacing express-mongo-sanitize and xss-clean
// which are incompatible with Express 5's read-only req.query
const sanitizeValue = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key in sanitized) {
        if (key.startsWith('$') || key.includes('.')) {
            delete sanitized[key];
        } else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeValue(sanitized[key]);
        } else if (typeof sanitized[key] === 'string') {
            // Basic XSS strip: remove <script> tags and HTML event handlers
            sanitized[key] = sanitized[key]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
                .replace(/on\w+\s*=\s*'[^']*'/gi, '');
        }
    }
    return sanitized;
};

app.use((req, res, next) => {
    // Sanitize body (writable)
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    // Sanitize params (writable)
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    // NOTE: req.query is read-only in Express 5 — we skip it here.
    // Query params are validated by express-validator in each route.
    next();
});

// Prevent HTTP parameter pollution
app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'practiceArea', 'region']
}));

// ─── Serve Static Uploaded Files (development local storage) ─────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Audit Logging Middleware ─────────────────────────────────────────────────
app.use(auditLogger);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        platform: 'AI Legal Assistance Platform — Ethiopia'
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/lawyers`,       lawyerRoutes);
app.use(`${API}/clients`,       clientRoutes);
app.use(`${API}/volunteers`,    volunteerRoutes);
app.use(`${API}/appointments`,  appointmentRoutes);
app.use(`${API}/documents`,     documentRoutes);
app.use(`${API}/ai`,            aiRoutes);
app.use(`${API}/forum`,         forumRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/admin`,         adminRoutes);

// ─── Diagnostic Route for Troubleshooting 404s ───────────────────────────────
app.get(`${API}/test-lawyers-mount`, (req, res) => {
    res.json({ message: 'Lawyer routes mount point is reachable', path: `${API}/lawyers` });
});

// ─── API Root Info ────────────────────────────────────────────────────────────
app.get(`${API}`, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AI Legal Assistance Platform API',
        version: 'v1',
        documentation: `${process.env.BACKEND_URL || ''}/docs`,
        endpoints: {
            auth:          `${API}/auth`,
            users:         `${API}/users`,
            lawyers:       `${API}/lawyers`,
            clients:       `${API}/clients`,
            volunteers:    `${API}/volunteers`,
            appointments:  `${API}/appointments`,
            documents:     `${API}/documents`,
            ai:            `${API}/ai`,
            forum:         `${API}/forum`,
            notifications: `${API}/notifications`,
            admin:         `${API}/admin`
        }
    });
});

// ─── 404 Handler (must be after all routes) ───────────────────────────────────
app.use(notFound);

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;