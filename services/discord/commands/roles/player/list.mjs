import {SlashCommandSubcommandBuilder} from 'discord.js';
import {getSignupQueue} from '../../../guilds/channelHandler.mjs';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('list')
        .setDescription('Show the current signup queue.'),

    async execute(interaction) {
        try {
            const guildId = interaction.guildId;
            const queue = getSignupQueue(guildId);

            if (!queue || queue.length === 0) {
                return interaction.reply({
                    content: '📭 The signup queue is currently empty.',
                    ephemeral: true,
                });
            }

            const list = queue.map((id, i) => `\n> **${i + 1}.** <@${id}>`).join('');
            await interaction.reply({
                content: `📋 **Signup Queue:**${list}`,
                allowedMentions: {parse: []},
            });
        } catch (err) {
            console.error('🔥 /ec list command error:', err);
            await interaction.reply({
                content: '❌ Could not fetch the signup queue.',
                ephemeral: true,
            });
        }
    },
};
