// services/archipelago/connection/socket/event/roomUpdate.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired when the room changes (new players, slot updates, etc.)
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onRoomUpdate(ws, packet) {
    logger.info('📡 Room update received.');
    logger.debug('🧑‍🤝‍🧑 Players:', packet.players);
    if (packet.tags) logger.debug('🏷️ Tags updated:', packet.tags);
    if (packet.permissions) logger.debug('🔐 Permissions updated:', packet.permissions);
}
