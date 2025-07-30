/**
 * MongoDB Handler for Eclipse-Bot
 *
 * Handles connections and CRUD operations for:
 * - players
 * - servers
 */

import mongoose from 'mongoose';
import logger from '../../log/logHandler.mjs';

let connection = null;
let Player = null;
let Server = null;

// ==================== SCHEMAS ====================

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

/**
 * DatabaseHandler: Single object for all DB operations
 */
export const DatabaseHandler = {
    async ensureConnection() {
        if (!connection) {
            connection = await mongoose.connect(process.env.MONGO_URI, {
                dbName: process.env.MONGO_DB_NAME || 'ecbot',
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            logger.success(`✅ Connected to MongoDB: ${process.env.MONGO_DB_NAME || 'ecbot'}`);
        }
        if (!Player) Player = mongoose.models.players || mongoose.model('players', playerSchema);
        if (!Server) Server = mongoose.models.servers || mongoose.model('servers', serverConfigSchema);
    },

    // ==================== PLAYER FUNCTIONS ====================
    async upsertPlayer(playerId, discordId) {
        await this.ensureConnection();
        return Player.findByIdAndUpdate(playerId, {discordId}, {upsert: true, new: true});
    },

    async linkGuildToPlayer(playerId, guildId, roles = []) {
        await this.ensureConnection();
        const player = await Player.findById(playerId);
        if (!player) return null;

        let guildLink = player.linkedGuilds.find(g => g.guildId === guildId);
        if (!guildLink) {
            player.linkedGuilds.push({guildId, roles, servers: []});
        } else {
            guildLink.roles = [...new Set([...guildLink.roles, ...roles])];
        }
        return player.save();
    },

    async addPlayerToServer(playerId, guildId, serverUuid, serverName, role = 'player') {
        await this.ensureConnection();
        const player = await Player.findById(playerId);
        if (!player) return null;

        let guildLink = player.linkedGuilds.find(g => g.guildId === guildId);
        if (!guildLink) {
            guildLink = {guildId, roles: [], servers: []};
            player.linkedGuilds.push(guildLink);
        }
        guildLink.servers.push({serverUuid, serverName, role, joinedAt: new Date()});
        return player.save();
    },

    async logReceivedItem(playerId, item) {
        await this.ensureConnection();
        return Player.findByIdAndUpdate(playerId, {$push: {receivedItems: {...item, timestamp: new Date()}}});
    },

    async getPlayer(playerId) {
        await this.ensureConnection();
        return Player.findById(playerId).lean();
    },

    // ==================== SERVER FUNCTIONS ====================
    async saveGuildConfig(config) {
        await this.ensureConnection();
        return Server.findByIdAndUpdate(config.guildId, {...config, _id: config.guildId}, {upsert: true, new: true});
    },

    async getGuildConfig(guildId) {
        await this.ensureConnection();
        return Server.findById(guildId).lean();
    },

    async addServerInstance(guildId, serverData) {
        await this.ensureConnection();
        return Server.findByIdAndUpdate(guildId, {$push: {servers: serverData}}, {new: true});
    },

    async logSentItem(guildId, serverUuid, item) {
        await this.ensureConnection();
        return Server.updateOne({_id: guildId, "servers.uuid": serverUuid}, {$push: {"servers.$.sentItems": item}});
    }
};
