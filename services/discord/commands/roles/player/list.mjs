import {SlashCommandSubcommandBuilder} from 'discord.js';
import {getSignupQueue} from '../../../guilds/channelHandler.mjs';

// Safe reply helper to prevent "Unknown interaction" errors
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (err) {
        console.error(`❌ Failed to send reply in /ec list: ${err.message}`);
    }
}

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('list')
        .setDescription('Show the current signup queue.'),

    async execute(interaction) {
        try {
            const guildId = interaction.guildId;
            const queue = getSignupQueue(guildId);

            if (!queue || queue.length === 0) {
                return safeReply(interaction, {
                    content: '📭 The signup queue is currently empty.',
                    ephemeral: true,
                });
            }

            const list = queue.map((id, i) => `\n> **${i + 1}.** <@${id}>`).join('');
            await safeReply(interaction, {
                content: `📋 **Signup Queue:**${list}`,
                allowedMentions: {parse: []},
            });
        } catch (err) {
            console.error('🔥 /ec list command error:', err);
            await safeReply(interaction, {
                content: '❌ Could not fetch the signup queue.',
                ephemeral: true,
            });
        }
    },
};
