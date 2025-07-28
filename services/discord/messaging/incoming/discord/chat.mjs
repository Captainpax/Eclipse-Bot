// services/discord/messaging/incoming/discord/chat.mjs

import {sendChatToArchipelago} from '../../outgoing/archipelago/chat.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Handles chat messages typed in the Discord chat channel.
 * Forwards them to the Archipelago server.
 * @param {import('discord.js').Message} message
 */
export async function handleDiscordChat(message) {
    try {
        const content = message.content.trim();
        if (!content) return;

        const username = message.member?.displayName || message.author.username;
        const formatted = `[${username}] ${content}`;

        await sendChatToArchipelago(formatted);
    } catch (err) {
        logger.error('💥 Failed to handle Discord chat message:', err);
    }
}
