// services/discord/messaging/outgoing/archipelago/trade.mjs

import {getSocket} from '../../../../archipelago/connection/initConnection.mjs';

/**
 * Sends a trade-related message to Archipelago.
 * This could include sending items, asking for trades, etc.
 * @param {string} message
 */
export async function sendTradeToArchipelago(message) {
    const socket = getSocket();
    if (!socket || socket.readyState !== 1) return;

    socket.send(JSON.stringify({
        cmd: 'Say',
        text: `[Trade] ${message}`,
    }));
}
