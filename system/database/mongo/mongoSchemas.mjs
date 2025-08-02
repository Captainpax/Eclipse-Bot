// mongoSchemas.mjs
import mongoose from 'mongoose';

const receivedItemSchema = new mongoose.Schema({
    itemName: String,
    from: String,
    guildId: String,
    serverUuid: String,
    isProgressional: Boolean,
    timestamp: {type: Date, default: Date.now},
}, {_id: false});

const serverRefSchema = new mongoose.Schema({
    serverUuid: String,
    serverName: String,
    role: String,
    joinedAt: {type: Date, default: Date.now},
}, {_id: false});

const linkedGuildSchema = new mongoose.Schema({
    guildId: String,
    roles: [String],
    servers: [serverRefSchema],
}, {_id: false});

const playerSchema = new mongoose.Schema({
    _id: String,
    discordId: {type: String, required: true},
    linkedGuilds: [linkedGuildSchema],
    receivedItems: [receivedItemSchema],
    settings: {
        notifications: {type: Boolean, default: true},
        dmOnItem: {type: Boolean, default: true},
        linked: {type: Boolean, default: true},
    },
}, {timestamps: true});

const sentItemSchema = new mongoose.Schema({
    itemName: String,
    message: String,
    isProgressional: Boolean,
    fromTo: [String],
}, {_id: false});

const serverInstanceSchema = new mongoose.Schema({
    uuid: String,
    serverName: String,
    serverOwner: String,
    players: [String],
    port: Number,
    sentItems: [sentItemSchema],
}, {_id: false});

const serverConfigSchema = new mongoose.Schema({
    _id: String,
    guildId: {type: String, required: true},
    fqdn: String,
    bootstrapped: {type: Boolean, default: false},
    roles: {
        admin: [String],
        mod: [String],
        player: [String],
    },
    channels: {
        category: [String],
        console: [String],
        logs: [String],
        waitingRoom: [String],
    },
    portRange: {start: Number, end: Number},
    servers: [serverInstanceSchema],
}, {timestamps: true});

export {
    receivedItemSchema,
    serverRefSchema,
    linkedGuildSchema,
    playerSchema,
    sentItemSchema,
    serverInstanceSchema,
    serverConfigSchema,
};
