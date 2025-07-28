// services/archipelago/connection/socket/event/connectionRefused.mjs

import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Fired when the Archipelago server refuses the connection.
 * Typically due to a bad password, duplicate name, or protocol mismatch.
 * @param {import('@archipelago-multi/client').ArchipelagoSocket} socket
 * @param {object} payload - server response
 */
export default function onConnectionRefused(socket, payload) {
    logger.error('🚫 Connection refused by Archipelago server.');
    logger.debug('🔎 Refusal payload:', payload);

    const reason = payload?.errors?.[0] || 'Unknown reason';
    logger.error(`❌ Reason: ${reason}`);
}
