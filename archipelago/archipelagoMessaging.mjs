// archipelago/archipelagoMessaging.mjs

import logger from '../logger.mjs';

/**
 * Handles incoming packets from the Archipelago server and routes them to appropriate Discord channels.
 * @param {object} packet - The raw packet received from the server.
 * @param {import('archipelago.js').Client} client - The connected Archipelago client.
 * @param {object} discordBot - The initialized DiscordBot instance with channel sending methods.
 */
function handlePacket(packet, client, discordBot) {
    if (!packet || typeof packet.cmd !== 'string') return;

    const { cmd } = packet;

    switch (cmd) {
        case 'Print': {
            const text = packet.text?.trim();
            if (!text) return;

            const lower = text.toLowerCase();

            if (text.includes('has joined the game')) {
                discordBot?.sendToLogChannel(`➕ ${text}`);
            } else if (text.includes('has left the game')) {
                discordBot?.sendToLogChannel(`➖ ${text}`);
            } else if (lower.includes('trade')) {
                discordBot?.sendToTradeChannel(`🔄 ${text}`);
            } else if (
                lower.startsWith('hint') || lower.startsWith('hints') ||
                lower.includes('hint points') || lower.includes('each hint') ||
                lower.startsWith('no hints')
            ) {
                discordBot?.sendToHintChannel(`💡 ${text}`);
            } else if (
                lower.includes(' found ') || lower.includes(' sent ') ||
                lower.includes(' received ') || lower.startsWith('received ') ||
                lower.startsWith('you got')
            ) {
                discordBot?.sendToLogChannel(`✅ ${text}`);
            } else {
                discordBot?.sendToChatChannel(`💬 ${text}`);
            }
            break;
        }

        case 'RoomInfo': {
            const players = packet.players || [];
            players.forEach(player => {
                discordBot?.sendToLogChannel(`🟢 Player joined: ${player.name}`);
            });
            break;
        }

        default:
            logger.debug(`[Archipelago] Unhandled packet type: ${cmd}`);
            break;
    }
}

export { handlePacket };
