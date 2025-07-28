// ─────────────────────────────────────────────────────────────
// 🎬 Eclipse-Bot Entry Point
// ─────────────────────────────────────────────────────────────

import 'dotenv/config.js';
import logger from './system/log/logHandler.mjs';
import initDiscord from './services/discord/initDiscord.mjs';
import initArchipelago from './services/archipelago/initArchipelago.mjs';

// ──────────────── ENV LOADING ────────────────
const env = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v?.trim()])
);

// Required ENV vars
const REQUIRED_VARS = [
    'DISCORD_TOKEN',
    'DISCORD_CHAT_CHANNEL_ID',
    'DISCORD_TRADE_CHANNEL_ID',
    'DISCORD_HINT_CHANNEL_ID',
    'DISCORD_LOG_CHANNEL_ID',
    'ARCHIPELAGO_SERVER',
    'ARCHIPELAGO_SLOT',
];

const missingVars = REQUIRED_VARS.filter((key) => !env[key]);
if (missingVars.length) {
    logger.error(`❌ Missing required env vars: ${missingVars.join(', ')}`);
    process.exit(1);
}

// ──────────────── MAIN STARTUP ────────────────
async function main() {
    logger.info('🚀 Starting Eclipse-Bot...');

    try {
        await Promise.all([
            initDiscord(env),
            initArchipelago(env),
        ]);

        logger.info('✅ All services initialized successfully.');
    } catch (err) {
        logger.error('🔥 Fatal error in main execution:', err);
        process.exit(1);
    }
}

main();
