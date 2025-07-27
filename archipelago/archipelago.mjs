// archipelago/archipelago.mjs

import { Client } from 'archipelago.js';
import logger from '../logger.mjs';
import { handlePacket } from './archipelagoMessaging.mjs';

/**
 * ArchipelagoBot handles connection and communication with an Archipelago server.
 */
class ArchipelagoBot {
    constructor() {
        /** @type {import('archipelago.js').Client | null} */
        this.client = null;
        this.connected = false;
        this.discordBot = null;
    }

    /**
     * Connects to Archipelago server.
     * @param {string} server - WebSocket URL of the Archipelago server.
     * @param {string} slotName - Slot name for this bot.
     * @param {string} [password] - Optional password.
     */
    async connect(server, slotName, password) {
        if (!server || !slotName) throw new Error('Both server and slotName are required.');

        this.client = new Client();
        try {
            logger.info(`Attempting to connect to Archipelago at ${server} as slot "${slotName}"`);
            await this.client.login(server, slotName, password, {
                items_handling: 0,
                tags: ['APBot'],
                version: {
                    major: 0,
                    minor: 6,
                    build: 2
                },
                name: 'EclipseBot',
                game: 'Archipelago'
            });
            logger.success(`Connected to Archipelago server at ${server} as ${slotName}`);
        } catch (err) {
            logger.error(`Failed to connect to Archipelago: ${err?.message || err}`);
            logger.debug(err?.stack || 'No stack trace available');
            throw err;
        }

        this.client.addListener('packet', (packet) => {
            if (packet?.cmd === 'RoomInfo') {
                logger.debug('[Archipelago] Received RoomInfo – marking as connected');
                this.connected = true;
            }
            try {
                handlePacket(packet, this.client, this.discordBot);
            } catch (err) {
                logger.error('[Archipelago] Failed to handle packet:', err);
            }
        });
    }

    /**
     * Waits for the client to become fully connected.
     * @param {number} timeoutMs
     * @returns {Promise<boolean>}
     */
    async waitUntilConnected(timeoutMs = 5000) {
        const start = Date.now();
        while (!this.isConnected() && Date.now() - start < timeoutMs) {
            logger.debug('[Archipelago] Waiting for RoomInfo...');
            await new Promise((res) => setTimeout(res, 200));
        }
        logger.debug(`[Archipelago] waitUntilConnected result: ${this.isConnected()}`);
        return this.isConnected();
    }

    /**
     * Returns connection status.
     * @returns {boolean}
     */
    isConnected() {
        return (
            this.connected === true &&
            this.client &&
            this.client.socket &&
            this.client.socket.readyState === 1
        );
    }

    /**
     * Sends a chat message to the server.
     * @param {string} message
     */
    async sendChat(message) {
        if (!this.isConnected()) throw new Error('Cannot send chat: not connected to Archipelago');
        try {
            await this.client.messages.say(message);
        } catch (err) {
            logger.error('Failed to send chat to Archipelago:', err);
        }
    }

    /**
     * Injects a reference to the DiscordBot after startup.
     * @param {object} discordBot
     */
    setDiscordBot(discordBot) {
        this.discordBot = discordBot;
    }
}

export default ArchipelagoBot;
