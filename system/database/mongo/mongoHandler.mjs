/**
 * @fileoverview
 * Handles MongoDB connection and models for Eclipse-Bot.
 * - Retries on DNS/auth failures
 * - Uses credentials from `.env`
 * - Provides Player and Server models and related DB helper functions
 */

import mongoose from 'mongoose';
import logger from '../../log/logHandler.mjs';
import {playerSchema, serverConfigSchema,} from './mongoSchemas.mjs';

let connection = null;
let Player = null;
let Server = null;
let currentUri = process.env.MONGO_URI || null;

// Schema definitions are imported from mongoSchemas.mjs. See that file for details.

/**
 * Attempts to connect to MongoDB with retry support
 * @param {string} uri Mongo connection URI
 * @param {number} retries Number of retries
 * @returns {Promise<mongoose.Connection>}
 */
async function tryConnect(uri, retries = 3) {
    const mongoUser = process.env.MONGO_USER;
    const mongoPass = process.env.MONGO_PASS;
    const dbName = process.env.MONGO_DB_NAME || 'ecbot';

    for (let i = 1; i <= retries; i++) {
        try {
            logger.info(`🌐 [${i}/${retries}] Connecting to MongoDB at: ${uri}`);
            return await mongoose.connect(uri, {
                dbName,
                user: mongoUser,
                pass: mongoPass,
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
            });
        } catch (err) {
            if (err.message.includes('ENOTFOUND')) {
                logger.error(`🌐 DNS lookup failed for MongoDB host (attempt ${i}).`);
            } else if (err.code === 18 || err.message.includes('Authentication')) {
                logger.error(`🔑 Authentication failed (attempt ${i}). Check MONGO_USER/PASS.`);
            } else {
                logger.error(`🔥 MongoDB connection error (attempt ${i}): ${err.message}`);
            }
            if (i < retries) {
                await new Promise((res) => setTimeout(res, 3000));
                continue;
            }
            throw err;
        }
    }
}

/**
 * Ensures a working connection to MongoDB.
 * Creates models on first successful connection.
 * @returns {Promise<mongoose.Connection|null>}
 */
export async function ensureConnection() {
    const newUri = process.env.MONGO_URI;
    if (!newUri) {
        logger.warn('⚠️ MONGO_URI not defined yet (setup incomplete). Skipping DB connection.');
        return null;
    }

    // Reconnect if URI changes or connection is stale
    if (!connection || mongoose.connection.readyState !== 1 || newUri !== currentUri) {
        try {
            if (connection) {
                logger.warn('🔄 Detected URI change or stale connection. Closing old MongoDB connection…');
                await mongoose.disconnect();
            }
            connection = await tryConnect(newUri, 3);
            currentUri = newUri;
            logger.success(`✅ Connected to MongoDB database: ${process.env.MONGO_DB_NAME || 'ecbot'}`);
            if (!Player) Player = mongoose.models.players || mongoose.model('players', playerSchema);
            if (!Server) Server = mongoose.models.servers || mongoose.model('servers', serverConfigSchema);
        } catch (err) {
            logger.error('🔥 MongoDB connection failed after retries:', err);
            connection = null;
        }
    }
    return connection;
}

/* MODEL GETTERS */
export function getPlayerModel() {
    return Player;
}
export function getServerModel() {
    return Server;
}

/* PLAYER FUNCTIONS */

/**
 * Upserts a player document by Discord ID.
 * @param {string} playerId
 * @param {string} discordId
 * @returns {Promise<Object|null>}
 */
export async function upsertPlayer(playerId, discordId) {
    if (!(await ensureConnection())) return null;
    return Player.findByIdAndUpdate(playerId, {discordId}, {upsert: true, new: true});
}

/**
 * Links a guild and optional roles to a player's profile.
 */
export async function linkGuildToPlayer(playerId, guildId, roles = []) {
    if (!(await ensureConnection())) return null;
    const player = await Player.findById(playerId);
    if (!player) return null;
    let guildLink = player.linkedGuilds.find((g) => g.guildId === guildId);
    if (!guildLink) player.linkedGuilds.push({guildId, roles, servers: []});
    else guildLink.roles = [...new Set([...guildLink.roles, ...roles])];
    return player.save();
}

/**
 * Adds a player to a server instance.
 */
export async function addPlayerToServer(playerId, guildId, serverUuid, serverName, role = 'player') {
    if (!(await ensureConnection())) return null;
    const player = await Player.findById(playerId);
    if (!player) return null;
    let guildLink = player.linkedGuilds.find((g) => g.guildId === guildId);
    if (!guildLink) {
        guildLink = {guildId, roles: [], servers: []};
        player.linkedGuilds.push(guildLink);
    }
    guildLink.servers.push({serverUuid, serverName, role, joinedAt: new Date()});
    return player.save();
}

/**
 * Logs an item received by a player.
 */
export async function logReceivedItem(playerId, item) {
    if (!(await ensureConnection())) return null;
    return Player.findByIdAndUpdate(playerId, {$push: {receivedItems: {...item, timestamp: new Date()}}});
}

/* SERVER FUNCTIONS */

/**
 * Saves or updates a guild/server configuration.
 */
export async function saveGuildConfig(config) {
    if (!(await ensureConnection())) return null;
    return Server.findByIdAndUpdate(config.guildId, {...config, _id: config.guildId}, {upsert: true, new: true});
}

/**
 * Retrieves a guild configuration by guild ID.
 */
export async function getGuildConfig(guildId) {
    if (!(await ensureConnection())) return null;
    return Server.findById(guildId).lean();
}

/**
 * Adds a server instance to a guild configuration.
 */
export async function addServerInstance(guildId, serverData) {
    if (!(await ensureConnection())) return null;
    return Server.findByIdAndUpdate(guildId, {$push: {servers: serverData}}, {new: true});
}

/**
 * Logs an item sent from a server instance.
 */
export async function logSentItem(guildId, serverUuid, item) {
    if (!(await ensureConnection())) return null;
    return Server.updateOne(
        {_id: guildId, 'servers.uuid': serverUuid},
        {$push: {'servers.$.sentItems': item}},
    );
}

/* EXPORT */

/**
 * Aggregate handler exposing DB functions.  Including `getPlayer` here ensures
 * that safeCall() in databaseHandler.mjs can access it.
 */
export const DatabaseHandler = {
    ensureConnection,
    getPlayerModel,
    getServerModel,
    upsertPlayer,
    linkGuildToPlayer,
    addPlayerToServer,
    logReceivedItem,
    saveGuildConfig,
    getGuildConfig,
    addServerInstance,
    logSentItem,
    // Adding getPlayer ensures DatabaseHandler exposes it
    getPlayer,
};
export default DatabaseHandler;

/**
 * Fetches a player document by ID.
 * @param {string} playerId
 * @returns {Promise<Object|null>}
 */
export async function getPlayer(playerId) {
    if (!(await ensureConnection())) return null;
    return Player.findById(playerId).lean();
}
