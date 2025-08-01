// 📁 services/discord/commands/linked/link.mjs

import {SlashCommandSubcommandBuilder} from 'discord.js';
import {upsertPlayer} from '../../../users/usersHandler.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Safely sends a reply to the interaction, supporting follow-ups.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('discord.js').InteractionReplyOptions} payload
 */
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (err) {
        logger.error(`❌ Failed to send reply in /ec link: ${err.message}`);
    }
}

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to Eclipse‑Bot.'),

    /**
     * Links a user’s Discord ID to a Player profile.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        const discordId = interaction.user.id;

        try {
            // Create or update player using their Discord ID
            const player = await upsertPlayer(discordId, discordId);

            if (!player || !player.discordId) {
                logger.warn(`⚠️ upsertPlayer returned invalid data for ID ${discordId}`);
                return safeReply(interaction, {
                    content: '❌ Failed to link your account. Please try again later.',
                    ephemeral: true
                });
            }

            return safeReply(interaction, {
                content: '✅ You are now linked to Eclipse‑Bot! You can join games and receive items.',
                ephemeral: true
            });

        } catch (err) {
            logger.error(`🔥 /ec link command failed: ${err.message}`);
            return safeReply(interaction, {
                content: '❌ An error occurred while linking your account. Please try again.',
                ephemeral: true
            });
        }
    }
};
