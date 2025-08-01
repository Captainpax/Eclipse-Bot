import {PermissionFlagsBits, SlashCommandSubcommandBuilder} from 'discord.js';
import {DatabaseHandler} from '../../../../../system/database/mongo/mongoHandler.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * /ec resetdb
 * Deletes all MongoDB collections (players, guild configs, servers).
 * Restricted to admins only.
 */
export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('resetdb')
        .setDescription('⚠️ Deletes all Eclipse-Bot data and restarts the bot.'),

    async execute(interaction) {
        try {
            // Manual admin permission check
            if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '⚠️ Are you sure you want to wipe **ALL data**? This will restart the bot in 2 seconds.',
                ephemeral: true
            });

            const db = await DatabaseHandler.ensureConnection();
            if (!db) {
                return interaction.followUp({
                    content: '❌ Could not connect to the database. Abort.',
                    ephemeral: true
                });
            }

            const Player = DatabaseHandler.getPlayerModel?.() ?? null;
            const Server = DatabaseHandler.getServerModel?.() ?? null;

            if (Player) {
                await Player.deleteMany({});
                logger.warn('⚠️ All Player documents wiped.');
            }
            if (Server) {
                await Server.deleteMany({});
                logger.warn('⚠️ All Server documents wiped.');
            }

            logger.warn(`⚠️ Database wiped by admin command from ${interaction.user.tag}`);

            await interaction.followUp({
                content: '🧼 Database wiped successfully. Restarting bot...',
                ephemeral: true
            });

            setTimeout(() => process.exit(1), 2000);

        } catch (err) {
            logger.error(`💥 Error in /ec resetdb command: ${err.message}`);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Failed to reset the database.',
                    ephemeral: true
                });
            }
        }
    }
};
