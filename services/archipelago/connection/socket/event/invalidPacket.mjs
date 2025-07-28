// services/archipelago/connection/socket/event/invalidPacket.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired when the server sends a malformed or unknown packet type.
 * @param {import('@archipelago-multi/client').ArchipelagoSocket} socket
 * @param {object} packet - the invalid packet
 */
export default function onInvalidPacket(socket, packet) {
    logger.warn('⚠️ Received invalid or unrecognized packet from server.');
    logger.debug('❓ Packet contents:', packet);
}
