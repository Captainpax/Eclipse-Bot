// 📁 services/discord/guilds/channelHandler.mjs

import {runFirstTimeSetup} from './setup.mjs';
import {getGuildConfig, getUser, saveGuildConfig} from '../users/usersHandler.mjs';
import {
    createConsoleChannel,
    createLogsChannel,
    createRemainingChannels,
    createWaitingRoomChannel
} from './channels/index.mjs';
import {isAdminOrMod} from '../users/roleHandler.mjs';
import * as logger from '../../../system/log/logHandler.mjs';

// In-memory signup queue: guildId → [userId, ...]
const signupQueue = {};

/**
 * Routes incoming Discord messages (non-slash commands).
 *
 * @param {import('discord.js').Message} message
 * @param {Object} env
 * @param {import('discord.js').Client} client
 */
export class ChannelMessageRouter {
    static async handle(message, env, client) {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        let config = await getGuildConfig(guildId);

        if (!config) {
            logger.info(`🔧 No guild config for ${guildId}. Launching first-time setup...`);
            await runFirstTimeSetup(client);
            config = await getGuildConfig(guildId);
            if (!config) {
                logger.error(`❌ Setup failed or incomplete for guild ${guildId}.`);
                return;
            }
        }

        // Bootstrap mandatory channels if needed
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
                logger.error(`⚠️ Failed to fully bootstrap channels for ${guildId}`);
                return;
            }
        }

        const waitingRoomId = config.waitingRoomChannelId;
        const content = message.content.toLowerCase();

        if (message.channel.id === waitingRoomId) {
            if (content === '!me') {
                const user = getUser(message.author.id);
                const isLinked = !!user?.apSlot;

                if (!isLinked) {
                    logger.warn(`⚠️ ${message.author.tag} tried to join queue without linking.`);
                    return message.reply('❌ You must use `/link` before joining the signup queue.');
                }

                const result = addToSignupQueue(guildId, message.author.id);
                if (result === 'already') {
                    return message.reply('⚠️ You’re already on the signup list!');
                }

                logger.info(`✅ ${message.author.tag} joined the signup queue.`);
                return message.reply('✅ You’ve been added to the signup queue!');
            }

            if (content === '!create_channels') {
                const hasPerms = await isAdminOrMod(message.member, config);
                if (!hasPerms) {
                    return message.reply('❌ You need to be an admin or mod to use this command.');
                }

                await createRemainingChannels(client, config);
                logger.success(`✅ Created remaining game channels in ${message.guild.name}`);
                return message.reply('✅ Game channels have been created!');
            }
        }
    }
}

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
 * @param {string} guildId
 * @returns {string[]}
 */
export function getSignupQueue(guildId) {
    return signupQueue[guildId] ?? [];
}