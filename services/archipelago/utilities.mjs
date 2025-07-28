// services/archipelago/utilities.mjs

import {getUserLink} from '../../system/database/databaseHandler.mjs';

const recentMessages = new Set();
const MAX_CACHE = 50;

/**
 * Avoids processing duplicate messages
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
 * Extracts slot names from an Archipelago message
 */
export function extractSlotNames(text) {
    const regex = /([A-Z][a-z0-9_]+(?: [A-Z][a-z0-9_]+)*)(?: \(Team #[0-9]+\))?/g;
    const names = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
        names.add(match[1]);
    }
    return [...names];
}

/**
 * Resolves Discord user mentions from AP slot names
 */
export async function getUserMentionsFromText(text) {
    const names = extractSlotNames(text);
    const mentions = new Set();

    for (const name of names) {
        const user = await getUserLink(name);
        if (user?.discordId) mentions.add(`<@${user.discordId}>`);
    }

    return [...mentions];
}
