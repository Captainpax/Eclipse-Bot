// services/discord/messaging/incoming/discord/hint.mjs

import {sendHintToArchipelago} from '../../outgoing/archipelago/hint.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Handles hints posted in the Discord hint channel.
 * @param {import('discord.js').Message} message
 */
export async function handleDiscordHint(message) {
    try {
        const content = message.content.trim();
        if (!content) return;

        await sendHintToArchipelago(content);
    } catch (err) {
        logger.error('💥 Failed to handle Discord hint message:', err);
    }
}
