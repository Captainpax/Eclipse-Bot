// 📁 services/system/database/databaseHandler.mjs

import sqlite from './sqlite/sqliteHandler.mjs';
import logger from '../log/logHandler.mjs';

/**
 * Initializes the database connection and syncs schema.
 * @returns {Promise<void>}
 */
export async function initDatabase() {
    logger.info('🗄️ Initializing database...');
    try {
        await sqlite.connect();
        await sqlite.syncSchema();
        logger.success('✅ Database initialized and schema synced.');
    } catch (err) {
        logger.error('❌ Failed to initialize database:', err);
    }
}

/**
 * Re-export of getUserLink from sqliteHandler for external access.
 * @param {string} discordId
 * @returns {Promise<object|null>}
 */
export async function getUserLink(discordId) {
    return await sqlite.getUserLink(discordId);
}

/**
 * Re-export of logReceivedItem from sqliteHandler for external access.
 * @param {object} item
 * @returns {Promise<void>}
 */
export async function logReceivedItem(item) {
    return await sqlite.logReceivedItem(item);
}
