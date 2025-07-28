// services/archipelago/connection/socket/event/locationInfo.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Sent when requesting location info or on location changes.
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onLocationInfo(ws, packet) {
    logger.info('📍 Location info received.');
    logger.debug('📌 Locations:', packet.locations);
}
