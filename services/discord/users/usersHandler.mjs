// services/discord/users/usersHandler.mjs

import {readFileSync, writeFileSync, existsSync} from 'fs';
import logger from '../../../system/log/logHandler.mjs';

const DB_PATH = './discordUsers.db';
let userMap = new Map(); // discordId → { discordId, apSlot, roles: [] }

/**
 * Loads user map from disk
 */
export function loadUsersFromDisk() {
    if (!existsSync(DB_PATH)) {
        logger.warn('⚠️ No user database found, starting fresh...');
        return;
    }

    try {
        const data = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
        userMap = new Map(data.map((entry) => {
            // Ensure 'roles' is always present
            if (!entry.roles || !Array.isArray(entry.roles)) {
                entry.roles = ['player'];
            }
            return [entry.discordId, entry];
        }));
        logger.info(`📁 Loaded ${userMap.size} users from disk.`);
    } catch (err) {
        logger.error('❌ Failed to load user DB:', err);
    }
}

/**
 * Saves user map to disk
 */
export function saveUsersToDisk() {
    try {
        const data = [...userMap.values()];
        writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        logger.info('💾 User DB saved.');
    } catch (err) {
        logger.error('❌ Failed to save user DB:', err);
    }
}

/**
 * Links a Discord user to an Archipelago slot
 * @param {string} discordId
 * @param {string} apSlot
 */
export function linkUser(discordId, apSlot) {
    const user = userMap.get(discordId) || {discordId, roles: ['player']};
    user.apSlot = apSlot;
    userMap.set(discordId, user);
    saveUsersToDisk();
    return user;
}

/**
 * Gets user object by Discord ID (returns player by default)
 * @param {string} discordId
 */
export function getUser(discordId) {
    if (!userMap.has(discordId)) {
        // Auto-create on first use
        const newUser = {discordId, roles: ['player']};
        userMap.set(discordId, newUser);
        saveUsersToDisk();
    }
    return userMap.get(discordId);
}

/**
 * Lists all linked users
 */
export function getAllUsers() {
    return [...userMap.values()];
}

export function loadUserRoles() {
}