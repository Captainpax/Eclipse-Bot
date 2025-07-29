// 📁 services/system/database/sqlite/sqliteHandler.mjs

import sqlite3 from 'sqlite3';
import {open} from 'sqlite';
import fs from 'fs';
import path from 'path';
import logger from '../../log/logHandler.mjs';

const DB_FILE = process.env.SQLITE_DB_FILE || './eclipse.db';
let db = null;

export default {
    /**
     * Connect to SQLite database
     */
    async connect() {
        db = await open({
            filename: DB_FILE,
            driver: sqlite3.Database,
        });

        logger.debug(`🔌 Connected to SQLite at ${DB_FILE}`);
    },

    /**
     * Syncs DB schema from schema.sql file
     */
    async syncSchema() {
        const schemaPath = path.resolve('./system/database/sqlite/schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        await db.exec(schemaSQL);
        logger.debug('📐 Schema synced from schema.sql');
    },

    /**
     * Returns the active db connection
     */
    get() {
        if (!db) throw new Error('❌ DB not connected.');
        return db;
    },

    /**
     * Upserts a linked user with roles
     * @param {string} discordId
     * @param {string} apSlot
     * @param {string[]} roles
     */
    async upsertUserLink(discordId, apSlot, roles = ['player']) {
        const roleStr = roles.join(',');
        await db.run(`
            INSERT INTO linked_users (user_id, player_name, roles)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET player_name = excluded.player_name,
                                               roles       = excluded.roles;
        `, [discordId, apSlot, roleStr]);
    },

    /**
     * Retrieves a user link by Discord ID
     * @param {string} discordId
     */
    async getUserLink(discordId) {
        const row = await db.get('SELECT * FROM linked_users WHERE user_id = ?', [discordId]);
        if (!row) return null;
        return {
            discordId: row.user_id,
            apSlot: row.player_name,
            roles: row.roles ? row.roles.split(',') : ['player'],
        };
    },

    /**
     * Logs a message to the messages table
     * @param {{ source: string, type: string, content: string, sender: string }} message
     */
    async logMessage({source, type, content, sender}) {
        await db.run(`
            INSERT INTO messages (timestamp, source, type, content, sender)
            VALUES (?, ?, ?, ?, ?)
        `, [Math.floor(Date.now() / 1000), source, type, content, sender]);
    },

    /**
     * Logs a received item to the received_items table
     * @param {{ slot_name: string, team: number, item_name: string, sender: string }} item
     */
    async logReceivedItem({slot_name, team, item_name, sender}) {
        await db.run(`
            INSERT INTO received_items (timestamp, slot_name, team, item_name, sender)
            VALUES (?, ?, ?, ?, ?)
        `, [Math.floor(Date.now() / 1000), slot_name, team, item_name, sender]);
    },

    /**
     * Retrieves received items for a specific slot
     * @param {string} slotName
     */
    async getItemsBySlot(slotName) {
        return await db.all(`
            SELECT *
            FROM received_items
            WHERE slot_name = ?
            ORDER BY timestamp DESC
        `, [slotName]);
    }
};
