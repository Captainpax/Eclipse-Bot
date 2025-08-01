// ─────────────────────────────────────────────────────────────
// 🎬 Eclipse-Bot Entry Point
// ─────────────────────────────────────────────────────────────

import 'dotenv/config.js';
import logger from './system/log/logHandler.mjs';
import initDiscord from './services/discord/initDiscord.mjs';
import Docker from 'dockerode';

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

// ──────────────── NETWORK CHECK (if in Docker) ────────────────

async function checkBotNetworkMembership() {
    const docker = new Docker();
    const networkName = 'ecbot-net';
    try {
        const containerId = fs.readFileSync('/proc/self/cgroup', 'utf8')
            .split('\n')
            .find(line => line.includes('docker'))
            ?.split('/')
            ?.pop();

        if (!containerId) {
            logger.info('ℹ️ Not running inside Docker — skipping network check.');
            return;
        }

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

async function main() {
    logger.info('🚀 Starting Eclipse-Bot...');

    await checkBotNetworkMembership();

    try {
        const client = await initDiscord(env); // ✅ returns client

        if (!client) {
            throw new Error('Discord client was not returned by initDiscord');
        }

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
