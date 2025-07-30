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
        await initDiscord(env);
        logger.info('✅ Discord service initialized successfully.');

        // Archipelago service will be initialized dynamically per hosted server
        // or could be wired in here if needed
        // await initArchipelago(env);

    } catch (err) {
        logger.error('🔥 Fatal error in main execution:', err);
        process.exit(1);
    }
}

main();
