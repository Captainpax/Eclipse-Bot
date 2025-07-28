// services/archipelago/connection/socket/event/disconnected.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired when disconnected from the Archipelago server.
 * @param {import('@archipelago-multi/client').ArchipelagoSocket} socket
 * @param {string} reason
 */
export default function onDisconnected(socket, reason = 'Unknown') {
    logger.warn(`🔌 Disconnected from Archipelago server: ${reason}`);
}
