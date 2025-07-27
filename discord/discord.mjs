/*
 * discord/discord.mjs
 *
 * Central DiscordBot manager that orchestrates command and message handling via modular components.
 * Uses Discord.js v14+ with separated command and messaging logic for maintainability.
 */

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events
} from 'discord.js';
import logger from '../logger.mjs';
import { registerDiscordEvents } from './discordUtilities.mjs';
import { getSlashCommands, handleInteraction } from './discordCommands.mjs';
import DiscordMessenger from './discordMessaging.mjs';

/**
 * DiscordBot wraps the Discord.js client to support slash commands and chat bridging.
 */
class DiscordBot {
  constructor() {
    /** @type {import('discord.js').Client} */
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.messenger = null;

    registerDiscordEvents(this.client);
  }

  /**
   * Starts the Discord bot client and sets up commands and interactions.
   * @param {string} token - Bot token
   * @param {string} channelId - Target channel ID for message relaying
   */
  async start(token, channelId) {
    if (!token) throw new Error('Discord token is required to start the bot');

    await this.client.login(token);
    await this.registerSlashCommands(token);

    this.messenger = new DiscordMessenger(this.client, channelId);

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await handleInteraction(interaction);
      }
    });
  }

  /**
   * Registers slash commands across all guilds the bot is in.
   * @param {string} token - Bot token for REST auth
   */
  async registerSlashCommands(token) {
    const commands = getSlashCommands();
    const rest = new REST({ version: '10' }).setToken(token);
    const applicationId = this.client.user.id;
    const guilds = this.client.guilds.cache.map(g => g.id);

    try {
      for (const guildId of guilds) {
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: commands.map(cmd => cmd.data.toJSON()) }
        );
        logger.debug(`Registered slash commands for guild ${guildId}`);
      }
    } catch (err) {
      logger.error('[DiscordBot.registerSlashCommands] Failed to register slash commands:', err);
    }
  }

  /**
   * Sends a message to the configured outbound channel via DiscordMessenger.
   * @param {string} text - Message to send
   */
  async sendMessage(text) {
    if (!this.messenger) {
      throw new Error('DiscordMessenger is not initialized');
    }
    await this.messenger.sendOutbound(text);
  }

  /**
   * Registers an inbound message handler for relaying messages (e.g., to Archipelago).
   * @param {(text: string) => void} callback
   */
  onMessage(callback) {
    if (!this.messenger) {
      throw new Error('DiscordMessenger is not initialized');
    }
    this.messenger.registerInboundHandler(callback);
  }
}

export default DiscordBot;
