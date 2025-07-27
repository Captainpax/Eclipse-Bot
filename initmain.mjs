// initmain.mjs

import 'dotenv/config';
import logger from './logger.mjs';
import DiscordBot from './discord/discord.mjs';
import ArchipelagoBot from './archipelago/archipelago.mjs';

/**
 * Environment variables object with trimmed values
 * @type {Object.<string, string>}
 */
const env = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v?.trim()])
);

/**
 * Destructured environment variables with defaults
 * @type {{
 *   DISCORD_TOKEN: string,
 *   DISCORD_CHAT_CHANNEL_ID: string,
 *   DISCORD_TRADE_CHANNEL_ID: string,
 *   DISCORD_HINT_CHANNEL_ID: string,
 *   DISCORD_LOG_CHANNEL_ID: string,
 *   ARCHIPELAGO_SERVER: string,
 *   ARCHIPELAGO_SLOT: string,
 *   ARCHIPELAGO_PASSWORD?: string,
 *   LOG_LEVEL: string
 * }}
 */
const {
    DISCORD_TOKEN,
    DISCORD_CHAT_CHANNEL_ID,
    DISCORD_TRADE_CHANNEL_ID,
    DISCORD_HINT_CHANNEL_ID,
    DISCORD_LOG_CHANNEL_ID,
    ARCHIPELAGO_SERVER,
    ARCHIPELAGO_SLOT,
    ARCHIPELAGO_PASSWORD,
    LOG_LEVEL = 'low',
} = env;

/** @type {boolean} */
const isDebug = LOG_LEVEL.toLowerCase() === 'debug';

/**
 * Main application entry point that initializes and connects the Discord and Archipelago bots
 * @async
 * @returns {Promise<void>}
 */
async function main() {
    logger.debug('Loading environment configuration');
    if (isDebug) logger.debug('Resolved environment:', env);

    // Validate required config
    if (!DISCORD_TOKEN) return logger.error('Missing DISCORD_TOKEN in environment');
    if (!DISCORD_CHAT_CHANNEL_ID || !DISCORD_TRADE_CHANNEL_ID || !DISCORD_HINT_CHANNEL_ID || !DISCORD_LOG_CHANNEL_ID) {
        return logger.error('Missing one or more required DISCORD_*_CHANNEL_IDs in environment');
    }
    if (!ARCHIPELAGO_SERVER || !ARCHIPELAGO_SLOT) {
        return logger.error('Missing ARCHIPELAGO_SERVER or ARCHIPELAGO_SLOT in environment');
    }

    // Initialize bots
    const discordBot = new DiscordBot({
        chatChannelId: DISCORD_CHAT_CHANNEL_ID,
        tradeChannelId: DISCORD_TRADE_CHANNEL_ID,
        hintChannelId: DISCORD_HINT_CHANNEL_ID,
        logChannelId: DISCORD_LOG_CHANNEL_ID,
    });

    const apBot = new ArchipelagoBot();
    apBot.setDiscordBot(discordBot); // inject for packet routing
    discordBot.apBot = apBot;        // allow Discord commands to use apBot

    try {
        logger.info('Connecting to Archipelago server...');
        await apBot.connect(ARCHIPELAGO_SERVER, ARCHIPELAGO_SLOT, ARCHIPELAGO_PASSWORD);

        logger.info('Waiting for Archipelago to send RoomInfo...');
        const ready = await apBot.waitUntilConnected(5000);
        if (!ready) {
            logger.error('Unable to continue without Archipelago connection');
            return;
        }
    } catch (err) {
        logger.error('Unable to continue without Archipelago connection');
        if (isDebug) logger.debug(err.stack || err);
        return;
    }

    try {
        logger.info('Connecting to Discord...');
        await discordBot.start(DISCORD_TOKEN);
    } catch (err) {
        logger.error('Unable to continue without Discord connection');
        if (isDebug) logger.debug(err.stack || err);
        return;
    }

    logger.success('✅ Eclipse bot is up and running!');
}

main().catch((err) => {
    logger.error('Fatal error in main execution:', err);
    if (isDebug) logger.debug(err.stack || err);
});
