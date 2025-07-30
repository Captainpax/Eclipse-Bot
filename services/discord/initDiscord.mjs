import {Client, GatewayIntentBits, Partials} from 'discord.js';
import logger from '../../system/log/logHandler.mjs';
import {ChannelMessageRouter} from './guilds/channelHandler.mjs';
import {registerCommandHandlers} from './commands/commandHandler.mjs';
import {getGuildConfig} from './users/usersHandler.mjs';
import {handleSetupInteraction, handleSetupMessage, runFirstTimeSetup} from './setup.mjs';

/**
 * Initializes the Discord bot, sets up commands and message handling.
 * Handles first-time setup via SuperUser DM if no guild config exists.
 *
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
            // If a GUILD_ID is provided, try to load config
            if (env.GUILD_ID) {
                const config = await getGuildConfig(env.GUILD_ID);
                if (!config) {
                    logger.warn(`⚠️ No config found for guild ${env.GUILD_ID}. Initiating SuperUser setup...`);
                    await runFirstTimeSetup(client);
                } else {
                    logger.info(`🛠️ Loaded config for guild ${env.GUILD_ID}`);
                }
            } else {
                // No GUILD_ID means fresh install → DM SuperUser
                logger.info('ℹ️ No GUILD_ID specified. Starting first-time setup via SuperUser DM...');
                await runFirstTimeSetup(client);
            }
        } catch (err) {
            logger.error('❌ Error during initial setup check:', err);
            logger.warn('⚠️ Attempting to fall back to SuperUser setup...');
            try {
                await runFirstTimeSetup(client);
            } catch (setupErr) {
                logger.error('❌ Failed to initiate setup:', setupErr);
            }
        }
    });

    // Message events
    client.on('messageCreate', (message) => {
        try {
            handleSetupMessage(message);
        } catch (err) {
            logger.error('❌ Error in setup message handler:', err);
        }
    });

    client.on('messageCreate', (message) => {
        try {
            ChannelMessageRouter.handle(message, env, client);
        } catch (err) {
            logger.error('❌ Error in channel message router:', err);
        }
    });

    // Setup button & dropdown interactions
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await handleSetupInteraction(interaction, client);
            }
        } catch (err) {
            logger.error('❌ Setup interaction failed:', err);
            if (!interaction.replied) {
                await interaction.reply({content: '❌ Setup error, please retry.', ephemeral: true});
            }
        }
    });

    // Log in to Discord
    await client.login(env.DISCORD_TOKEN);

    // Register slash commands globally if no guild specified
    const handler = new registerCommandHandlers(
        client,
        env.DISCORD_TOKEN,
        env.DISCORD_CLIENT_ID,
        env.GUILD_ID || null
    );

    try {
        await handler.register();
    } catch (err) {
        logger.error('❌ Failed to register slash commands:', err);
    }
}
