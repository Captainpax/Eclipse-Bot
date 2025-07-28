// discord/discord.mjs

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
 * DiscordBot wraps the Discord.js client to support slash commands and bridging.
 */
class DiscordBot {
  /**
   * @param {{
   *   chatChannelId: string,
   *   tradeChannelId: string,
   *   hintChannelId: string,
   *   logChannelId: string
   * }} channelIds
   */
  constructor(channelIds) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.channelIds = channelIds;
    this.messenger = null;
    this.apBot = null;

    registerDiscordEvents(this.client);
  }

  /**
   * Starts the Discord bot and registers slash commands.
   * @param {string} token - Discord bot token
   */
  async start(token) {
    if (!token) throw new Error('Discord token is required to start the bot');

    await this.client.login(token);

    // Wait until client is ready before proceeding
    await new Promise(resolve => {
      if (this.client.isReady()) return resolve();
      this.client.once('ready', resolve);
    });

    await this.registerSlashCommands(token);

    // Setup message handler
    this.messenger = new DiscordMessenger(this.client, this.channelIds);
    this.messenger.registerInboundHandler((text) => {
      if (this.apBot) this.apBot.sendChat?.(text);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      try {
        await handleInteraction(interaction);
      } catch (err) {
        logger.error('[DiscordBot] Error handling interaction:', err);
      }
    });
  }

  /**
   * Registers slash commands for all guilds.
   * @param {string} token - Discord token
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
      logger.error('[DiscordBot] Slash command registration failed:', err);
    }
  }

  /**
   * Sets the Archipelago bot reference.
   * @param {object} apBot
   */
  setArchipelagoBot(apBot) {
    this.apBot = apBot;
  }

  /**
   * Sends a message to the chat channel.
   * @param {string} text
   */
  async sendToChatChannel(text) {
    return this.messenger?.sendChat(text);
  }

  /**
   * Sends a message to the trade channel.
   * @param {string} text
   */
  async sendToTradeChannel(text) {
    return this.messenger?.sendTrade(text);
  }

  /**
   * Sends a message to the hint channel.
   * @param {string} text
   */
  async sendToHintChannel(text) {
    return this.messenger?.sendHint(text);
  }

  /**
   * Sends a message to the log channel.
   * @param {string} text
   */
  async sendToLogChannel(text) {
    return this.messenger?.sendLog(text);
  }

  /**
   * Sends an embed to a named channel type (chat, trade, hint, log).
   * @param {"chat"|"trade"|"hint"|"log"} type
   * @param {import('discord.js').EmbedBuilder} embed
   * @param {string[]} [userIds=[]] - Optional user IDs to ping
   */
  async sendEmbed(type, embed, userIds = []) {
    return this.messenger?.sendEmbed(type, embed, userIds);
  }

  /**
   * Resolves Discord user IDs from message text by name.
   * @param {string} message
   * @returns {string[]} user ID list to ping
   */
  getUserIdsFromNames(message) {
    const userMap = {
      'CaptainPax': '123456789012345678',
      'Pax Spire': '234567890123456789',
      'Pax Poke': '345678901234567890',
      // Add more mappings
    };

    return Object.entries(userMap)
        .filter(([name]) => message.includes(name))
        .map(([, id]) => id);
  }
}

export default DiscordBot;
