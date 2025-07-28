// services/discord/messaging/incoming/discord/trade.mjs

import {sendTradeToArchipelago} from '../../outgoing/archipelago/trade.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Forwards trade-related messages typed in the Discord trade channel to the Archipelago server.
 * @param {import('discord.js').Message} message
 */
export async function handleDiscordTrade(message) {
    try {
        const content = message.content.trim();
        if (!content) return;

        await sendTradeToArchipelago(content);
    } catch (err) {
        logger.error('💥 Failed to handle Discord trade message:', err);
    }
}
