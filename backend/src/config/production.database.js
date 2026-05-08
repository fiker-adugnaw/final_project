const mongoose = require('mongoose');

/**
 * Production database configuration
 * Includes connection pooling, retry logic, and monitoring
 */
const productionDBConfig = {
    // Connection options
    options: {
        // Connection pool settings
        maxPoolSize: 50,
        minPoolSize: 10,

        // Timeouts
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,

        // Retry settings
        retryWrites: true,
        retryReads: true,

        // Write concern
        w: 'majority',
        wtimeoutMS: 10000,

        // Read preference
        readPreference: 'secondaryPreferred',

        // Compression
        compressors: ['snappy', 'zlib'],

        // Keep alive
        keepAlive: true,
        keepAliveInitialDelay: 300000,

        // Authentication
        authSource: 'admin',

        // SSL
        ssl: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false
    },

    // Monitoring configuration
    monitoring: {
        // Enable mongoose debug in development only
        debug: process.env.NODE_ENV === 'development',

        // Monitor slow queries (queries taking more than 100ms)
        slowQueryThreshold: 100,

        // Log slow queries
        onSlowQuery: (duration, query) => {
            console.warn(`⚠️ Slow query (${duration}ms):`, query);
        }
    },

    // Connection events
    events: {
        onConnected: () => {
            console.log('✅ Production database connected');
        },

        onError: (err) => {
            console.error('❌ Production database error:', err);
        },

        onDisconnected: () => {
            console.warn('⚠️ Production database disconnected');
        },

        onReconnected: () => {
            console.log('✅ Production database reconnected');
        }
    },

    // Retry logic
    retry: {
        maxRetries: 5,
        retryDelay: 5000, // 5 seconds
        retryCondition: (error) => {
            // Retry on network errors or transient errors
            return error.name === 'MongoNetworkError' ||
                error.message.includes('timed out') ||
                error.message.includes('failed to connect');
        }
    }
};

/**
 * Connect to production database with retry logic
 */
const connectProductionDB = async (retryCount = 0) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, productionDBConfig.options);

        // Set up event listeners
        mongoose.connection.on('connected', productionDBConfig.events.onConnected);
        mongoose.connection.on('error', productionDBConfig.events.onError);
        mongoose.connection.on('disconnected', productionDBConfig.events.onDisconnected);
        mongoose.connection.on('reconnected', productionDBConfig.events.onReconnected);

        // Monitor slow queries
        if (productionDBConfig.monitoring.debug) {
            mongoose.set('debug', (collectionName, method, query, doc) => {
                console.log(`🔍 MongoDB: ${collectionName}.${method}`, { query, doc });
            });
        }

        return mongoose.connection;
    } catch (error) {
        if (retryCount < productionDBConfig.retry.maxRetries &&
            productionDBConfig.retry.retryCondition(error)) {
            console.log(`🔄 Retrying connection (${retryCount + 1}/${productionDBConfig.retry.maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, productionDBConfig.retry.retryDelay));
            return connectProductionDB(retryCount + 1);
        }
        throw error;
    }
};

module.exports = {
    productionDBConfig,
    connectProductionDB
};
