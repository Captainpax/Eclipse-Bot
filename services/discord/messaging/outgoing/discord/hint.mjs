// services/discord/messaging/outgoing/discord/hint.mjs

/**
 * Sends a hint message to the Discord hint channel
 * @param {import('discord.js').Client} client
 * @param {string} channelId
 * @param {string} content
 */
export async function sendHintToDiscord(client, channelId, content) {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send({
        embeds: [{
            title: '📍 Hint',
            description: content,
            color: 0xffc107
        }]
    });
}
