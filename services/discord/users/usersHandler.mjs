import {existsSync, readFileSync, writeFileSync} from 'fs';
import logger from '../../../system/log/logHandler.mjs';

const USER_DB_PATH = './discordUsers.db';
const GUILD_CONFIG_PATH = './guildConfig.json';

let userMap = new Map(); // discordId → { discordId, apSlot, roles: [] }

/**
 * Load user data from disk into memory.
 */
export function loadUsersFromDisk() {
    if (!existsSync(USER_DB_PATH)) {
        logger.warn('⚠️ No user database found. Starting fresh...');
        return;
    }

    try {
        const data = JSON.parse(readFileSync(USER_DB_PATH, 'utf-8'));
        userMap = new Map(
            data.map(entry => {
                if (!Array.isArray(entry.roles)) entry.roles = ['player'];
                return [entry.discordId, entry];
            })
        );
        logger.info(`📁 Loaded ${userMap.size} users from disk.`);
    } catch (err) {
        logger.error('❌ Failed to load user DB:', err);
    }
}

/**
 * Persist user data to disk.
 */
export function saveUsersToDisk() {
    try {
        const data = [...userMap.values()];
        writeFileSync(USER_DB_PATH, JSON.stringify(data, null, 2));
        logger.info('💾 User DB saved.');
    } catch (err) {
        logger.error('❌ Failed to save user DB:', err);
    }
}

/**
 * Link a Discord user to their Archipelago slot.
 * @param {string} discordId - Discord user ID
 * @param {string} apSlot - Archipelago slot name
 * @returns {object} Updated user object
 */
export function linkUser(discordId, apSlot) {
    const user = userMap.get(discordId) || {discordId, roles: ['player']};
    user.apSlot = apSlot;
    userMap.set(discordId, user);
    saveUsersToDisk();
    return user;
}

/**
 * Get a user by their Discord ID.
 * @param {string} discordId
 * @returns {object} User object
 */
export function getUser(discordId) {
    if (!userMap.has(discordId)) {
        const newUser = {discordId, roles: ['player']};
        userMap.set(discordId, newUser);
        saveUsersToDisk();
    }
    return userMap.get(discordId);
}

/**
 * Get all stored users.
 * @returns {object[]} Array of user objects
 */
export function getAllUsers() {
    return [...userMap.values()];
}

/**
 * Stub for future expansion – currently unused.
 */
export function loadUserRoles() {
}

/**
 * Saves the guild configuration to disk.
 * @param {object} config - Guild setup configuration
 */
export function saveGuildConfig(config) {
    try {
        writeFileSync(GUILD_CONFIG_PATH, JSON.stringify(config, null, 2));
        logger.info('🛠️ Guild configuration saved to disk.');
    } catch (err) {
        logger.error('❌ Failed to save guild config:', err);
    }
}

/**
 * Loads the guild configuration from disk.
 * @param {string} guildId
 * @returns {object|null}
 */
export function getGuildConfig(guildId) {
    try {
        if (!existsSync(GUILD_CONFIG_PATH)) return null;
        const config = JSON.parse(readFileSync(GUILD_CONFIG_PATH, 'utf-8'));
        return config.guildId === guildId ? config : null;
    } catch (err) {
        logger.error('❌ Failed to load guild config:', err);
        return null;
    }
}
