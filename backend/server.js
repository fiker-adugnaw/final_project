'use strict';

/**
 * Server Entry Point
 * AI Legal Assistance Platform — Ethiopia
 * Bootstraps MongoDB connection, starts HTTP server, handles graceful shutdown.
 */

// Load environment variables first (before any other imports)
require('dotenv').config();

const mongoose = require('mongoose');
const http = require('http');
const app = require('./src/app');

// ─── Environment ──────────────────────────────────────────────────────────────
const PORT    = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI;

// ─── Validate Required Environment Variables ───────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
    console.error(`\n❌ Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('   Please check your .env file.\n');
    process.exit(1);
}

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
    const opts = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4 // Use IPv4, skip trying IPv6
    };

    try {
        const conn = await mongoose.connect(MONGODB_URI, opts);
        console.log(`\n✅ MongoDB connected: ${conn.connection.host} (${conn.connection.name})`);

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected.');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
        });

    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    }
};

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const start = async () => {
    await connectDB();

    server.listen(PORT, () => {
        console.log('\n══════════════════════════════════════════════════════');
        console.log('  ⚖️  AI Legal Assistance Platform — Ethiopia');
        console.log('══════════════════════════════════════════════════════');
        console.log(`  🚀  Server running on port ${PORT}`);
        console.log(`  🌍  Environment : ${NODE_ENV}`);
        console.log(`  📡  API Base    : http://localhost:${PORT}/api/v1`);
        console.log(`  🏥  Health      : http://localhost:${PORT}/api/health`);
        console.log('══════════════════════════════════════════════════════\n');
    });
};

// ─── Uncaught Exception / Rejection Handlers ──────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.name, err.message);
    console.error(err.stack);
    // Give the server a moment to finish in-flight requests
    server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
    console.log(`\n📴 ${signal} received — shutting down gracefully...`);

    server.close(async () => {
        console.log('💤 HTTP server closed.');
        try {
            await mongoose.connection.close(false);
            console.log('💤 MongoDB connection closed.');
        } catch (err) {
            console.error('Error closing MongoDB:', err.message);
        }
        process.exit(0);
    });

    // Force shutdown if graceful shutdown takes too long
    setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout.');
        process.exit(1);
    }, 30000); // 30 seconds
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ─── Start ────────────────────────────────────────────────────────────────────
start();
