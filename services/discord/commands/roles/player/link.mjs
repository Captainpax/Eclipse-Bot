import {SlashCommandBuilder} from 'discord.js';
import {upsertPlayer} from '../../../users/usersHandler.mjs';

export default {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to Eclipse-Bot.'),

    async execute(interaction) {
        try {
            const discordId = interaction.user.id;

            // Use DiscordId as the PlayerId for now
            const player = await upsertPlayer(discordId, discordId);

            if (!player) {
                return interaction.reply({
                    content: '❌ Failed to link your account. Please try again later.',
                    ephemeral: true,
                });
            }

            await interaction.reply(`✅ Your account has been successfully linked!`);
        } catch (err) {
            console.error('🔥 /link command error:', err);
            await interaction.reply({
                content: '❌ An unexpected error occurred while linking your account.',
                ephemeral: true,
            });
        }
    },
};
