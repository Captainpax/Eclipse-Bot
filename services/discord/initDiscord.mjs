/**
 * @file initDiscord.mjs
 * @description
 * Initializes the Discord client for Eclipse-Bot, registers commands,
 * manages configuration persistence, and handles setup wizards.
 *
 * Features:
 *  - Connects to Discord with required intents & partials
 *  - Loads existing guild configuration or runs SuperUser setup wizard
 *  - Registers slash commands (global or guild-specific)
 *  - Handles text commands and slash commands
 *  - Manages core and guild setup interactions (buttons, selects, messages)
 *  - Logs events and command executions for debugging & transparency
 */

import {Client, EmbedBuilder, GatewayIntentBits, Partials} from 'discord.js';
import fs from 'fs';
import path from 'path';
import logger from '../../system/log/logHandler.mjs';
import {registerCommandHandlers} from './commands/commandHandler.mjs';
import {getGuildConfig} from './users/usersHandler.mjs';
import {handleSetupInteraction, handleSetupMessage, runFirstTimeSetup} from './setupHandler.mjs';

/**
 * Updates the `.env` file and process environment with a new `GUILD_ID`.
 * Ensures no duplicate entries are present in `.env`.
 *
 * @param {string} guildId - The ID of the guild to store
 */
function updateEnvGuildId(guildId) {
    const envPath = path.resolve('./.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    // Remove any existing GUILD_ID entries
    content = content.replace(/\n?GUILD_ID=.*/g, '').trim();
    content += `\nGUILD_ID=${guildId}\n`;
    fs.writeFileSync(envPath, content, 'utf8');
    process.env.GUILD_ID = guildId;
    logger.info(`✅ Saved GUILD_ID=${guildId} to .env`);
}

/**
 * Initializes the Discord bot client, loads configuration, and manages setup.
 *
 * @async
 * @param {Object} env - Environment variables
 * @param {string} env.DISCORD_TOKEN - Bot token
 * @param {string} env.DISCORD_CLIENT_ID - Bot client ID
 * @param {string} [env.GUILD_ID] - Pre-configured guild ID (optional)
 * @returns {Promise<Client>} The initialized Discord.js client
 */
export default async function initDiscord(env) {
    // Instantiate Discord client with necessary intents and partials
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

    let logChannel = null;

    /**
     * On bot ready:
     * - Attempts to load existing configuration
     * - Initiates setup wizard if no configuration is found
     * - Registers commands
     */
    client.once('ready', async () => {
        logger.success(`🤖 Logged in as ${client.user.tag}`);

        let config = null;
        try {
            // Load existing config if GUILD_ID is defined
            if (env.GUILD_ID) {
                config = await getGuildConfig(env.GUILD_ID);
            } else {
                // Otherwise, try to auto-select the master config or first available config
                const configs = await getGuildConfig();
                if (Array.isArray(configs) && configs.length > 0) {
                    config = configs.find(cfg => cfg.isMaster) || configs[0];
                    updateEnvGuildId(config.guildId);
                }
            }

            // If no valid or bootstrapped config, run the SuperUser setup wizard
            if (!config || !config.bootstrapped) {
                logger.warn(`⚠️ No bootstrapped config found. Initiating SuperUser setup wizard…`);
                await runFirstTimeSetup(client);
            } else {
                logger.info(`✅ Existing guild configuration found (Guild ID: ${config.guildId}). Skipping setup wizard.`);
            }

            // Attempt to fetch configured logs channel
            if (config?.logsChannelId) {
                logChannel = await client.channels.fetch(config.logsChannelId).catch(() => null);
            }
        } catch (err) {
            logger.error('❌ Error during initial setup check:', err);
        }

        // Register slash commands (guild-specific if GUILD_ID exists)
        const handler = new registerCommandHandlers(
            client,
            env.DISCORD_TOKEN,
            env.DISCORD_CLIENT_ID,
            process.env.GUILD_ID || null
        );

        try {
            await handler.register();
            logger.success(`✅ Slash commands registered (${process.env.GUILD_ID ? 'Guild' : 'Global'} mode)`);

            if (logChannel?.isTextBased()) {
                await logChannel.send(`✅ Slash commands registered (${process.env.GUILD_ID ? 'Guild' : 'Global'} mode).`);
            }
        } catch (err) {
            logger.error('❌ Failed to register slash commands:', err);
        }
    });

    /**
     * Handles direct messages during SuperUser setup.
     */
    client.on('messageCreate', async (message) => {
        try {
            if (message.channel.type === 1 || message.channel.isDMBased?.()) {
                await handleSetupMessage(message);
            }
        } catch (err) {
            logger.error('❌ Error in setup message handler:', err);
        }
    });

    /**
     * Handles prefix-based text commands (`!command`).
     * Optional feature for non-slash commands.
     */
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        const prefix = '!';
        if (!message.content.startsWith(prefix)) return;

        const cmdName = message.content.slice(prefix.length).split(/\s+/)[0].toLowerCase();
        const cmd = client.textCommands?.get(cmdName);
        if (!cmd) return;

        try {
            if (logChannel?.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('📝 Text Command Executed')
                    .setColor(0x00AE86)
                    .addFields(
                        {name: 'Command', value: cmdName, inline: true},
                        {name: 'User', value: `<@${message.author.id}>`, inline: true}
                    )
                    .setTimestamp();
                await logChannel.send({embeds: [embed]});
            }

            await cmd.execute(message);
        } catch (err) {
            logger.error(`❌ Text command '${cmdName}' failed: ${err.message}`);
            if (logChannel?.isTextBased()) {
                await logChannel.send(`❌ Text command \`${cmdName}\` failed: ${err.message}`);
            }
        }
    });

    /**
     * Unified interaction handler:
     * - Slash commands
     * - Setup wizard interactions (core & guild)
     */
    client.on('interactionCreate', async (interaction) => {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                let command;
                if (interaction.commandName === 'ec' && typeof interaction.options.getSubcommand === 'function') {
                    try {
                        command = client.commands.get(interaction.options.getSubcommand());
                    } catch {
                        command = null;
                    }
                } else {
                    command = client.commands.get(interaction.commandName);
                }

                if (command && typeof command.execute === 'function') {
                    await command.execute(interaction);
                }
            }

            // Handle setup wizard interactions
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                logger.info(`⚙️ Setup interaction triggered: ${interaction.customId}`);
                await handleSetupInteraction(interaction, client);
            }
        } catch (err) {
            logger.error('❌ Interaction handler failed:', err);
            if (!interaction.replied) {
                await interaction.reply({content: '❌ Interaction error, please retry.', flags: 64}).catch(() => {
                });
            }
        }
    });

    // Attempt login
    try {
        await client.login(env.DISCORD_TOKEN);
    } catch (err) {
        logger.error('❌ Failed to log into Discord:', err);
    }

    return client;
}
