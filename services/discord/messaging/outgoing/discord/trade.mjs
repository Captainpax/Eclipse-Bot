// services/discord/messaging/outgoing/discord/trade.mjs

/**
 * Sends a trade-related message to the Discord trade channel
 * @param {import('discord.js').Client} client
 * @param {string} channelId
 * @param {string} content
 */
export async function sendTradeToDiscord(client, channelId, content) {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send({
        embeds: [{
            title: '🔁 Trade Event',
            description: content,
            color: 0x00bcd4
        }]
    });
}
