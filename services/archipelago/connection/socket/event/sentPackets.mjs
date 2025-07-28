// services/archipelago/connection/socket/event/sentPackets.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Called when we send packets to the server (audit/debug).
 * @param {WebSocket} ws
 * @param {object[]} packets
 */
export default function onSentPackets(ws, packets) {
    packets.forEach((packet, i) => {
        logger.debug(`📤 Sent packet [${i + 1}/${packets.length}]:`, packet);
    });
}
