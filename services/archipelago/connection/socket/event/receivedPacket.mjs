// services/archipelago/connection/socket/event/receivedPacket.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Called when an individual packet is received (low-level logging).
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onReceivedPacket(ws, packet) {
    logger.debug('📥 Received packet:', packet);
}
