// services/discord/utilities.mjs

import {ChannelType} from 'discord.js';

/**
 * Returns true if a message was sent by a bot (including ourselves).
 * @param {import('discord.js').Message} message
 * @returns {boolean}
 */
export function isBotMessage(message) {
    return Boolean(message.author?.bot);
}

/**
 * Finds a role in a guild by name (case-insensitive).
 * @param {import('discord.js').Guild} guild
 * @param {string} roleName
 * @returns {import('discord.js').Role | null}
 */
export function getRoleByName(guild, roleName) {
    return (
        guild.roles.cache.find(
            (role) => role.name.toLowerCase() === roleName.toLowerCase()
        ) || null
    );
}

/**
 * Safely sends a message to a text-based channel by ID.
 * @param {import('discord.js').Client} client
 * @param {string} channelId - The ID of the channel to send to
 * @param {string | object} message - A string or Discord message payload
 */
export async function sendToChannel(client, channelId, message) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        await channel.send(message);
    } catch (err) {
        console.error(`❌ Failed to send message to ${channelId}:`, err);
    }
}
