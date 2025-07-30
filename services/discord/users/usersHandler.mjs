/**
 * 📁 services/discord/users/usersHandler.mjs
 * ------------------------------------------------
 * Central access point for MongoDB operations.
 *
 * ✅ Wraps DatabaseHandler methods for:
 *    - Players
 *    - Servers
 *
 * ✅ Adds:
 *    - Safe connection checks to avoid repeated errors
 *    - Unified logging
 *    - Exported functions for consistent imports across project
 *
 * Usage:
 *    import { saveGuildConfig, upsertPlayer } from './usersHandler.mjs';
 */

import {DatabaseHandler} from '../../../system/database/databaseHandler.mjs';
import logger from '../../../system/log/logHandler.mjs';

let dbAvailable = false;        // Tracks if DB connection is healthy
let lastErrorLogged = false;    // Prevents log spam for repeated failures

/**
 * Ensures the database connection is established before performing operations.
 * If connection fails:
 *   - Sets dbAvailable = false
 *   - Logs error only once until recovered
 *
 * @returns {Promise<boolean>} True if DB connection is ready
 */
async function safeEnsureConnection() {
    try {
        await DatabaseHandler.ensureConnection();
        if (!dbAvailable) logger.success('✅ Database connection established.');
        dbAvailable = true;
        lastErrorLogged = false; // reset log suppression if recovered
        return true;
    } catch (err) {
        dbAvailable = false;
        if (!lastErrorLogged) {
            logger.error(`❌ Database connection unavailable: ${err.message}`);
            lastErrorLogged = true;
        }
        return false;
    }
}

/* ------------------- PLAYER FUNCTIONS ------------------- */

/**
 * Creates or updates a Player document by ID.
 * @param {string} playerId - Player's internal ID
 * @param {string} discordId - Discord snowflake ID
 */
export async function upsertPlayer(playerId, discordId) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.upsertPlayer(playerId, discordId);
}

/**
 * Links a guild and its roles to a player profile.
 */
export async function linkGuildToPlayer(playerId, guildId, roles = []) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.linkGuildToPlayer(playerId, guildId, roles);
}

/**
 * Adds a player entry to a server instance.
 */
export async function addPlayerToServer(playerId, guildId, serverUuid, serverName, role = 'player') {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.addPlayerToServer(playerId, guildId, serverUuid, serverName, role);
}

/**
 * Logs an item received by a player.
 */
export async function logReceivedItem(playerId, item) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.logReceivedItem(playerId, item);
}

/**
 * Retrieves player data by ID.
 */
export async function getPlayer(playerId) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.getPlayer(playerId);
}

/* ------------------- SERVER FUNCTIONS ------------------- */

/**
 * Saves or updates the configuration for a guild/server.
 */
export async function saveGuildConfig(config) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.saveGuildConfig(config);
}

/**
 * Retrieves a guild's configuration by ID.
 */
export async function getGuildConfig(guildId) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.getGuildConfig(guildId);
}

/**
 * Adds a new server instance to the guild config.
 */
export async function addServerInstance(guildId, serverData) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.addServerInstance(guildId, serverData);
}

/**
 * Logs an item sent out from a server instance.
 */
export async function logSentItem(guildId, serverUuid, item) {
    if (!(await safeEnsureConnection())) return null;
    return DatabaseHandler.logSentItem(guildId, serverUuid, item);
}

/* ------------------- DEFAULT EXPORT ------------------- */
export default {
    upsertPlayer,
    linkGuildToPlayer,
    addPlayerToServer,
    logReceivedItem,
    getPlayer,
    saveGuildConfig,
    getGuildConfig,
    addServerInstance,
    logSentItem
};
