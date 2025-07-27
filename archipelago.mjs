// archipelago.mjs

/**
 * Handles all communication with an Archipelago multiworld server
 * using the archipelago.js library.
 */

import { Client } from 'archipelago.js';
import logger from './logger.mjs';

class ArchipelagoBot {
  constructor() {
    /** @type {import('archipelago.js').Client | null} */
    this.client = null;
    /** @type {boolean} */
    this.connected = false;
  }

  /**
   * Connects to the Archipelago server using the specified parameters.
   *
   * @param {string} server - The Archipelago server address (e.g., "host:port").
   * @param {string} slotName - The slot name assigned to this client.
   * @param {string} [password] - Optional password for the slot.
   * @returns {Promise<void>} Resolves once connected.
   */
  async connect(server, slotName, password) {
    if (!server || !slotName) {
      throw new Error('Both server and slotName are required to connect to Archipelago');
    }

    this.client = new Client();

    try {
      logger.info(`Attempting to connect to Archipelago at ${server} as slot "${slotName}"`);
      await this.client.login(server, slotName, password);
      this.connected = true;
      logger.success(`Connected to Archipelago server at ${server} as ${slotName}`);
    } catch (err) {
      if (err?.errors?.length) {
        logger.error(`Login failed due to: ${err.errors.join(', ')}`);
      }
      logger.error(`Failed to connect to Archipelago: ${err?.message || err}`);
      if (process.env.DEBUG?.toLowerCase() === 'true' || process.env.DEBUG === '1') {
        logger.debug(err?.stack || 'No stack trace available');
      }
      throw err;
    }

    // 🛠️ Event listeners must be registered after successful login
    const events = this.client?.events || this.client?.network || this.client;
    if (!events?.on) {
      logger.error('Unable to bind event handlers: Client has no event emitter');
      return;
    }

    events.on('SocketClosed', ({ code, reason }) => {
      this.connected = false;
      logger.warn(`Disconnected from Archipelago (code ${code}): ${reason || 'no reason provided'}`);
    });

    events.on('Error', (err) => {
      logger.error('Archipelago client error:', err);
    });

    events.on('ConnectionRefused', (errors) => {
      if (Array.isArray(errors)) {
        logger.error(`Connection refused by server: ${errors.join(', ')}`);
      } else if (errors?.errors) {
        logger.error(`Connection refused by server: ${errors.errors.join(', ')}`);
      } else {
        logger.error('Connection refused by server for unknown reasons');
      }
    });
  }

  /**
   * Registers a callback to handle incoming chat messages from Archipelago.
   *
   * @param {(message: string) => void} callback - Handler to call with each message.
   */
  onMessage(callback) {
    if (!this.client?.messages) {
      logger.warn('Archipelago client is not ready to receive messages');
      return;
    }

    this.client.messages.on('message', (packet) => {
      if (packet?.text) callback(packet.text);
    });
  }

  /**
   * Sends a chat message to the Archipelago server.
   *
   * @param {string} message - The chat message to send.
   * @returns {Promise<void>} Resolves after message is sent.
   */
  async sendChat(message) {
    if (!this.connected || !this.client) {
      throw new Error('Cannot send chat: not connected to Archipelago');
    }

    try {
      await this.client.messages.say(message);
    } catch (err) {
      logger.error('Failed to send chat to Archipelago:', err);
    }
  }
}

export default ArchipelagoBot;
