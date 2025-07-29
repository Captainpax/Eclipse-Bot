// 📁 services/discord/initDiscord.mjs

import {Client, GatewayIntentBits} from 'discord.js';
import logger from '../../system/log/logHandler.mjs';
import {ChannelMessageRouter} from './guilds/channelHandler.mjs';
import {registerCommandHandlers} from './commands/commandHandler.mjs';
import {getGuildConfig} from './users/usersHandler.mjs';
import {runFirstTimeSetup} from './guilds/setup.mjs';

/**
 * Initializes the Discord bot, sets up commands and message handling.
 * @param {Object} env - Environment variables
 */
export default async function initDiscord(env) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.DirectMessages,
        ],
        partials: ['CHANNEL'],
    });

    client.once('ready', async () => {
        logger.success(`🤖 Logged in as ${client.user.tag}`);

        // Check config and run setup if missing
        try {
            const config = await getGuildConfig(env.GUILD_ID);
            if (!config) {
                logger.warn(`⚠️ No config found for guild ${env.GUILD_ID}. Running first-time setup...`);
                await runFirstTimeSetup(client);
            } else {
                logger.info(`🛠️ Loaded config for guild ${env.GUILD_ID}`);
            }
        } catch (err) {
            logger.error('❌ Error during initial setup check:', err);
        }
    });

    // Handle messages
    client.on('messageCreate', (message) =>
        ChannelMessageRouter.handle(message, env, client)
    );

    // Login
    await client.login(env.DISCORD_TOKEN);

    // Register slash commands
    const handler = new registerCommandHandlers(
        client,
        env.DISCORD_TOKEN,
        env.DISCORD_CLIENT_ID,
        env.GUILD_ID
    );
    await handler.register();
}
