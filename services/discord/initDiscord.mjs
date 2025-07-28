// services/discord/initDiscord.mjs

import {Client, GatewayIntentBits, Partials} from 'discord.js';
import {registerCommandHandlers} from './commands/commandHandler.mjs';
import {handleIncomingDiscordMessage} from './messaging/messageHandler.mjs';
import {loadUserRoles} from './users/usersHandler.mjs';
import logger, {setDiscordLogger} from '../../system/log/logHandler.mjs';

/**
 * Initializes the Discord bot connection
 * @param {Object} env - The environment variable map
 */
export default async function initDiscord(env) {
    logger.info('🤖 Initializing Discord service...');

    const {
        DISCORD_TOKEN,
        DISCORD_CHANNEL_CHAT,
        DISCORD_CHANNEL_TRADES,
        DISCORD_CHANNEL_HINTS,
        DISCORD_CHANNEL_LOGS,
        LOG_LEVEL
    } = env;

    if (!DISCORD_TOKEN) {
        throw new Error('❌ DISCORD_TOKEN not set in environment variables.');
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel],
    });

    // Helper: Embed routing
    client.sendEmbed = (type, embed) => {
        const channelMap = {
            chat: DISCORD_CHANNEL_CHAT,
            trade: DISCORD_CHANNEL_TRADES,
            hint: DISCORD_CHANNEL_HINTS,
            log: DISCORD_CHANNEL_LOGS,
        };

        const channelId = channelMap[type];
        if (!channelId) return;

        const channel = client.channels.cache.get(channelId);
        if (channel?.isTextBased()) {
            channel.send({embeds: [embed]}).catch(err =>
                logger.error(`💥 Failed to send ${type} embed:`, err)
            );
        }
    };

    // Add sendToLogChannel helper for logger integration
    client.sendToLogChannel = async (message) => {
        if (!DISCORD_CHANNEL_LOGS) return;

        const channel = client.channels.cache.get(DISCORD_CHANNEL_LOGS);
        if (channel?.isTextBased()) {
            await channel.send(message).catch(err =>
                logger.error('💥 Failed to send log message:', err)
            );
        }
    };

    client.once('ready', async () => {
        logger.info(`✅ Discord logged in as ${client.user.tag}`);

        // Register logger forwarding for embeds
        setDiscordLogger(client, LOG_LEVEL || 'low');

        // Load user roles and commands
        await loadUserRoles(client);
        await registerCommandHandlers(client);
    });

    client.on('messageCreate', async (message) => {
        try {
            await handleIncomingDiscordMessage(message, env);
        } catch (err) {
            logger.error('💥 Error in Discord message handler:', err);
        }
    });

    await client.login(DISCORD_TOKEN);
}