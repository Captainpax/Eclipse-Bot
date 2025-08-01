import {Client, EmbedBuilder, GatewayIntentBits, Partials} from 'discord.js';
import fs from 'fs';
import path from 'path';
import logger from '../../system/log/logHandler.mjs';
import {registerCommandHandlers} from './commands/commandHandler.mjs';
import {getGuildConfig} from './users/usersHandler.mjs';
import {handleSetupInteraction, handleSetupMessage, runFirstTimeSetup} from './setupHandler.mjs';

/**
 * Updates .env file with a new GUILD_ID
 */
function updateEnvGuildId(guildId) {
    const envPath = path.resolve('./.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    content = content.replace(/GUILD_ID=.*/g, '').trim();
    content += `\nGUILD_ID=${guildId}\n`;
    fs.writeFileSync(envPath, content, 'utf8');
    process.env.GUILD_ID = guildId;
    logger.info(`✅ Saved GUILD_ID=${guildId} to .env`);
}

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

    let logChannel = null;

    client.once('ready', async () => {
        logger.success(`🤖 Logged in as ${client.user.tag}`);

        let config = null;
        try {
            if (env.GUILD_ID) {
                config = await getGuildConfig(env.GUILD_ID);
            } else {
                const configs = await getGuildConfig();
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

            // Fetch log channel
            if (config?.logsChannelId) {
                logChannel = await client.channels.fetch(config.logsChannelId).catch(() => null);
            }
        } catch (err) {
            logger.error('❌ Error during initial setup check:', err);
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

            if (logChannel?.isTextBased()) {
                await logChannel.send(`✅ Slash commands registered and available (${process.env.GUILD_ID ? 'Guild' : 'Global'} mode).`);
            }
        } catch (err) {
            logger.error('❌ Failed to register slash commands:', err);
        }
    });

    // Setup messages
    client.on('messageCreate', async (message) => {
        try {
            await handleSetupMessage(message);
        } catch (err) {
            logger.error('❌ Error in setup message handler:', err);
        }
    });

    // Text command detection
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        const prefix = '!'; // optional prefix
        const isPrefixCmd = message.content.startsWith(prefix);
        const cmdName = isPrefixCmd
            ? message.content.slice(prefix.length).split(/\s+/)[0].toLowerCase()
            : message.content.toLowerCase();

        const cmd = client.textCommands?.get(cmdName);
        if (!cmd) return;

        try {
            // Send structured log embed
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

            if (logChannel?.isTextBased()) {
                await logChannel.send(`✅ Text command \`${cmdName}\` completed successfully.`);
            }
        } catch (err) {
            logger.error(`❌ Text command '${cmdName}' failed: ${err.message}`);
            if (logChannel?.isTextBased()) {
                await logChannel.send(`❌ Text command \`${cmdName}\` failed: ${err.message}`);
            }
        }
    });

    // Unified interaction handler
    client.on('interactionCreate', async (interaction) => {
        try {
            // Slash command handling
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                if (logChannel?.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setTitle('💻 Slash Command Executed')
                        .setColor(0x5865F2)
                        .addFields(
                            {name: 'Command', value: `/${interaction.commandName}`, inline: true},
                            {name: 'User', value: `<@${interaction.user.id}>`, inline: true}
                        )
                        .setTimestamp();
                    await logChannel.send({embeds: [embed]});
                }

                try {
                    await command.execute(interaction);
                    if (logChannel?.isTextBased()) {
                        await logChannel.send(`✅ Slash command \`/${interaction.commandName}\` completed successfully.`);
                    }
                } catch (cmdErr) {
                    logger.error(`❌ Command '${interaction.commandName}' failed: ${cmdErr.message}`);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({content: '❌ There was an error executing this command.', flags: 64});
                    }
                    if (logChannel?.isTextBased()) {
                        await logChannel.send(`❌ Slash command \`/${interaction.commandName}\` failed: ${cmdErr.message}`);
                    }
                }
            }

            // Buttons & dropdowns
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
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

    // Discord login
    try {
        await client.login(env.DISCORD_TOKEN);
    } catch (err) {
        logger.error('❌ Failed to log into Discord:', err);
    }

    return client;
}
