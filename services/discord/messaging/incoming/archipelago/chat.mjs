// services/discord/messaging/incoming/archipelago/chat.mjs

import {sendChatMessage} from '../../outgoing/discord/chat.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Handles incoming Archipelago chat messages and relays them to the Discord chat channel.
 * @param {string} message - The chat message.
 * @param {Player} player - The player who sent the message.
 */
export async function handleChatFromArchipelago(message, player) {
    try {
        const formatted = `💬 [${player.alias || player.name}]: ${message}`;
        await sendChatMessage(formatted);
    } catch (err) {
        logger.error('💥 Failed to handle Archipelago chat:', err);
    }
}
