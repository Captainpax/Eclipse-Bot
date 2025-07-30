import db from '../../../system/database/databaseHandler.mjs';
import logger from '../../../system/log/logHandler.mjs';

/**
 * Links a Discord user to their Archipelago slot and persists it to DB.
 * Uses the AP slot name as the unique player _id.
 *
 * @param {string} discordId - Discord user ID
 * @param {string} apSlot - Archipelago slot name (unique)
 * @returns {Promise<object|null>} Updated player document
 */
export async function linkUser(discordId, apSlot) {
    try {
        const player = await db.upsertPlayer(apSlot, discordId);
        logger.info(`🔗 Linked user ${discordId} -> AP slot ${apSlot}`);
        return player;
    } catch (err) {
        logger.error('❌ Failed to link user:', err);
        return null;
    }
}

/**
 * Retrieves a player document by Discord ID.
 * Searches the "discordId" field instead of _id to handle multiple players properly.
 * Auto-creates a minimal player doc if missing.
 *
 * @param {string} discordId
 * @returns {Promise<object|null>}
 */
export async function getUser(discordId) {
    try {
        const player = await db.getPlayer(discordId);
        if (!player) {
            logger.warn(`⚠️ No player found for Discord ID ${discordId}, creating new record.`);
            await db.upsertPlayer(discordId, discordId);
            return await db.getPlayer(discordId);
        }
        return player;
    } catch (err) {
        logger.error('❌ Failed to get user:', err);
        return null;
    }
}

/**
 * Saves guild configuration to MongoDB.
 *
 * @param {object} config - Guild config object
 * @returns {Promise<void>}
 */
export async function saveGuildConfig(config) {
    try {
        if (!config?.guildId) {
            logger.warn('⚠️ saveGuildConfig called without guildId, skipping.');
            return;
        }
        await db.saveGuildConfig(config);
        logger.info(`🛠️ Guild configuration saved for guild ${config.guildId}`);
    } catch (err) {
        logger.error('❌ Failed to save guild config:', err);
    }
}

/**
 * Loads guild configuration from MongoDB.
 * Returns null if no configuration exists (i.e., first-time setup scenario).
 *
 * @param {string} guildId
 * @returns {Promise<object|null>}
 */
export async function getGuildConfig(guildId) {
    if (!guildId) {
        logger.warn('⚠️ getGuildConfig called without guildId.');
        return null;
    }
    try {
        const config = await db.getGuildConfig(guildId);
        if (!config) {
            logger.info(`ℹ️ No config found for guild ${guildId}`);
            return null;
        }
        return config;
    } catch (err) {
        logger.error('❌ Failed to load guild config:', err);
        return null;
    }
}
