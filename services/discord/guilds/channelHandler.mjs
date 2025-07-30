/**
 * 📁 services/discord/guilds/channelHandler.mjs
 * ------------------------------------------------
 * Handles incoming text messages in guild channels (non-slash commands).
 *
 * ✅ Loads guild config from DB
 * ✅ Bootstraps mandatory channels (console, logs, waiting-room)
 * ✅ Routes text commands dynamically from `commandRegistry`
 *
 * Relies on:
 *   - Guild config stored in DB
 *   - Player linking via /link command
 *   - Commands registered in `commandRegistry`
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

    create_channels: async (message, client, config) => {
        const hasPerms = await isAdminOrMod(message.member, config);
        if (!hasPerms) {
            return message.reply('❌ You need to be an admin or mod to use this command.');
        }

        await createRemainingChannels(client, config);
        logger.success(`✅ Created remaining channels in ${message.guild.name}`);
        return message.reply('✅ Game channels have been created!');
    },

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

            // Ignore messages outside the bot's category
            const channel = message.channel;
            if (!channel || channel.parentId !== config.categoryId) return;

            // Ensure required channels exist
            if (!config.bootstrapped) {
                logger.info(`📦 Bootstrapping required channels for ${guildId}...`);

                const createdConsole = await createConsoleChannel(client, config);
                const createdLogs = await createLogsChannel(client, config);
                const createdWaiting = await createWaitingRoomChannel(client, config);

                if (createdConsole && createdLogs && createdWaiting) {
                    config.bootstrapped = true;
                    await saveGuildConfig(config);
                    logger.success(`✅ Bootstrapped channels for guild ${guildId}`);
                } else {
                    logger.error(`⚠️ Failed to bootstrap all channels for ${guildId}`);
                    return;
                }
            }

            // Only process commands in waiting-room channel
            if (message.channel.id !== config.waitingRoomChannelId) return;

            // Extract command (no prefix required, fallback to legacy '!')
            const content = message.content.trim().replace(/^!/, '').toLowerCase();
            if (!commandRegistry[content]) return;

            await commandRegistry[content](message, client, config);
        } catch (err) {
            logger.error(`🔥 Error in ChannelMessageRouter.handle: ${err.message}`);
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
