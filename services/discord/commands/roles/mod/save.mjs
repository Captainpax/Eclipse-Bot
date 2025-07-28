// services/discord/commands/roles/mod/save.mjs

import {getSocket} from '../../../../archipelago/connection/initConnection.mjs';

/**
 * Sends a Save command to the Archipelago server.
 * Usage: !save
 */
export default async function (message) {
    const socket = getSocket();

    if (!socket || socket.readyState !== 1) {
        return message.reply('⚠️ Archipelago connection is not open.');
    }

    socket.send(
        JSON.stringify({
            cmd: 'Say',
            text: '!save', // This is interpreted by the server as a save command
        })
    );

    await message.reply('💾 Save command sent to the server!');
}
