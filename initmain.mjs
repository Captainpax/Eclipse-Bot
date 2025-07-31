// ─────────────────────────────────────────────────────────────
// 🎬 Eclipse-Bot Entry Point
// ─────────────────────────────────────────────────────────────

import 'dotenv/config.js';
import logger from './system/log/logHandler.mjs';
import initDiscord from './services/discord/initDiscord.mjs';

// ──────────────── ENV LOADING ────────────────

/** @type {Object<string, string>} Trimmed env vars */
const env = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v?.trim()])
);

// Required for bot startup
const REQUIRED_VARS = ['DISCORD_TOKEN', 'SUPER_USER_ID'];
const missingVars = REQUIRED_VARS.filter((key) => !env[key]);

if (missingVars.length) {
    logger.error(`❌ Missing required env vars: ${missingVars.join(', ')}`);
    process.exit(1);
}

// ──────────────── MAIN STARTUP ────────────────

async function main() {
    logger.info('🚀 Starting Eclipse-Bot...');

    try {
        const client = await initDiscord(env); // ✅ returns client

        if (!client) {
            throw new Error('Discord client was not returned by initDiscord');
        }

        // ✅ Wait for bot to be fully ready
        client.once('ready', () => {
            logger.success(`🤖 Bot is ready and logged in as ${client.user.tag}`);
        });

    } catch (err) {
        logger.error('🔥 Fatal error in main execution:', err);
        process.exit(1);
    }
}

main().then(() => {
    logger.success('📦 Command registration process completed.');
}).catch((err) => {
    logger.error('❌ Unhandled error in main:', err);
    process.exit(1);
});