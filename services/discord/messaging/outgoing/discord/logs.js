// services/discord/messaging/outgoing/discord/logs.js

/**
 * Sends a log/debug message to the Discord log channel
 * @param {import('discord.js').Client} client
 * @param {string} channelId
 * @param {string} content
 */
export async function sendLogToDiscord(client, channelId, content) {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send({
        embeds: [{
            title: '📝 Log',
            description: content,
            color: 0x808080
        }]
    });
}
