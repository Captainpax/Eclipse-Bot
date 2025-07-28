// services/archipelago/connection/socket/event/dataPackage.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Contains name mappings for items, locations, slots, etc.
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onDataPackage(ws, packet) {
    logger.info('📦 Data package received.');
    logger.debug('📚 Games included:', Object.keys(packet.data || {}));
}
