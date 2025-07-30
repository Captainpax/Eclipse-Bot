/**
 * DatabaseHandler Proxy
 *
 * Central access point for MongoDB operations.
 * Wraps the DatabaseHandler object from mongoHandler.mjs
 * so all services import from here instead of directly importing mongoHandler.
 */

import {DatabaseHandler} from './mongo/mongoHandler.mjs';

/**
 * Ensures the database connection is established before performing operations.
 */
export async function connectDatabase() {
    await DatabaseHandler.ensureConnection();
}

/**
 * PLAYER FUNCTIONS
 */
export async function upsertPlayer(playerId, discordId) {
    return DatabaseHandler.upsertPlayer(playerId, discordId);
}

export async function linkGuildToPlayer(playerId, guildId, roles = []) {
    return DatabaseHandler.linkGuildToPlayer(playerId, guildId, roles);
}

export async function addPlayerToServer(playerId, guildId, serverUuid, serverName, role = 'player') {
    return DatabaseHandler.addPlayerToServer(playerId, guildId, serverUuid, serverName, role);
}

export async function logReceivedItem(playerId, item) {
    return DatabaseHandler.logReceivedItem(playerId, item);
}

export async function getPlayer(playerId) {
    return DatabaseHandler.getPlayer(playerId);
}

/**
 * SERVER FUNCTIONS
 */
export async function saveGuildConfig(config) {
    return DatabaseHandler.saveGuildConfig(config);
}

export async function getGuildConfig(guildId) {
    return DatabaseHandler.getGuildConfig(guildId);
}

export async function addServerInstance(guildId, serverData) {
    return DatabaseHandler.addServerInstance(guildId, serverData);
}

export async function logSentItem(guildId, serverUuid, item) {
    return DatabaseHandler.logSentItem(guildId, serverUuid, item);
}

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
    logSentItem
};
