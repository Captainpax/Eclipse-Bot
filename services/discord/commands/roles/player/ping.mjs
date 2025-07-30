import {SlashCommandBuilder} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check if Eclipse-Bot is online and responding.'),

    async execute(interaction) {
        try {
            const sent = await interaction.reply({content: '🏓 Pinging...', fetchReply: true});
            const latency = sent.createdTimestamp - interaction.createdTimestamp;

            await interaction.editReply(`🏓 Pong! Latency: **${latency}ms**`);
        } catch (err) {
            console.error('🔥 /ping command error:', err);
            await interaction.reply({
                content: '❌ Ping failed. Bot might be experiencing issues.',
                ephemeral: true,
            });
        }
    },
};
