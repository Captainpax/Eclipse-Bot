// services/discord/messaging/outgoing/archipelago/hint.mjs

import {getSocket} from '../../../../archipelago/connection/initConnection.mjs';

/**
 * Sends a !hint command to Archipelago from Discord.
 * @param {string} text
 */
export async function sendHintToArchipelago(text) {
    const socket = getSocket();
    if (!socket || socket.readyState !== 1) return;

    socket.send(JSON.stringify({
        cmd: 'Say',
        text: `!hint ${text}`,
    }));
}
