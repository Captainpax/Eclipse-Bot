// services/archipelago/connection/socket/event/receivedItems.js

import logger from '../../../../../system/log/logHandler.mjs';
import {logReceivedItem} from '../../../../../system/database/databaseHandler.mjs';

/**
 * Handles received items — logs them in the DB
 * @param {WebSocket} ws
 * @param {object} packet
 */
export default function onReceivedItems(ws, packet) {
    if (!packet.items) {
        logger.warn('🎁 ReceivedItems packet missing "items" field.');
        return;
    }

    packet.items.forEach(item => {
        logger.info(`🎁 Received item: ${item.item} from slot ${item.flags?.from}`);
        logReceivedItem({
            slot_name: item.flags?.from_name || 'Unknown',
            team: item.team,
            item_name: item.item || item.item_name || 'Unnamed',
            sender: item.flags?.from || 'Unknown',
        });
    });
}
