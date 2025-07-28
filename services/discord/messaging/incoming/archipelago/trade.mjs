// services/discord/messaging/incoming/archipelago/trade.mjs

import {sendTradeMessage} from '../../outgoing/discord/trade.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Processes item trades or mail messages from Archipelago and forwards to Discord trade channel.
 * @param {string} message - The trade-related message.
 * @param {Player} fromPlayer - The sender (if applicable).
 * @param {Player} toPlayer - The receiver (if applicable).
 */
export async function handleTradeFromArchipelago(message, fromPlayer, toPlayer) {
    try {
        const sender = fromPlayer?.alias || fromPlayer?.name || 'Unknown';
        const receiver = toPlayer?.alias || toPlayer?.name || 'Unknown';
        const label = `📦 Trade: ${sender} → ${receiver}`;

        await sendTradeMessage({title: label, description: message});
    } catch (err) {
        logger.error('💥 Failed to handle Archipelago trade message:', err);
    }
}
