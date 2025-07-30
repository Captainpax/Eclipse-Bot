// services/archipelago/utilities.mjs

import {getPlayer} from '../../system/database/databaseHandler.mjs';

const recentMessages = new Set();
const MAX_CACHE = 50;

/**
 * Avoids processing duplicate messages
 * @param {string} msg - Raw message text
 * @returns {boolean} True if the message was already seen
 */
export function isDuplicateMessage(msg) {
    if (recentMessages.has(msg)) return true;
    recentMessages.add(msg);
    if (recentMessages.size > MAX_CACHE) {
        const first = recentMessages.values().next().value;
        recentMessages.delete(first);
    }
    return false;
}

/**
 * Extracts possible slot names from an Archipelago message
 * @param {string} text - The incoming AP message text
 * @returns {string[]} List of unique slot names
 */
export function extractSlotNames(text) {
    const regex = /([A-Z][a-z0-9_]+(?: [A-Z][a-z0-9_]+)*)(?: \(Team #[0-9]+\))?/gi;
    const names = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
        names.add(match[1].trim());
    }
    return [...names];
}

/**
 * Resolves Discord user mentions from AP slot names
 * Looks up players collection where any linkedGuild.serverUuid matches the name
 * @param {string} text - Raw AP message
 * @returns {Promise<string[]>} List of Discord mentions
 */
export async function getUserMentionsFromText(text) {
    const names = extractSlotNames(text);
    const mentions = new Set();

    for (const slotName of names) {
        // Look up by slot name (player _id or linked server entry)
        const player = await getPlayer(slotName);

        if (player?.discordId) {
            mentions.add(`<@${player.discordId}>`);
            continue;
        }

        // If player wasn't found directly, try scanning linkedGuilds.servers
        // Example: if "GOOM World" matches a server name
        if (player?.linkedGuilds) {
            for (const guildLink of player.linkedGuilds) {
                const foundServer = guildLink.servers.find(
                    s => s.serverName.toLowerCase() === slotName.toLowerCase()
                );
                if (foundServer && player.discordId) {
                    mentions.add(`<@${player.discordId}>`);
                }
            }
        }
    }

    return [...mentions];
}
