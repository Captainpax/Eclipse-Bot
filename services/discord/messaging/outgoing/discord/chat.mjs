// services/discord/messaging/outgoing/discord/chat.mjs

/**
 * Sends a message to the Discord chat channel
 * @param {import('discord.js').Client} client
 * @param {string} channelId
 * @param {string} content
 */
export async function sendChatToDiscord(client, channelId, content) {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    await channel.send(content);
}
