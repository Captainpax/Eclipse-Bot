// 📁 services/discord/commands/roles/player/list.mjs

import {SlashCommandBuilder} from 'discord.js';
import {getSignupQueue} from '../../../guilds/channelHandler.mjs';

export default {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('View the current signup queue for the next game.'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const queue = getSignupQueue(guildId);

        if (!queue.length) {
            return interaction.reply({
                content: '📭 The signup queue is currently empty.',
                ephemeral: true,
            });
        }

        const formatted = queue.map((userId, index) => `${index + 1}. <@${userId}>`).join('\n');

        await interaction.reply({
            content: `📋 **Signup Queue**:\n${formatted}`,
            ephemeral: true,
        });
    },
};
