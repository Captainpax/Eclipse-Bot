// services/discord/messaging/incoming/discord/logs.js

import {sendLogToArchipelago} from '../../outgoing/archipelago/logs.js';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Sends debug or log notes typed into the Discord log channel to Archipelago.
 * @param {import('discord.js').Message} message
 */
export async function handleDiscordLog(message) {
    try {
        const text = message.content.trim();
        if (!text) return;

        await sendLogToArchipelago(`[DiscordLog] ${text}`);
    } catch (err) {
        logger.error('💥 Failed to handle Discord log message:', err);
    }
}
