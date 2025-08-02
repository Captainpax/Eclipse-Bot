import {PermissionFlagsBits, SlashCommandSubcommandBuilder} from 'discord.js';
import {startGuildRoleSetup} from '../../../setup/guild/rolesSetup.mjs';
import {getGuildConfig} from '../../../users/usersHandler.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * /ec setupguild
 * Starts the guild-specific setup wizard for assigning roles and members.
 * - Available to Moderators and SuperUser anywhere.
 */
export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('setupguild')
        .setDescription('🛠 Start the interactive Guild Setup Wizard.'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const isSuperUser = process.env.SUPER_USER_ID && process.env.SUPER_USER_ID === userId;

            // Check mod-level permission unless SuperUser
            if (!isSuperUser && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    content: '❌ You lack the permissions to initiate the guild setup.',
                    ephemeral: true
                });
            }

            const guildId = interaction.guildId;
            const config = await getGuildConfig(guildId);
            if (!config) {
                return interaction.reply({
                    content: '❌ This server is not yet registered. Please contact the SuperUser.',
                    ephemeral: true
                });
            }

            // Start the guild setup wizard
            await startGuildRoleSetup(interaction, config);

        } catch (err) {
            logger.error(`🔥 Error in /ec setupguild: ${err.message}`);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Failed to initiate guild setup.',
                    ephemeral: true
                });
            }
        }
    }
};
