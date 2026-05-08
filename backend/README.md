# ⚖️ AI Legal Assistance Platform — Backend API

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-blue)

A robust, production-ready **RESTful API** for the AI-Enabled Legal Assistance and Lawyer Directory Platform, built for the Ethiopian legal ecosystem with full **Amharic / English** bilingual support.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Directory Structure](#directory-structure)
- [Scripts](#scripts)
- [Security](#security)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Legal Assistant | Google Gemini (with OpenAI fallback) — Ethiopian-law-only jurisdiction enforcement |
| 🌐 Bilingual | Full Amharic & English support across all API responses and emails |
| 👨‍⚖️ Lawyer Directory | Verified lawyer profiles with availability & appointment booking |
| 🤝 Volunteer Advisors | Legal volunteer management (Advisors & Representatives) |
| 📅 Appointments | Full lifecycle: schedule, confirm, reschedule, cancel |
| 📁 Documents | Secure upload (Cloudinary), sharing with permission controls |
| 💬 Legal Forum | Q&A community with categories, tags, expert answers |
| 🔐 Auth | JWT + Refresh Tokens, 2FA, email/phone verification, account locking |
| 📧 Email / 📱 SMS | Nodemailer + Africa's Talking (primary) / Twilio (fallback) |
| 🛡️ Audit Logs | Capped collection audit trail for all critical actions |
| 👑 Admin Panel | User management, verification approvals, statistics, log viewer |

---

## 🏗️ Architecture

```
server.js           ← Entry point, DB bootstrap, graceful shutdown
src/
├── app.js          ← Express app, middleware stack, route mounting
├── config/         ← DB config, auth config, platform constants
├── models/         ← Mongoose schemas (User, Lawyer, Client, etc.)
├── controllers/    ← Business logic handlers
├── routes/         ← Express route definitions
├── middleware/     ← Auth, RBAC, error handling, rate limiting, audit logging
├── services/       ← Email, SMS, AI, file upload, audit services
└── utils/          ← AppError, catchAsync, validators, helpers, formatters, constants
database/
├── migrations/     ← Database migration scripts
└── backups/        ← Database backup archives
docs/               ← API documentation (Swagger/OpenAPI)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB 8 + Mongoose ODM |
| Auth | JWT (jsonwebtoken), bcryptjs |
| AI | Google Gemini 1.5 Flash / OpenAI GPT-4o-mini |
| Email | Nodemailer (SMTP) |
| SMS | Africa's Talking + Twilio fallback |
| File Storage | Cloudinary + local disk fallback |
| Validation | Joi |
| Security | Helmet, CORS, mongo-sanitize, xss-clean, hpp, express-rate-limit |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **MongoDB** ≥ 6.0 (local or Atlas)
- **npm** ≥ 9.0.0

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd ai-legal-assistance-platform/backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env .env.local
# Fill in the required values in .env.local / .env

# 4. Seed the database (optional — creates test data)
npm run seed

# 5. Start development server
npm run dev
```

The API will be available at: `http://localhost:5000/api/v1`

---

## 🔑 Environment Variables

Copy `.env` and fill in the required values. **Key required** variables:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (64+ chars) |
| `EMAIL_USER` / `EMAIL_PASS` | ✅ | SMTP credentials for emails |
| `GEMINI_API_KEY` | ✅ | Google Gemini AI key |
| `CLOUDINARY_*` | ⚠️ | Required for file uploads in production |
| `AT_API_KEY` | ⚠️ | Africa's Talking — Ethiopian SMS |

See `.env` for the full template with descriptions.

---

## 📡 API Endpoints

Base URL: `/api/v1`

| Module | Route | Auth Required |
|---|---|---|
| Health Check | `GET /api/health` | No |
| **Auth** | `/api/v1/auth` | — |
| Register | `POST /auth/register` | No |
| Login | `POST /auth/login` | No |
| Refresh Token | `POST /auth/refresh` | No |
| Logout | `POST /auth/logout` | ✅ |
| Verify Email | `GET /auth/verify-email/:token` | No |
| **Users** | `/api/v1/users` | ✅ |
| **Lawyers** | `/api/v1/lawyers` | — |
| List Lawyers | `GET /lawyers` | No |
| Lawyer Profile | `GET /lawyers/:id` | No |
| **Appointments** | `/api/v1/appointments` | ✅ |
| **AI Assistant** | `/api/v1/ai` | ✅ |
| Submit Query | `POST /ai/query` | ✅ |
| History | `GET /ai/history` | ✅ |
| **Documents** | `/api/v1/documents` | ✅ |
| **Forum** | `/api/v1/forum` | — |
| **Notifications** | `/api/v1/notifications` | ✅ |
| **Admin** | `/api/v1/admin` | ✅ ADMIN only |

---

## 🔐 Security

- **Helmet** — Security HTTP headers
- **CORS** — Whitelist-only origins
- **Rate Limiting** — Global (200 req/15min), Auth (10 req/15min), AI (5 req/min)
- **Mongo Sanitize** — Strips `$` and `.` operators from input
- **XSS Clean** — Sanitizes HTML from user input
- **HPP** — Prevents HTTP parameter pollution
- **bcryptjs** — Password hashing with 12 salt rounds
- **JWT** — Short-lived access tokens (7d) + refresh tokens (30d)
- **Account Locking** — Locks after 5 failed login attempts for 2 hours
- **Audit Logs** — All critical actions logged to capped MongoDB collection
- **Jurisdiction Filtering** — AI assistant blocks non-Ethiopian legal queries

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run seed` | Seed database with test data |
| `npm run seed:reset` | Drop and re-seed the database |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |

---

## 📁 directory Structure

```
backend/
├── .env                    ← Environment variables (DO NOT COMMIT)
├── .gitignore
├── package.json
├── server.js               ← Entry point
├── README.md
├── database/
│   ├── migrations/         ← Database migration scripts
│   └── backups/            ← DB backup archives (.gz)
├── docs/
│   └── api.yaml            ← OpenAPI / Swagger spec
├── uploads/                ← Local file storage (dev only)
└── src/
    ├── app.js              ← Express app
    ├── config/             ← Configuration files
    ├── controllers/        ← Route handlers
    ├── middleware/         ← Auth, error, rate limit, audit
    ├── models/             ← Mongoose schemas
    ├── routes/             ← Express routers
    ├── seeders/            ← Database seeders
    ├── services/           ← Email, SMS, AI, files, audit
    └── utils/              ← Helpers, validators, constants
```

---

> **⚠️ Disclaimer**: The AI assistant on this platform provides **general legal information only** and does not constitute legal advice. Users should consult a verified lawyer for specific legal matters.

> **Ethiopian Law Only**: This platform is designed exclusively for Ethiopian law. Queries involving foreign jurisdictions will be flagged and redirected.
