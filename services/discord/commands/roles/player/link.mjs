// services/discord/commands/roles/player/link.mjs

import {SlashCommandBuilder} from 'discord.js';
import {linkUser} from '../../../users/usersHandler.mjs';

export default {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord user to an Archipelago slot.')
        .addStringOption((option) =>
            option
                .setName('slot')
                .setDescription('Your Archipelago slot name')
                .setRequired(true)
        ),

    async execute(interaction) {
        const slotName = interaction.options.getString('slot');
        const result = linkUser(interaction.user.id, slotName);

        if (result) {
            await interaction.reply(`✅ Linked your Discord to **${slotName}**.`);
        } else {
            await interaction.reply('⚠️ Failed to link account. Try again or contact an admin.');
        }
    },
};
