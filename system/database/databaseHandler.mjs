/**
 * 📁 system/database/databaseHandler.mjs
 * ------------------------------------------------------------
 * Proxy layer between bot services and the core MongoDB handler.
 *
 * ✅ Imports the actual DatabaseHandler from mongoHandler.mjs
 * ✅ Provides consistent, centralized access to all database operations
 * ✅ Adds safe guards if functions are missing (dynamic import scenarios)
 *
 * Usage Example:
 *   import { saveGuildConfig, getPlayer } from '../../../system/database/databaseHandler.mjs';
 */

import {DatabaseHandler} from './mongo/mongoHandler.mjs';
import logger from '../log/logHandler.mjs';

/* ========================================================================
   UTILITY: SAFE CALLER
   ======================================================================== */
/**
 * Safely calls a function from DatabaseHandler, logging if undefined.
 * @param {string} fn - The function name in DatabaseHandler
 * @param  {...any} args - Arguments to pass
 * @returns {Promise<any|null>}
 */
async function safeCall(fn, ...args) {
    if (typeof DatabaseHandler[fn] !== 'function') {
        logger.error(`⚠️ DatabaseHandler.${fn} is not a function or not yet loaded.`);
        return null;
    }
    return DatabaseHandler[fn](...args);
}

/* ========================================================================
   CONNECTION
   ======================================================================== */
/**
 * Ensures the database connection is established before performing operations.
 * Can be called at bot startup or after env variables change dynamically.
 */
export async function connectDatabase() {
    return safeCall('ensureConnection');
}

/* ========================================================================
   PLAYER FUNCTIONS
   ======================================================================== */

/**
 * Creates or updates a Player document by ID.
 */
export async function upsertPlayer(playerId, discordId) {
    return safeCall('upsertPlayer', playerId, discordId);
}

/**
 * Links a guild and its roles to a player profile.
 */
export async function linkGuildToPlayer(playerId, guildId, roles = []) {
    return safeCall('linkGuildToPlayer', playerId, guildId, roles);
}

/**
 * Adds a player entry to a server instance.
 */
export async function addPlayerToServer(playerId, guildId, serverUuid, serverName, role = 'player') {
    return safeCall('addPlayerToServer', playerId, guildId, serverUuid, serverName, role);
}

/**
 * Logs an item received by a player.
 */
export async function logReceivedItem(playerId, item) {
    return safeCall('logReceivedItem', playerId, item);
}

/**
 * Retrieves player data by ID.
 */
export async function getPlayer(playerId) {
    return safeCall('getPlayer', playerId);
}

/* ========================================================================
   SERVER FUNCTIONS
   ======================================================================== */

/**
 * Saves or updates the configuration for a guild/server.
 */
export async function saveGuildConfig(config) {
    return safeCall('saveGuildConfig', config);
}

/**
 * Retrieves a guild's configuration by ID.
 */
export async function getGuildConfig(guildId) {
    return safeCall('getGuildConfig', guildId);
}

/**
 * Adds a new server instance to the guild config.
 */
export async function addServerInstance(guildId, serverData) {
    return safeCall('addServerInstance', guildId, serverData);
}

/**
 * Logs an item sent out from a server instance.
 */
export async function logSentItem(guildId, serverUuid, item) {
    return safeCall('logSentItem', guildId, serverUuid, item);
}

/* ========================================================================
   MODEL GETTERS
   ======================================================================== */

/**
 * Retrieves the Player mongoose model.
 */
export function getPlayerModel() {
    return typeof DatabaseHandler.getPlayerModel === 'function'
        ? DatabaseHandler.getPlayerModel()
        : null;
}

/**
 * Retrieves the Server mongoose model.
 */
export function getServerModel() {
    return typeof DatabaseHandler.getServerModel === 'function'
        ? DatabaseHandler.getServerModel()
        : null;
}

/* ========================================================================
   DEFAULT EXPORT
   ======================================================================== */
export default {
    connectDatabase,
    upsertPlayer,
    linkGuildToPlayer,
    addPlayerToServer,
    logReceivedItem,
    getPlayer,
    saveGuildConfig,
    getGuildConfig,
    addServerInstance,
    logSentItem,
    getPlayerModel,
    getServerModel
};
