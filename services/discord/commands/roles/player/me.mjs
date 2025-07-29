// services/discord/commands/roles/player/me.mjs

import {SlashCommandBuilder} from 'discord.js';
import {getUser} from '../../../users/usersHandler.mjs';
import {addToSignupQueue} from '../../../guilds/channelHandler.mjs';

export default {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Join the signup queue for the next Archipelago game.'),

    async execute(interaction) {
        const user = getUser(interaction.user.id);
        const isLinked = !!user?.slot;

        if (!isLinked) {
            return interaction.reply({
                content: '❌ You must use `/link` first to join the queue.',
                ephemeral: true,
            });
        }

        const guildId = interaction.guildId;
        const result = addToSignupQueue(guildId, interaction.user.id);

        if (result === 'already') {
            return interaction.reply({
                content: '⚠️ You’re already on the signup list!',
                ephemeral: true,
            });
        }

        await interaction.reply('✅ You’ve been added to the signup queue!');
    },
};
