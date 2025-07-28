// services/discord/messaging/outgoing/archipelago/chat.mjs

import {getSocket} from '../../../../archipelago/connection/initConnection.mjs';

/**
 * Sends a chat message to the Archipelago server.
 * @param {string} message
 */
export async function sendChatToArchipelago(message) {
    const socket = getSocket();
    if (!socket || socket.readyState !== 1) return;

    socket.send(JSON.stringify({
        cmd: 'Say',
        text: message,
    }));
}
