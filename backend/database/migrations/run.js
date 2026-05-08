#!/usr/bin/env node
/**
 * Migration Runner
 * Executes pending database migrations in order.
 *
 * Usage:
 *   node database/migrations/run.js            # run all pending
 *   node database/migrations/run.js --rollback # rollback latest
 *   node database/migrations/run.js --status   # show migration status
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ─── Migration Tracking Schema ─────────────────────────────────────────────────
const migrationSchema = new mongoose.Schema({
    name:      { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
    batch:     { type: Number, required: true }
});
const Migration = mongoose.model('Migration', migrationSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const log = {
    info:    (msg) => console.log(`  ℹ️  ${msg}`),
    success: (msg) => console.log(`  ✅ ${msg}`),
    warn:    (msg) => console.log(`  ⚠️  ${msg}`),
    error:   (msg) => console.error(`  ❌ ${msg}`)
};

const getMigrationFiles = () => {
    const dir = __dirname;
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.js') && f !== 'run.js' && f !== 'template.js')
        .sort(); // Alphabetical = chronological if filenames are timestamped
};

const getAppliedMigrations = async () => {
    const applied = await Migration.find().sort({ batch: 1, appliedAt: 1 });
    return applied.map(m => m.name);
};

const getNextBatch = async () => {
    const last = await Migration.findOne().sort({ batch: -1 });
    return last ? last.batch + 1 : 1;
};

// ─── Run ──────────────────────────────────────────────────────────────────────
const runMigrations = async () => {
    const files = getMigrationFiles();
    const applied = await getAppliedMigrations();
    const pending = files.filter(f => !applied.includes(f));

    if (pending.length === 0) {
        log.info('No pending migrations.');
        return;
    }

    const batch = await getNextBatch();
    log.info(`Running batch ${batch}: ${pending.length} migration(s)...`);

    for (const file of pending) {
        log.info(`Running: ${file}`);
        try {
            const migration = require(path.join(__dirname, file));
            await migration.up(mongoose.connection);
            await Migration.create({ name: file, batch });
            log.success(`Applied: ${file}`);
        } catch (err) {
            log.error(`Failed: ${file} — ${err.message}`);
            throw err;
        }
    }
    log.success(`Completed batch ${batch}.`);
};

// ─── Rollback ─────────────────────────────────────────────────────────────────
const rollbackLatest = async () => {
    const last = await Migration.findOne().sort({ batch: -1 });
    if (!last) { log.info('Nothing to rollback.'); return; }

    const batchMigrations = await Migration.find({ batch: last.batch }).sort({ appliedAt: -1 });
    log.info(`Rolling back batch ${last.batch}: ${batchMigrations.length} migration(s)...`);

    for (const m of batchMigrations) {
        log.info(`Rolling back: ${m.name}`);
        try {
            const migration = require(path.join(__dirname, m.name));
            if (migration.down) {
                await migration.down(mongoose.connection);
            }
            await Migration.deleteOne({ name: m.name });
            log.success(`Rolled back: ${m.name}`);
        } catch (err) {
            log.error(`Failed rollback: ${m.name} — ${err.message}`);
            throw err;
        }
    }
};

// ─── Status ───────────────────────────────────────────────────────────────────
const showStatus = async () => {
    const files = getMigrationFiles();
    const applied = await getAppliedMigrations();

    console.log('\n  Migration Status:');
    console.log('  ' + '─'.repeat(50));
    for (const file of files) {
        const status = applied.includes(file) ? '✅ Applied  ' : '⏳ Pending  ';
        console.log(`  ${status} ${file}`);
    }
    if (files.length === 0) console.log('  No migration files found.');
    console.log('');
};

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
    const args = process.argv.slice(2);
    const action = args[0];

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log.success('Connected to MongoDB');

        if (action === '--rollback') {
            await rollbackLatest();
        } else if (action === '--status') {
            await showStatus();
        } else {
            await runMigrations();
        }
    } catch (err) {
        log.error(err.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
})();
