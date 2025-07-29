// services/discord/commands/roles/player/ping.mjs

import {SlashCommandBuilder} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if the bot is alive! 🏓'),

    async execute(interaction) {
        await interaction.reply('🏓 Pong!');
    },
};
