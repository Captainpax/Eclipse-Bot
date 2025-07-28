// initmain.mjs

import 'dotenv/config';
import logger from './logger.mjs';
import DiscordBot from './discord/discord.mjs';
import { ArchipelagoBot } from './archipelago/archipelago.mjs';

const apBot = new ArchipelagoBot();
/**
 * Environment variables object with trimmed values
 * @type {Object.<string, string>}
 */
const env = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v?.trim()])
);

/**
 * Destructured environment variables with defaults
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

const isDebug = LOG_LEVEL.toLowerCase() === 'debug';

/**
 * Application startup
 */
async function main() {
    logger.info('🚀 Starting Eclipse-Bot...');

    if (isDebug) {
        logger.debug('🌐 Environment config:', env);
    }

    // ===== Validate Environment =====
    if (!DISCORD_TOKEN) return logger.error('❌ Missing DISCORD_TOKEN in environment');
    if (!DISCORD_CHAT_CHANNEL_ID || !DISCORD_TRADE_CHANNEL_ID || !DISCORD_HINT_CHANNEL_ID || !DISCORD_LOG_CHANNEL_ID) {
        return logger.error('❌ Missing one or more required DISCORD_*_CHANNEL_IDs in environment');
    }
    if (!ARCHIPELAGO_SERVER || !ARCHIPELAGO_SLOT) {
        return logger.error('❌ Missing ARCHIPELAGO_SERVER or ARCHIPELAGO_SLOT in environment');
    }

    // ===== Initialize Bot Instances =====
    const discordBot = new DiscordBot({
        chatChannelId: DISCORD_CHAT_CHANNEL_ID,
        tradeChannelId: DISCORD_TRADE_CHANNEL_ID,
        hintChannelId: DISCORD_HINT_CHANNEL_ID,
        logChannelId: DISCORD_LOG_CHANNEL_ID,
    });

    apBot.setDiscordBot(discordBot); // Inject for packet routing
    discordBot.apBot = apBot;        // Inject for Discord->AP command support

    // ===== Start Discord FIRST =====
    try {
        logger.info('🤖 Connecting to Discord...');
        await discordBot.start(DISCORD_TOKEN);
        logger.success('✅ Discord bot connected.');
    } catch (err) {
        logger.error('❌ Discord connection failed.');
        if (isDebug) logger.debug(err.stack || err);
        return;
    }

    // ===== Start Archipelago AFTER Discord =====
    try {
        logger.info('🌐 Connecting to Archipelago...');
        await apBot.connect(ARCHIPELAGO_SERVER, ARCHIPELAGO_SLOT, ARCHIPELAGO_PASSWORD);

        logger.success('🛰️ Archipelago connection confirmed.');
    } catch (err) {
        logger.error('❌ Archipelago connection failed.');
        if (isDebug) logger.debug(err.stack || err);
        return;
    }

    // ===== All Systems Go =====
    logger.success('🌙 Eclipse-Bot fully operational!');
}

main().catch((err) => {
    logger.error('🔥 Fatal error in main execution:', err);
    if (isDebug) logger.debug(err.stack || err);
});
