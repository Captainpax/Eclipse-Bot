// services/discord/messaging/outgoing/archipelago/logs.js

import {getSocket} from '../../../../archipelago/connection/initConnection.mjs';

/**
 * Sends a log/debug message to Archipelago.
 * @param {string} logMsg
 */
export async function sendLogToArchipelago(logMsg) {
    const socket = getSocket();
    if (!socket || socket.readyState !== 1) return;

    socket.send(JSON.stringify({
        cmd: 'Say',
        text: `[Log] ${logMsg}`,
    }));
}
