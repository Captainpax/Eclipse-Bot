// system/database/sqlite/sqliteHandler.mjs

import Database from 'better-sqlite3';
import fs from 'fs';
import logger from '../../log/logHandler.mjs';

const DB_FILE = './eclipse.db';
let db;

/**
 * Initializes the SQLite database and tables
 */
export function initSQLite() {
    const firstTime = !fs.existsSync(DB_FILE);
    db = new Database(DB_FILE);

    if (firstTime) {
        logger.info('🆕 Creating new SQLite database...');
        createTables();
    } else {
        logger.info('📂 SQLite DB loaded.');
    }
}

/**
 * Creates initial tables if they don't exist
 */
function createTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_links
        (
            discord_id TEXT PRIMARY KEY,
            ap_slot    TEXT,
            roles      TEXT
        );

        CREATE TABLE IF NOT EXISTS messages
        (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            source    TEXT,
            type      TEXT,
            content   TEXT,
            sender    TEXT
        );

        CREATE TABLE IF NOT EXISTS received_items
        (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            slot_name TEXT,
            team      INTEGER,
            item_name TEXT,
            sender    TEXT
        );
    `);

    logger.info('📐 Tables created.');
}

/**
 * Saves or updates a user link
 */
export function upsertUserLink(discordId, apSlot, roles = ['player']) {
    const roleStr = roles.join(',');
    const stmt = db.prepare(`
        INSERT INTO user_links (discord_id, ap_slot, roles)
        VALUES (?, ?, ?)
        ON CONFLICT(discord_id) DO UPDATE SET ap_slot = excluded.ap_slot,
                                              roles   = excluded.roles;
    `);
    stmt.run(discordId, apSlot, roleStr);
}

/**
 * Gets a user link by Discord ID
 */
export function getUserLink(discordId) {
    const row = db.prepare('SELECT * FROM user_links WHERE discord_id = ?').get(discordId);
    if (!row) return null;
    return {
        discordId: row.discord_id,
        apSlot: row.ap_slot,
        roles: row.roles ? row.roles.split(',') : ['player'],
    };
}

/**
 * Logs a message (chat, hint, trade, etc)
 */
export function logMessage({source, type, content, sender}) {
    db.prepare(`
        INSERT INTO messages (timestamp, source, type, content, sender)
        VALUES (?, ?, ?, ?, ?)
    `).run(Math.floor(Date.now() / 1000), source, type, content, sender);
}

/**
 * Logs a received item for tracking
 */
export function logReceivedItem({slot_name, team, item_name, sender}) {
    db.prepare(`
        INSERT INTO received_items (timestamp, slot_name, team, item_name, sender)
        VALUES (?, ?, ?, ?, ?)
    `).run(Math.floor(Date.now() / 1000), slot_name, team, item_name, sender);
}

/**
 * Gets all received items for a specific slot
 */
export function getItemsBySlot(slotName) {
    return db.prepare(`
        SELECT *
        FROM received_items
        WHERE slot_name = ?
        ORDER BY timestamp DESC
    `).all(slotName);
}