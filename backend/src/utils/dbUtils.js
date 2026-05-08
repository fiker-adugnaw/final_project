const mongoose = require('mongoose');
const SystemLog = require('../models/SystemLog');

/**
 * Database utility functions
 */
const dbUtils = {
    /**
     * Check database health
     */
    checkHealth: async () => {
        try {
            const state = mongoose.connection.readyState;
            const states = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };

            if (state === 1) {
                // Run a simple query to verify connection
                await mongoose.connection.db.admin().ping();

                return {
                    status: 'healthy',
                    state: states[state],
                    host: mongoose.connection.host,
                    name: mongoose.connection.name,
                    collections: await mongoose.connection.db.listCollections().toArray().then(c => c.length)
                };
            }

            return {
                status: 'unhealthy',
                state: states[state]
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    },

    /**
     * Get database statistics
     */
    getStats: async () => {
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();

            const collections = await db.listCollections().toArray();
            const collectionStats = await Promise.all(
                collections.map(async (col) => {
                    const count = await db.collection(col.name).countDocuments();
                    return {
                        name: col.name,
                        count
                    };
                })
            );

            return {
                database: mongoose.connection.name,
                collections: stats.collections,
                documents: stats.objects,
                dataSize: (stats.dataSize / (1024 * 1024)).toFixed(2) + ' MB',
                storageSize: (stats.storageSize / (1024 * 1024)).toFixed(2) + ' MB',
                indexes: stats.indexes,
                indexSize: (stats.indexSize / (1024 * 1024)).toFixed(2) + ' MB',
                collectionDetails: collectionStats
            };
        } catch (error) {
            throw new Error(`Failed to get database stats: ${error.message}`);
        }
    },

    /**
     * Perform database backup (simplified)
     */
    backup: async (backupPath = './database/backups') => {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        const fs = require('fs');
        const path = require('path');

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.gz`;
        const filepath = path.join(backupPath, filename);

        // Get database name from connection string
        const dbName = mongoose.connection.name;

        // Build mongodump command
        const cmd = `mongodump --uri="${process.env.MONGODB_URI}" --archive="${filepath}" --gzip`;

        try {
            await execPromise(cmd);

            // Log backup
            await SystemLog.create({
                action: 'DATABASE_BACKUP',
                module: 'SYSTEM',
                severity: 'INFO',
                details: {
                    filename,
                    size: fs.statSync(filepath).size
                }
            });

            return {
                success: true,
                filepath,
                filename,
                size: fs.statSync(filepath).size
            };
        } catch (error) {
            throw new Error(`Backup failed: ${error.message}`);
        }
    },

    /**
     * Restore database from backup (simplified)
     */
    restore: async (filepath) => {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        const fs = require('fs');

        if (!fs.existsSync(filepath)) {
            throw new Error(`Backup file not found: ${filepath}`);
        }

        // Build mongorestore command
        const cmd = `mongorestore --uri="${process.env.MONGODB_URI}" --archive="${filepath}" --gzip --drop`;

        try {
            await execPromise(cmd);

            // Log restore
            await SystemLog.create({
                action: 'DATABASE_RESTORE',
                module: 'SYSTEM',
                severity: 'WARNING',
                details: {
                    filepath
                }
            });

            return {
                success: true,
                message: 'Database restored successfully'
            };
        } catch (error) {
            throw new Error(`Restore failed: ${error.message}`);
        }
    },

    /**
     * Get database version and info
     */
    getVersion: async () => {
        try {
            const admin = mongoose.connection.db.admin();
            const buildInfo = await admin.buildInfo();

            return {
                version: buildInfo.version,
                gitVersion: buildInfo.gitVersion,
                platform: buildInfo.platform,
                bits: buildInfo.bits
            };
        } catch (error) {
            throw new Error(`Failed to get database version: ${error.message}`);
        }
    },

    /**
     * Run aggregation pipeline
     */
    aggregate: async (collection, pipeline) => {
        try {
            return await mongoose.connection.db
                .collection(collection)
                .aggregate(pipeline)
                .toArray();
        } catch (error) {
            throw new Error(`Aggregation failed: ${error.message}`);
        }
    },

    /**
     * Get collection names
     */
    getCollections: async () => {
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            return collections.map(c => c.name);
        } catch (error) {
            throw new Error(`Failed to get collections: ${error.message}`);
        }
    },

    /**
     * Count documents in collection
     */
    countDocuments: async (collection, query = {}) => {
        try {
            return await mongoose.connection.db
                .collection(collection)
                .countDocuments(query);
        } catch (error) {
            throw new Error(`Failed to count documents: ${error.message}`);
        }
    },

    /**
     * Run a transaction (for MongoDB 4.0+)
     */
    runTransaction: async (callback) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const result = await callback(session);
            await session.commitTransaction();
            session.endSession();
            return result;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
};

module.exports = dbUtils;
