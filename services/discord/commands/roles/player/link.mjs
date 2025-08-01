import {SlashCommandSubcommandBuilder} from 'discord.js';
import {upsertPlayer} from '../../../users/usersHandler.mjs';

// Safe reply helper to prevent "Unknown interaction" errors
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (err) {
        console.error(`❌ Failed to send reply in /ec link: ${err.message}`);
    }
}

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to Eclipse-Bot.'),

    async execute(interaction) {
        try {
            const discordId = interaction.user.id;

            // Use DiscordId as the PlayerId for now
            const player = await upsertPlayer(discordId, discordId);

            if (!player) {
                return safeReply(interaction, {
                    content: '❌ Failed to link your account. Please try again later.',
                    ephemeral: true,
                });
            }

            await safeReply(interaction, {content: '✅ Your account has been successfully linked!'});
        } catch (err) {
            console.error('🔥 /ec link command error:', err);
            await safeReply(interaction, {
                content: '❌ An unexpected error occurred while linking your account.',
                ephemeral: true,
            });
        }
    },
};
