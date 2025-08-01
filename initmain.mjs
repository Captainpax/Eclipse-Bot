// ─────────────────────────────────────────────────────────────
// 🎬 Eclipse-Bot Entry Point
// ─────────────────────────────────────────────────────────────

import 'dotenv/config.js';
import fs from 'fs';
import logger from './system/log/logHandler.mjs';
import initDiscord from './services/discord/initDiscord.mjs';
import Docker from 'dockerode';

// ──────────────── ENV LOADING ────────────────

/**
 * Trim and store all environment variables
 * @type {Object<string, string>}
 */
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

// Warn if DISCORD_CLIENT_ID is missing (may cause slash registration issues)
if (!env.DISCORD_CLIENT_ID) {
    logger.warn('⚠️ DISCORD_CLIENT_ID not set. Slash command registration may fail.');
}

// ──────────────── NETWORK CHECK (if in Docker) ────────────────

/**
 * Ensures that the Eclipse-Bot container is connected to `ecbot-net`.
 * Logs a warning if not found, but does not exit to allow local dev startup.
 */
async function checkBotNetworkMembership() {
    const docker = new Docker();
    const networkName = 'ecbot-net';

    try {
        // Attempt to detect container ID
        let containerId = null;
        if (fs.existsSync('/proc/self/cgroup')) {
            containerId = fs.readFileSync('/proc/self/cgroup', 'utf8')
                .split('\n')
                .find(line => line.includes('docker'))
                ?.split('/')
                ?.pop();
        }

        if (!containerId) {
            logger.info('ℹ️ Not running inside Docker — skipping network check.');
            return;
        }

        // Inspect Docker network
        const network = docker.getNetwork(networkName);
        const netInfo = await network.inspect();
        const found = Object.values(netInfo.Containers).some(c => c.Name.includes('eclipse-bot'));

        if (!found) {
            logger.warn(`⚠️ Docker container is NOT connected to '${networkName}'. This may break Mongo setup.`);
        } else {
            logger.info(`🌐 Container is connected to '${networkName}'`);
        }
    } catch (err) {
        logger.warn(`⚠️ Failed to verify Docker network membership: ${err.message}`);
    }
}

// ──────────────── MAIN STARTUP ────────────────

/**
 * Initializes the bot and registers Discord commands.
 * Exits process on fatal startup errors.
 */
async function main() {
    logger.info('🚀 Starting Eclipse-Bot...');

    await checkBotNetworkMembership();

    try {
        const client = await initDiscord(env); // ✅ returns client instance

        if (!client) {
            throw new Error('Discord client was not returned by initDiscord');
        }

        client.once('ready', () => {
            logger.success(`🤖 Bot is ready and logged in as ${client.user.tag}`);
        });

        // Inform if Mongo setup hasn't been completed yet
        if (!process.env.MONGO_URI) {
            logger.warn('⚠️ MONGO_URI not yet set. Complete `/setup` to enable DB features.');
        }

    } catch (err) {
        logger.error('🔥 Fatal error in main execution:', err);
        process.exit(1);
    }
}

// ──────────────── EXECUTE ────────────────

main()
    .then(() => {
        logger.success('📦 Command registration process completed.');
    })
    .catch((err) => {
        logger.error('❌ Unhandled error in main:', err);
        process.exit(1);
    });
