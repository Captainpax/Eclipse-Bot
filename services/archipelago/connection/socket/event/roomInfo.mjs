// services/archipelago/connection/socket/event/roomInfo.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired once after Connect, provides seed info and players.
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onRoomInfo(ws, packet) {
    logger.info('🧠 Room Info received.');
    logger.debug('🌍 Room name:', packet.seed_name);
    logger.debug('🧑‍🤝‍🧑 Team members:', packet.players);
    logger.debug('🎯 Permissions:', packet.permissions);
    logger.debug('🏷️ Tags:', packet.tags);
}
