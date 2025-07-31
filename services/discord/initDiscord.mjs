import {Client, GatewayIntentBits, Partials} from 'discord.js';
import fs from 'fs';
import path from 'path';
import logger from '../../system/log/logHandler.mjs';
import {ChannelMessageRouter} from './guilds/channelHandler.mjs';
import {registerCommandHandlers} from './commands/commandHandler.mjs';
import {getGuildConfig} from './users/usersHandler.mjs';
import {handleSetupInteraction, handleSetupMessage, runFirstTimeSetup} from './setup.mjs';

/**
 * Updates .env file with a new GUILD_ID
 * @param {string} guildId
 */
function updateEnvGuildId(guildId) {
    const envPath = path.resolve('./.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Remove old GUILD_ID if exists
    content = content.replace(/GUILD_ID=.*/g, '').trim();

    // Append new GUILD_ID
    content += `\nGUILD_ID=${guildId}\n`;
    fs.writeFileSync(envPath, content, 'utf8');

    process.env.GUILD_ID = guildId;
    logger.info(`✅ Saved GUILD_ID=${guildId} to .env`);
}

/**
 * Initializes the Discord bot and ensures setup runs only on fresh install.
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
        partials: [Partials.Channel],
    });

    client.once('ready', async () => {
        logger.success(`🤖 Logged in as ${client.user.tag}`);

        try {
            let config = null;

            if (env.GUILD_ID) {
                config = await getGuildConfig(env.GUILD_ID);
            } else {
                // Try to find any existing guild config if env var is missing
                const configs = await getGuildConfig(); // should return array if no ID is provided
                if (Array.isArray(configs) && configs.length > 0) {
                    config = configs[0];
                    updateEnvGuildId(config.guildId);
                }
            }

            if (!config || !config.bootstrapped) {
                logger.warn(`⚠️ No bootstrapped config found. Initiating SuperUser setup wizard...`);
                await runFirstTimeSetup(client);
            } else {
                logger.info(`✅ Existing guild configuration found (Guild ID: ${config.guildId}). Skipping setup wizard.`);
            }
        } catch (err) {
            logger.error('❌ Error during initial setup check:', err);
            logger.warn('⚠️ Falling back to SuperUser setup wizard...');
            try {
                await runFirstTimeSetup(client);
            } catch (setupErr) {
                logger.error('❌ Failed to initiate setup wizard:', setupErr);
            }
        }

        // Register slash commands
        const handler = new registerCommandHandlers(
            client,
            env.DISCORD_TOKEN,
            env.DISCORD_CLIENT_ID,
            process.env.GUILD_ID || null
        );

        try {
            await handler.register();
            logger.success(`✅ Slash commands registered (${process.env.GUILD_ID ? 'Guild' : 'Global'} mode)`);
        } catch (err) {
            logger.error('❌ Failed to register slash commands:', err);
        }
    });

    // Message events
    client.on('messageCreate', async (message) => {
        try {
            await handleSetupMessage(message);
        } catch (err) {
            logger.error('❌ Error in setup message handler:', err);
        }
    });

    client.on('messageCreate', async (message) => {
        try {
            await ChannelMessageRouter.handle(message, env, client);
        } catch (err) {
            logger.error('❌ Error in channel message router:', err);
        }
    });

    // Button & dropdown interactions
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await handleSetupInteraction(interaction, client);
            }
        } catch (err) {
            logger.error('❌ Setup interaction failed:', err);
            if (!interaction.replied) {
                await interaction.reply({content: '❌ Setup error, please retry.', flags: 64}).catch(() => {
                });
            }
        }
    });

    // Log in to Discord
    try {
        await client.login(env.DISCORD_TOKEN);
    } catch (err) {
        logger.error('❌ Failed to log into Discord:', err);
    }
}
