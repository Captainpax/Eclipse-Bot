import {SlashCommandSubcommandBuilder} from 'discord.js';

// Safe reply helper to avoid "Unknown interaction" errors
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (err) {
        console.error(`❌ Failed to send reply in /ec ping: ${err.message}`);
    }
}

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('ping')
        .setDescription('Check if Eclipse-Bot is online and responding.'),

    async execute(interaction) {
        try {
            const sent = await safeReply(interaction, {content: '🏓 Pinging...', fetchReply: true});

            // Only attempt latency calculation if reply was successful
            if (sent?.createdTimestamp && interaction.createdTimestamp) {
                const latency = sent.createdTimestamp - interaction.createdTimestamp;
                await interaction.editReply(`🏓 Pong! Latency: **${latency}ms**`);
            }
        } catch (err) {
            console.error('🔥 /ec ping command error:', err);
            await safeReply(interaction, {
                content: '❌ Ping failed. Bot might be experiencing issues.',
                ephemeral: true,
            });
        }
    },
};
