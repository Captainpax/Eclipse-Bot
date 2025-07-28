// services/discord/utilities.mjs

/**
 * Returns true if a message was sent by a bot (including ourselves)
 * @param {import('discord.js').Message} message
 */
export function isBotMessage(message) {
    return message.author?.bot;
}

/**
 * Finds a role in a guild by name
 * @param {import('discord.js').Guild} guild
 * @param {string} roleName
 * @returns {import('discord.js').Role | null}
 */
export function getRoleByName(guild, roleName) {
    return guild.roles.cache.find((role) => role.name.toLowerCase() === roleName.toLowerCase()) || null;
}

/**
 * Safely sends a message to a channel by ID
 * @param {import('discord.js').Client} client
 * @param {string} channelId
 * @param {string | object} message
 */
export async function sendToChannel(client, channelId, message) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    try {
        await channel.send(message);
    } catch (err) {
        console.error(`❌ Failed to send message to ${channelId}:`, err);
    }
}

export class channelMap {
}