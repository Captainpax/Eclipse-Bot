// services/discord/messaging/incoming/archipelago/logs.js

import {sendLogMessage} from '../../outgoing/discord/logs.js';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Sends internal logs or debug messages to the Discord log channel.
 * @param {string} text - The log line.
 */
export async function handleLogFromArchipelago(text) {
    try {
        await sendLogMessage(`📄 ${text}`);
    } catch (err) {
        logger.error('💥 Failed to handle Archipelago log line:', err);
    }
}
