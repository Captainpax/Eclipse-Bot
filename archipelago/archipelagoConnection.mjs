// archipelago/archipelagoConnection.mjs

import { Client } from 'archipelago.js';
import logger from '../logger.mjs';

/**
 * Initializes and connects to Archipelago and sets up packet listener.
 * @param {string} server - Server URL (ws://...)
 * @param {string} slotName - Player slot name
 * @param {string} [password] - Optional password
 * @param {(packet: any) => void} onPacket - Callback for packets
 * @returns {Promise<{ client: Client, emitter: any, connected: boolean }>}
 */
export async function initArchipelagoConnectionAndListen(server, slotName, password, onPacket) {
    logger.info(`🔌 Connecting to Archipelago at ${server} as "${slotName}"`);

    const client = new Client();
    let connected = false;

    await client.login(server, slotName, password, {
        tags: ['APBot', 'TextOnly'],
        version: { major: 0, minor: 6, build: 2 },
    });

    const emitter = client.events ?? client.network ?? client.connection ?? client.messages;

    if (!emitter || typeof emitter.on !== 'function') {
        throw new Error('❌ No usable event emitter found on Archipelago client');
    }

    emitter.on('PacketReceived', (packet) => {
        if (packet?.cmd === 'RoomInfo') {
            connected = true;
            logger.debug('[Archipelago] ✅ RoomInfo received — connection confirmed');
        }

        try {
            onPacket(packet);
        } catch (err) {
            logger.error('[Archipelago] Error in onPacket handler:', err);
        }
    });

    return { client, emitter, connected };
}
