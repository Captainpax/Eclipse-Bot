// services/archipelago/connection/socket/event/bounced.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Packet was "bounced" across slots (custom logic)
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onBounced(ws, packet) {
    logger.info('🏓 Bounced packet received.');
    logger.debug(packet);
}
