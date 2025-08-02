/**
 * @file channelHandler.mjs
 * @description
 * Handles incoming guild text messages for Eclipse-Bot outside of slash commands.
 *
 * Features:
 *  - Loads guild configuration from DB
 *  - Bootstraps mandatory channels (console/logs for master servers, waiting room everywhere)
 *  - Supports multiple categories per guild
 *  - Routes legacy text commands dynamically
 *  - Maintains a signup queue per guild
 *
 * Depends on:
 *  - Guild config schema (categoryId or categoryIds, isMaster flag, logs/console/waiting-room channels)
 *  - Player linking system (/link command)
 *  - Dynamic command registry defined in this file
 */

import {getGuildConfig, getPlayer, saveGuildConfig} from '../users/usersHandler.mjs';
import {
    createConsoleChannel,
    createLogsChannel,
    createRemainingChannels,
    createWaitingRoomChannel
} from './channels/index.mjs';
import {isAdminOrMod} from '../users/roleHandler.mjs';
import logger from '../../../system/log/logHandler.mjs';

// In-memory signup queue: { guildId: [userIds...] }
const signupQueue = {};

/* -------------------------------------------------------------------------- */
/*                         Dynamic Command Registry                           */
/* -------------------------------------------------------------------------- */
/**
 * Map of supported text commands to async handlers.
 * Each handler receives (message, client, config)
 */
const commandRegistry = {
    /**
     * Adds the user to the signup queue if linked.
     */
    me: async (message, client, config) => {
        const player = await getPlayer(message.author.id);
        if (!player || !player.settings?.linked) {
            logger.warn(`⚠️ ${message.author.tag} attempted to join without linking.`);
            return message.reply('❌ You must use `/link` before joining the signup queue.');
        }

        const result = addToSignupQueue(config.guildId, message.author.id);
        if (result === 'already') {
            return message.reply('⚠️ You’re already on the signup list!');
        }

        logger.info(`✅ ${message.author.tag} joined the signup queue.`);
        return message.reply('✅ You’ve been added to the signup queue!');
    },

    /**
     * Creates remaining channels (manual admin trigger).
     */
    create_channels: async (message, client, config) => {
        const hasPerms = await isAdminOrMod(message.member, config);
        if (!hasPerms) {
            return message.reply('❌ You need to be an admin or mod to use this command.');
        }

        await createRemainingChannels(client, config);
        logger.success(`✅ Created remaining channels in ${message.guild.name}`);
        return message.reply('✅ Game channels have been created!');
    },

    /**
     * Lists current signup queue.
     */
    list: async (message, client, config) => {
        const queue = getSignupQueue(config.guildId);
        if (queue.length === 0) {
            return message.reply('📭 The signup queue is currently empty.');
        }

        const list = queue.map((id, i) => `\n> **${i + 1}.** <@${id}>`).join('');
        return message.reply({content: `📋 **Signup Queue:**${list}`, allowedMentions: {parse: []}});
    }
};

/* -------------------------------------------------------------------------- */
/*                         Channel Message Router                             */
/* -------------------------------------------------------------------------- */

/**
 * Routes incoming guild messages to appropriate command handlers or
 * triggers bootstrap if required channels are missing.
 */
export class ChannelMessageRouter {
    /**
     * Main entry point for processing incoming Discord messages.
     *
     * @param {import('discord.js').Message} message - The Discord message object
     * @param {Object} env - Environment/config object
     * @param {import('discord.js').Client} client - Discord client instance
     */
    static async handle(message, env, client) {
        try {
            if (message.author.bot || !message.guild) return;

            const guildId = message.guild.id;
            const config = await getGuildConfig(guildId);

            if (!config) {
                logger.warn(`⚠️ Missing config for guild ${guildId}. Skipping message handling.`);
                return;
            }

            // Determine allowed categories (array or single ID)
            const allowedCategories = Array.isArray(config.categoryIds)
                ? config.categoryIds
                : [config.categoryId].filter(Boolean);

            if (!allowedCategories.includes(message.channel.parentId)) return;

            // Bootstrap channels only if flagged or missing
            await ensureRequiredChannels(client, config);

            // Only process text commands in waiting-room channel
            if (message.channel.id !== config.waitingRoomChannelId) return;

            // Extract command (strip legacy '!' prefix if present)
            const content = message.content.trim().replace(/^!/, '').toLowerCase();
            if (!commandRegistry[content]) return;

            await commandRegistry[content](message, client, config);
        } catch (err) {
            logger.error(`🔥 Error in ChannelMessageRouter.handle: ${err.message}`);
            try {
                const cfg = await getGuildConfig(message.guild.id);
                if (cfg?.logsChannelId) {
                    const logChannel = await message.guild.channels.fetch(cfg.logsChannelId).catch(() => null);
                    if (logChannel?.isTextBased()) {
                        await logChannel.send(`🔥 An error occurred handling a message: \`${err.message}\``);
                    }
                }
            } catch {
                // Ignore if we can't notify logs channel
            }
        }
    }
}

/* -------------------------------------------------------------------------- */
/*                          Signup Queue Utilities                            */
/* -------------------------------------------------------------------------- */

/**
 * Adds a user to the signup queue for a guild.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {'already'|'added'}
 */
export function addToSignupQueue(guildId, userId) {
    signupQueue[guildId] ??= [];
    if (signupQueue[guildId].includes(userId)) return 'already';
    signupQueue[guildId].push(userId);
    return 'added';
}

/**
 * Gets the current signup queue for a guild.
 *
 * @param {string} guildId
 * @returns {string[]} Array of user IDs in queue
 */
export function getSignupQueue(guildId) {
    return signupQueue[guildId] ?? [];
}

/* -------------------------------------------------------------------------- */
/*                       Channel Bootstrap Utility                            */

/* -------------------------------------------------------------------------- */

/**
 * Ensures required channels exist for the guild based on its configuration.
 * Creates missing channels (logs/console for master only, waiting-room always).
 *
 * @param {import('discord.js').Client} client
 * @param {Object} config - Guild configuration object
 */
async function ensureRequiredChannels(client, config) {
    let updated = false;

    // Waiting Room (always required)
    if (!config.waitingRoomChannelId) {
        const created = await createWaitingRoomChannel(client, config);
        if (created) updated = true;
    }

    // Master-server only channels
    if (config.isMaster) {
        if (!config.consoleChannelId) {
            const created = await createConsoleChannel(client, config);
            if (created) updated = true;
        }

        if (!config.logsChannelId) {
            const created = await createLogsChannel(client, config);
            if (created) updated = true;
        }
    }

    if (updated && !config.bootstrapped) {
        config.bootstrapped = true;
        await saveGuildConfig(config);
        logger.success(`✅ Bootstrapped channels for guild ${config.guildId}`);
    }
}
