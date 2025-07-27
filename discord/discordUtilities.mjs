// discord/discordUtilities.mjs

/**
 * Utility module to register shared Discord.js event handlers.
 * Used to modularize error handling and client lifecycle logging.
 */

import logger from '../logger.mjs';

/**
 * Registers core Discord event handlers like ready, error, and shardError.
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 */
export function registerDiscordEvents(client) {
    client.once('ready', () => {
        logger.success(`Discord client logged in as ${client.user.tag}`);
    });

    client.on('error', (error) => {
        logger.error('Discord client error:', error);
    });

    client.on('shardError', (error) => {
        logger.error('Discord shard error:', error);
    });
}
