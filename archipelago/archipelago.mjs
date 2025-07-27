// archipelago/archipelago.mjs

import logger from '../logger.mjs';
import { handlePacket } from './archipelagoMessaging.mjs';
import { registerArchipelagoEvents } from './archipelagoUtilities.mjs';
import { initArchipelagoConnectionAndListen } from './archipelagoConnection.mjs';

/**
 * ArchipelagoBot handles connection and communication with an Archipelago server.
 */
class ArchipelagoBot {
    constructor() {
        /** @type {any} */
        this.client = null;

        /** @type {boolean} */
        this.connected = false;

        /** @type {any} */
        this.discordBot = null;
    }

    /**
     * Inject a reference to the DiscordBot after startup.
     * @param {any} discordBot
     */
    setDiscordBot(discordBot) {
        this.discordBot = discordBot;
    }

    /**
     * Connects to the Archipelago server using the helper connection module.
     * @param {string} server
     * @param {string} slotName
     * @param {string} [password]
     */
    async connect(server, slotName, password) {
        if (!server || !slotName) throw new Error('Both server and slotName are required.');

        try {
            const { client, emitter, connected } = await initArchipelagoConnectionAndListen(server, slotName, password, (packet) => {
                logger.debug('[Archipelago] PacketReceived:', JSON.stringify(packet));
                try {
                    handlePacket(packet, client, this.discordBot);
                } catch (err) {
                    logger.error('[Archipelago] Failed to handle packet:', err);
                }

                if (packet?.cmd === 'RoomInfo') {
                    this.connected = true;
                    logger.debug('[Archipelago] ✅ RoomInfo received — connection established');
                }
            });

            this.client = client;
            this.connected = connected;

            logger.success(`🛰️ Connected to Archipelago as "${slotName}"`);
            registerArchipelagoEvents(this);
        } catch (err) {
            logger.error(`❌ Failed to connect to Archipelago: ${err?.message || err}`);
            logger.debug(err?.stack || 'No stack trace available');
            throw err;
        }
    }

    /**
     * Returns true if the client is connected and has received RoomInfo.
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Waits for RoomInfo confirmation or times out.
     * @param {number} timeoutMs
     * @returns {Promise<boolean>}
     */
    async waitUntilConnected(timeoutMs = 5000) {
        if (this.connected) return true;

        logger.debug('[Archipelago] Waiting for RoomInfo...');

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.warn('[Archipelago] ❌ Timed out waiting for RoomInfo');
                resolve(false);
            }, timeoutMs);

            const onPacket = (packet) => {
                logger.debug('[Archipelago] waitUntilConnected saw packet:', JSON.stringify(packet));
                if (packet?.cmd === 'RoomInfo') {
                    this.connected = true;
                    clearTimeout(timeout);
                    logger.debug('[Archipelago] ✅ RoomInfo received — connection established');
                    this.client.__emitter.off('PacketReceived', onPacket);
                    resolve(true);
                }
            };

            this.client.__emitter.on('PacketReceived', onPacket);
        });
    }

    /**
     * Sends a chat message to the Archipelago server.
     * @param {string} message
     */
    async sendChat(message) {
        if (!this.isConnected()) {
            logger.warn('📡 Not connected – cannot send chat');
            return;
        }

        try {
            await this.client.send({ cmd: 'Say', text: message });
        } catch (err) {
            logger.error('[Archipelago] Failed to send chat:', err);
        }
    }
}

export default ArchipelagoBot;
