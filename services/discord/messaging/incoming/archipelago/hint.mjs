// services/discord/messaging/incoming/archipelago/hint.mjs

import {sendHintMessage} from '../../outgoing/discord/hint.mjs';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Handles hint messages from Archipelago and forwards to the hint channel.
 * @param {string} message - The hint text.
 */
export async function handleHintFromArchipelago(message) {
    try {
        await sendHintMessage(`💡 Hint: ${message}`);
    } catch (err) {
        logger.error('💥 Failed to handle Archipelago hint:', err);
    }
}
