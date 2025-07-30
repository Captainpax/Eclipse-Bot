import {PermissionFlagsBits, SlashCommandBuilder} from 'discord.js';
import {DatabaseHandler} from '../../../../../system/database/mongo/mongoHandler.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * /resetdb
 * Deletes all data in MongoDB (players, guild configs, servers).
 * Only available to admins or server owner.
 */
export default {
    data: new SlashCommandBuilder()
        .setName('resetdb')
        .setDescription('⚠️ Deletes all Eclipse-Bot data and restarts the bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
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
            logger.error(`💥 Error in /resetdb command: ${err.message}`);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Failed to reset the database.',
                    ephemeral: true
                });
            }
        }
    }
};
