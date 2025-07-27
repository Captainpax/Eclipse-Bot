// archipelago/archipelagoConnection.mjs

import { Client } from 'archipelago.js';
import logger from '../logger.mjs';

/**
 * Initializes and connects to Archipelago and sets up event listeners.
 * @param {string} server - Server URL (ws://...)
 * @param {string} slotName - Player slot name
 * @param {string} [password] - Optional password
 * @param {(packet: any) => void} onPacket - Callback for packets
 * @returns {Promise<{ client: Client, connected: boolean }>}
 */
export async function initArchipelagoConnectionAndListen(server, slotName, password, onPacket) {
    logger.info(`🔌 Connecting to Archipelago at ${server} as "${slotName}"`);

    const client = new Client();
    let connected = false;

    await client.login(server, slotName, password, {
        tags: ['APBot', 'TextOnly'],
        version: { major: 0, minor: 6, build: 2 },
    });

    // Listen for all known socket events
    client.socket.on('roomInfo', (packet) => {
        connected = true;
        logger.debug('[Archipelago] ✅ RoomInfo received — connection confirmed');
        onPacket(packet);
    });

    client.socket.on('printJSON', (packet) => {
        onPacket(packet);
    });

    client.socket.on('receivedPacket', (packet) => {
        onPacket(packet);
    });

    client.socket.on('connected', (packet) => {
        onPacket(packet);
    });

    client.socket.on('disconnected', () => {
        logger.warn('💀 Lost connection to Archipelago server');
        onPacket({ cmd: 'Disconnected' });
    });

    client.socket.on('connectionRefused', (packet) => {
        logger.warn('❌ Connection refused:', packet);
        onPacket(packet);
    });

    client.socket.on('bounced', (packet, data) => {
        onPacket(packet);
    });

    client.socket.on('dataPackage', (packet) => {
        onPacket(packet);
    });

    client.socket.on('locationInfo', (packet) => {
        onPacket(packet);
    });

    client.socket.on('receivedItems', (packet) => {
        onPacket(packet);
    });

    client.socket.on('retrieved', (packet) => {
        onPacket(packet);
    });

    client.socket.on('roomUpdate', (packet) => {
        onPacket(packet);
    });

    client.socket.on('setReply', (packet) => {
        onPacket(packet);
    });

    client.socket.on('invalidPacket', (packet) => {
        logger.warn('[Archipelago] ⚠️ Invalid packet received:', packet);
        onPacket(packet);
    });

    return { client, connected };
}
