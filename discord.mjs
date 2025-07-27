/*
 * discord.mjs
 *
 * This module encapsulates all Discord‑specific logic for the Eclipse bot. It
 * creates a Discord.js client with the minimal gateway intents required to
 * read messages and send responses. The exported `DiscordBot` class exposes
 * methods to start the client, send messages to channels and register
 * message handlers. Events and errors are logged using the shared logger.
 *
 * See the Discord.js v14 documentation for more information on intents and
 * client usage【220320899685149†screenshot】. Version 14 requires Node 22.12.0 or newer and is
 * installed via `npm install discord.js`【219984748675360†screenshot】.
 */

import { Client, GatewayIntentBits } from 'discord.js';
import logger from './logger.mjs';

/**
 * DiscordBot wraps the Discord.js Client and exposes convenience methods for
 * logging in, handling messages and sending messages to channels.
 */
class DiscordBot {
  constructor() {
    // Request only the intents needed: guilds, messages and message content
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  /**
   * Log in to Discord using the provided bot token.
   * @param {string} token Discord bot token from your environment.
   */
  async start(token) {
    if (!token) {
      throw new Error('Discord token is required to start the bot');
    }
    // Log success once the client is ready
    this.client.once('ready', () => {
      logger.success(`Discord client logged in as ${this.client.user.tag}`);
    });
    // Forward Discord.js errors to our logger
    this.client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });
    this.client.on('shardError', (error) => {
      logger.error('Discord shard error:', error);
    });
    await this.client.login(token);
  }

  /**
   * Register a handler for messageCreate events. The callback receives the
   * Discord.js `Message` object. The handler can be used to bridge to
   * Archipelago or perform other bot logic.
   * @param {(message: import('discord.js').Message) => void} callback
   */
  onMessage(callback) {
    this.client.on('messageCreate', callback);
  }

  /**
   * Send a message to a specific channel by its ID. Resolves when the
   * message has been sent. Throws if the channel cannot be fetched or
   * sending fails.
   * @param {string} channelId Discord channel ID.
   * @param {string} content Text content to send.
   */
  async sendMessage(channelId, content) {
    if (!channelId) throw new Error('channelId is required');
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} is not a text channel or could not be fetched`);
      }
      await channel.send({ content });
    } catch (err) {
      logger.error('Failed to send message to Discord:', err);
    }
  }
}

export default DiscordBot;