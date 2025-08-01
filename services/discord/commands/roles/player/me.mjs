import {SlashCommandSubcommandBuilder} from 'discord.js';
import {getPlayer} from '../../../users/usersHandler.mjs';
import {addToSignupQueue} from '../../../guilds/channelHandler.mjs';

// Safe reply helper to avoid "Unknown interaction" issues
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (err) {
        console.error(`❌ Failed to send reply in /ec me: ${err.message}`);
    }
}

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('me')
        .setDescription('Join the signup queue for the next Archipelago game.'),

    async execute(interaction) {
        try {
            const user = await getPlayer(interaction.user.id);
            const isLinked = !!user;

            if (!isLinked) {
                return safeReply(interaction, {
                    content: '❌ You must use `/ec link` first to join the queue.',
                    ephemeral: true,
                });
            }

            const guildId = interaction.guildId;
            const result = addToSignupQueue(guildId, interaction.user.id);

            if (result === 'already') {
                return safeReply(interaction, {
                    content: '⚠️ You’re already on the signup list!',
                    ephemeral: true,
                });
            }

            await safeReply(interaction, {content: '✅ You’ve been added to the signup queue!'});
        } catch (err) {
            console.error('🔥 /ec me command error:', err);
            await safeReply(interaction, {
                content: '❌ Unable to add you to the signup queue at this time.',
                ephemeral: true,
            });
        }
    },
};
