const mongoose = require('mongoose');

/**
 * Database connection configuration
 * Handles connection to MongoDB with proper error handling
 * and connection events
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Connection pool settings
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            // Retry writes
            retryWrites: true,
            retryReads: true
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📦 Database Name: ${conn.connection.name}`);
        console.log(`🔌 Connection Pool Size: ${conn.connection.client.topology?.maxPoolSize}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

/**
 * Create database indexes for performance
 * This ensures all queries are optimized
 */
const createIndexes = async () => {
    try {
        const db = mongoose.connection;

        // Users collection indexes
        await db.collection('users').createIndexes([
            { key: { email: 1 }, unique: true, name: 'email_unique' },
            { key: { phone: 1 }, unique: true, name: 'phone_unique' },
            { key: { username: 1 }, unique: true, name: 'username_unique' },
            { key: { userType: 1 }, name: 'user_type_index' },
            { key: { isVerified: 1 }, name: 'verification_index' },
            { key: { createdAt: -1 }, name: 'created_at_index' }
        ]);

        // Lawyers collection indexes
        await db.collection('lawyers').createIndexes([
            { key: { userId: 1 }, unique: true, name: 'lawyer_user_id_unique' },
            { key: { licenseNumber: 1 }, unique: true, name: 'license_number_unique' },
            { key: { specialization: 1 }, name: 'specialization_index' },
            { key: { rating: -1 }, name: 'rating_index' },
            { key: { verificationStatus: 1 }, name: 'verification_status_index' },
            { key: { 'location.city': 1 }, name: 'city_index' }
        ]);

        // Appointments collection indexes
        await db.collection('appointments').createIndexes([
            { key: { clientId: 1, date: -1 }, name: 'client_appointments_index' },
            { key: { lawyerId: 1, date: -1 }, name: 'lawyer_appointments_index' },
            { key: { date: 1, status: 1 }, name: 'date_status_index' },
            { key: { appointmentId: 1 }, unique: true, name: 'appointment_id_unique' },
            { key: { createdAt: -1 }, name: 'appointment_created_index' }
        ]);

        // Documents collection indexes
        await db.collection('documents').createIndexes([
            { key: { ownerId: 1, createdAt: -1 }, name: 'owner_documents_index' },
            { key: { 'sharedWith.userId': 1 }, name: 'shared_documents_index' },
            { key: { documentType: 1 }, name: 'document_type_index' },
            { key: { verificationStatus: 1 }, name: 'document_verification_index' },
            { key: { documentId: 1 }, unique: true, name: 'document_id_unique' }
        ]);

        // Forum posts collection indexes
        await db.collection('forumposts').createIndexes([
            { key: { authorId: 1, createdAt: -1 }, name: 'author_posts_index' },
            { key: { category: 1, createdAt: -1 }, name: 'category_posts_index' },
            { key: { moderationStatus: 1 }, name: 'moderation_status_index' },
            { key: { flagCount: -1 }, name: 'flagged_posts_index' },
            { key: { createdAt: -1 }, name: 'post_date_index' }
        ]);

        // AI Responses collection indexes
        await db.collection('airesponses').createIndexes([
            { key: { userId: 1, createdAt: -1 }, name: 'user_ai_index' },
            { key: { jurisdictionDetected: 1 }, name: 'jurisdiction_index' },
            { key: { createdAt: -1 }, name: 'ai_date_index' }
        ]);

        // Notifications collection indexes
        await db.collection('notifications').createIndexes([
            { key: { userId: 1, createdAt: -1 }, name: 'user_notifications_index' },
            { key: { isRead: 1 }, name: 'read_status_index' },
            { key: { type: 1 }, name: 'notification_type_index' }
        ]);

        // System logs collection indexes
        await db.collection('systemlogs').createIndexes([
            { key: { userId: 1, timestamp: -1 }, name: 'user_logs_index' },
            { key: { module: 1, timestamp: -1 }, name: 'module_logs_index' },
            { key: { severity: 1 }, name: 'severity_index' },
            { key: { timestamp: -1 }, name: 'timestamp_index' },
            { key: { action: 1 }, name: 'action_index' }
        ]);

        console.log('✅ Database indexes created successfully');
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
    }
};

/**
 * Drop all indexes (for development/testing only)
 */
const dropIndexes = async () => {
    if (process.env.NODE_ENV === 'development') {
        try {
            const db = mongoose.connection;
            const collections = await db.db.listCollections().toArray();

            for (const collection of collections) {
                await db.collection(collection.name).dropIndexes();
                console.log(`Dropped indexes for ${collection.name}`);
            }
            console.log('✅ All indexes dropped');
        } catch (error) {
            console.error('Error dropping indexes:', error);
        }
    }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
    try {
        const db = mongoose.connection;
        const stats = await db.db.stats();

        return {
            collections: stats.collections,
            documents: stats.objects,
            dataSize: (stats.dataSize / (1024 * 1024)).toFixed(2) + ' MB',
            storageSize: (stats.storageSize / (1024 * 1024)).toFixed(2) + ' MB',
            indexes: stats.indexes,
            indexSize: (stats.indexSize / (1024 * 1024)).toFixed(2) + ' MB'
        };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return null;
    }
};

/**
 * Perform database backup (simplified version)
 * In production, use MongoDB Atlas backups or mongodump
 */
const backupDatabase = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./database/backups/backup-${timestamp}`;

    console.log(`📦 Creating database backup at ${backupPath}`);
    // This would use mongodump in production
    // For now, just log the intent
    console.log('✅ Database backup completed (simulated)');

    return backupPath;
};

/**
 * Validate database connection
 */
const validateConnection = () => {
    const state = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    return {
        isConnected: state === 1,
        state: states[state] || 'unknown',
        host: mongoose.connection.host,
        name: mongoose.connection.name
    };
};

module.exports = {
    connectDB,
    createIndexes,
    dropIndexes,
    getDatabaseStats,
    backupDatabase,
    validateConnection
};
