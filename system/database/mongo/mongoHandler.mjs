/**
 * 📁 system/database/mongo/mongoHandler.mjs
 * -----------------------------------------------------------------
 * Core MongoDB Handler for Eclipse-Bot
 *
 * ✅ Handles:
 *    - Player data (linked guilds, received items)
 *    - Server configs (Archipelago server instances, guild data)
 *
 * ✅ Features:
 *    - Auto-reconnects if MONGO_URI changes dynamically at runtime
 *    - Uses environment vars for URI, username, password, DB name
 *    - Initializes Mongoose models only once
 *    - Provides CRUD operations for players and servers
 */

import mongoose from 'mongoose';
import logger from '../../log/logHandler.mjs';

let connection = null;
let Player = null;
let Server = null;
let currentUri = process.env.MONGO_URI || null;

/* ========================================================================
   SCHEMAS
   ======================================================================== */

// ---- Players ----
const receivedItemSchema = new mongoose.Schema({
    itemName: String,
    from: String,
    guildId: String,
    serverUuid: String,
    isProgressional: Boolean,
    timestamp: {type: Date, default: Date.now}
}, {_id: false});

const serverRefSchema = new mongoose.Schema({
    serverUuid: String,
    serverName: String,
    role: String,
    joinedAt: {type: Date, default: Date.now}
}, {_id: false});

const linkedGuildSchema = new mongoose.Schema({
    guildId: String,
    roles: [String],
    servers: [serverRefSchema]
}, {_id: false});

const playerSchema = new mongoose.Schema({
    _id: String,
    discordId: {type: String, required: true},
    linkedGuilds: [linkedGuildSchema],
    receivedItems: [receivedItemSchema],
    settings: {
        notifications: {type: Boolean, default: true},
        dmOnItem: {type: Boolean, default: true},
        linked: {type: Boolean, default: true}
    }
}, {timestamps: true});

// ---- Servers ----
const sentItemSchema = new mongoose.Schema({
    itemName: String,
    message: String,
    isProgressional: Boolean,
    fromTo: [String]
}, {_id: false});

const serverInstanceSchema = new mongoose.Schema({
    uuid: String,
    serverName: String,
    serverOwner: String,
    players: [String],
    port: Number,
    sentItems: [sentItemSchema]
}, {_id: false});

const serverConfigSchema = new mongoose.Schema({
    _id: String, // GuildId
    guildId: {type: String, required: true},
    fqdn: String,
    bootstrapped: {type: Boolean, default: false},
    roles: {
        admin: [String],
        mod: [String],
        player: [String]
    },
    channels: {
        category: [String],
        console: [String],
        logs: [String],
        waitingRoom: [String]
    },
    portRange: {
        start: Number,
        end: Number
    },
    servers: [serverInstanceSchema]
}, {timestamps: true});

/* ========================================================================
   CONNECTION HANDLER
   ======================================================================== */

/**
 * Ensures a MongoDB connection exists.
 * - Automatically reconnects if URI changes or connection drops
 */
export async function ensureConnection() {
    const newUri = process.env.MONGO_URI;

    if (!newUri) {
        logger.error('❌ MONGO_URI is not defined in environment variables.');
        throw new Error('MONGO_URI not defined');
    }

    if (!connection || mongoose.connection.readyState !== 1 || newUri !== currentUri) {
        try {
            if (connection) {
                logger.warn('🔄 Detected URI change or stale connection. Closing old MongoDB connection...');
                await mongoose.disconnect();
            }

            logger.info(`🌐 Connecting to MongoDB at: ${newUri}`);
            connection = await mongoose.connect(newUri, {
                dbName: process.env.MONGO_DB_NAME || 'ecbot',
                user: process.env.MONGO_USER || 'ecbot',
                pass: process.env.MONGO_PASS || ''
            });

            currentUri = newUri;
            logger.success(`✅ Connected to MongoDB database: ${process.env.MONGO_DB_NAME || 'ecbot'}`);

            if (!Player) Player = mongoose.models.players || mongoose.model('players', playerSchema);
            if (!Server) Server = mongoose.models.servers || mongoose.model('servers', serverConfigSchema);

        } catch (err) {
            logger.error('🔥 MongoDB connection error:', err);
            connection = null;
            throw err;
        }
    }

    return connection;
}

/* ========================================================================
   MODEL GETTERS (SAFE)
   ======================================================================== */
export function getPlayerModel() {
    return Player;
}

export function getServerModel() {
    return Server;
}

/* ========================================================================
   PLAYER FUNCTIONS
   ======================================================================== */
export async function upsertPlayer(playerId, discordId) {
    await ensureConnection();
    return Player.findByIdAndUpdate(playerId, {discordId}, {upsert: true, new: true});
}

export async function linkGuildToPlayer(playerId, guildId, roles = []) {
    await ensureConnection();
    const player = await Player.findById(playerId);
    if (!player) return null;

    let guildLink = player.linkedGuilds.find(g => g.guildId === guildId);
    if (!guildLink) {
        player.linkedGuilds.push({guildId, roles, servers: []});
    } else {
        guildLink.roles = [...new Set([...guildLink.roles, ...roles])];
    }
    return player.save();
}

export async function addPlayerToServer(playerId, guildId, serverUuid, serverName, role = 'player') {
    await ensureConnection();
    const player = await Player.findById(playerId);
    if (!player) return null;

    let guildLink = player.linkedGuilds.find(g => g.guildId === guildId);
    if (!guildLink) {
        guildLink = {guildId, roles: [], servers: []};
        player.linkedGuilds.push(guildLink);
    }
    guildLink.servers.push({serverUuid, serverName, role, joinedAt: new Date()});
    return player.save();
}

export async function logReceivedItem(playerId, item) {
    await ensureConnection();
    return Player.findByIdAndUpdate(playerId, {$push: {receivedItems: {...item, timestamp: new Date()}}});
}

export async function getPlayer(playerId) {
    await ensureConnection();
    return Player.findById(playerId).lean();
}

/* ========================================================================
   SERVER FUNCTIONS
   ======================================================================== */
export async function saveGuildConfig(config) {
    await ensureConnection();
    return Server.findByIdAndUpdate(config.guildId, {...config, _id: config.guildId}, {upsert: true, new: true});
}

export async function getGuildConfig(guildId) {
    await ensureConnection();
    return Server.findById(guildId).lean();
}

export async function addServerInstance(guildId, serverData) {
    await ensureConnection();
    return Server.findByIdAndUpdate(guildId, {$push: {servers: serverData}}, {new: true});
}

export async function logSentItem(guildId, serverUuid, item) {
    await ensureConnection();
    return Server.updateOne({_id: guildId, "servers.uuid": serverUuid}, {$push: {"servers.$.sentItems": item}});
}

/* ========================================================================
   EXPORT
   ======================================================================== */
export const DatabaseHandler = {
    ensureConnection,
    getPlayerModel,
    getServerModel,
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

export default DatabaseHandler;
