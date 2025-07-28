// services/archipelago/connection/socket/event/connected.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired when the Archipelago connection is established.
 * @param {import('@archipelago-multi/client').ArchipelagoSocket} socket
 */
export default function onConnected(socket) {
    logger.success('✅ Connected to Archipelago server!');
}
