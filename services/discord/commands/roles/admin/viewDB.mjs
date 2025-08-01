import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    SlashCommandSubcommandBuilder
} from 'discord.js';
import {DatabaseHandler} from '../../../../../system/database/mongo/mongoHandler.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * /ec viewdb
 * Allows administrators to view full MongoDB collections (Players or Servers).
 */
export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('viewdb')
        .setDescription('👁 View entire MongoDB collections (Players or Servers).'),

    async execute(interaction) {
        try {
            // Manual admin permission check
            if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('view_players')
                    .setLabel('👥 View Players Collection')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('view_servers')
                    .setLabel('🛠 View Servers Collection')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({
                content: '🔍 **Which collection would you like to view?**',
                components: [row],
                ephemeral: true
            });

            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({filter, time: 20000});

            collector.on('collect', async i => {
                try {
                    await DatabaseHandler.ensureConnection();

                    let data = [];
                    if (i.customId === 'view_players') {
                        logger.debug('📂 Fetching Players collection...');
                        const Player = DatabaseHandler.getPlayerModel
                            ? await DatabaseHandler.getPlayerModel()
                            : null;
                        if (Player) data = await Player.find().lean();
                    }
                    if (i.customId === 'view_servers') {
                        logger.debug('📂 Fetching Servers collection...');
                        const Server = DatabaseHandler.getServerModel
                            ? await DatabaseHandler.getServerModel()
                            : null;
                        if (Server) data = await Server.find().lean();
                    }

                    if (!data || !data.length) {
                        return i.reply({
                            content: '📭 No data found in this collection.',
                            ephemeral: true
                        });
                    }

                    const formatted = '```json\n' + JSON.stringify(data, null, 2) + '\n```';

                    if (formatted.length <= 2000) {
                        await i.reply({content: formatted, ephemeral: true});
                    } else {
                        const chunks = formatted.match(/[\s\S]{1,1900}/g) || [];
                        for (const chunk of chunks) {
                            await i.followUp({content: '```json\n' + chunk + '\n```', ephemeral: true});
                        }
                    }
                } catch (err) {
                    logger.error(`🔥 Error fetching DB: ${err.message}`);
                    await i.reply({content: '❌ Failed to fetch database content.', ephemeral: true});
                }
            });

            collector.on('end', async () => {
                try {
                    await interaction.editReply({
                        content: '⌛ Interaction timed out.',
                        components: []
                    });
                } catch (_) {
                }
            });
        } catch (err) {
            logger.error(`🔥 Error in /ec viewdb command: ${err.message}`);
            if (!interaction.replied) {
                await interaction.reply({content: '❌ Command failed to execute.', ephemeral: true}).catch(() => {
                });
            }
        }
    }
};
