// services/archipelago/connection/socket/event/retrieved.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Sent when item/state data is "retrieved" from AP
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onRetrieved(ws, packet) {
    logger.debug('📤 Retrieved data packet:', packet);
}
