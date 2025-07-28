// services/archipelago/connection/socket/event/printJSON.mjs

import logger from '../../../../../system/log/logHandler.mjs';
import {handlePrintJSONMessage} from '../../../messaging/messageHandler.mjs';

/**
 * Handles PrintJSON packets — most Archipelago "chat" messages come here
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onPrintJSON(ws, packet) {
    logger.debug('🖨️ PrintJSON:', packet);

    if (Array.isArray(packet.data)) {
        handlePrintJSONMessage(packet.data);
    } else {
        logger.warn('⚠️ Malformed PrintJSON packet: missing data array.');
    }
}
