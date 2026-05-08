/**
 * Migration Template
 * Copy this file and rename it with a timestamp prefix:
 *   e.g. 20260321_001_add_lawyer_rating_field.js
 *
 * Then implement the `up` and `down` functions.
 */

'use strict';

/**
 * Run this migration (apply changes)
 * @param {import('mongoose').Connection} db
 */
const up = async (db) => {
    // Example: Add a field to all lawyers
    // await db.collection('lawyers').updateMany({}, { $set: { averageRating: 0 } });

    // Example: Create a new index
    // await db.collection('users').createIndex({ username: 1 }, { unique: true });

    // Example: Rename a field
    // await db.collection('appointments').updateMany({}, { $rename: { 'oldField': 'newField' } });

    console.log('Migration up: (template — no changes applied)');
};

/**
 * Rollback this migration (undo changes)
 * @param {import('mongoose').Connection} db
 */
const down = async (db) => {
    // Undo the changes applied in `up`
    // await db.collection('lawyers').updateMany({}, { $unset: { averageRating: '' } });

    console.log('Migration down: (template — no changes rolled back)');
};

module.exports = { up, down };
