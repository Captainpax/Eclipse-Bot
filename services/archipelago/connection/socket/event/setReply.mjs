// services/archipelago/connection/socket/event/setReply.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired in response to server commands or SetReply
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onSetReply(ws, packet) {
    logger.debug('📥 SetReply packet received:', packet);
}
