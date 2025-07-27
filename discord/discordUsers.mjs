/*
 * discord/discordUsers.mjs
 *
 * Manages linking between Discord users and Archipelago slot names.
 * Stores data persistently using SQLite.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'discordUsers.db');

let db = null;

/**
 * Initializes the SQLite database connection and schema if not exists.
 */
export async function initUserDB() {
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database,
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS user_links (
      discord_id TEXT NOT NULL,
      slot_name TEXT NOT NULL,
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (discord_id, slot_name)
    )
  `);

    logger.debug('[discordUsers] User DB initialized');
}

/**
 * Links a Discord user to an Archipelago slot name.
 * @param {string} discordId - The Discord user ID.
 * @param {string} slotName - The Archipelago slot name.
 */
export async function linkSlot(discordId, slotName) {
    try {
        await db.run(
            'INSERT OR IGNORE INTO user_links (discord_id, slot_name) VALUES (?, ?)',
            discordId,
            slotName
        );
        return true;
    } catch (err) {
        logger.error('[discordUsers] Failed to link slot:', err);
        return false;
    }
}

/**
 * Retrieves all slots linked to a specific Discord user.
 * @param {string} discordId - The Discord user ID.
 * @returns {Promise<string[]>} List of slot names
 */
export async function getLinkedSlots(discordId) {
    try {
        const rows = await db.all('SELECT slot_name FROM user_links WHERE discord_id = ?', discordId);
        return rows.map(row => row.slot_name);
    } catch (err) {
        logger.error('[discordUsers] Failed to retrieve linked slots:', err);
        return [];
    }
}
