// discord/discordMessaging.mjs

import { EmbedBuilder } from 'discord.js';
import logger from '../logger.mjs';

/**
 * Handles Discord message relaying and embed sending for Archipelago interactions.
 * Automatically routes chat, trade, hint, and log messages to their respective channels.
 */
class DiscordMessenger {
    /**
     * @param {import('discord.js').Client} client - The connected Discord.js client
     * @param {{
     *   chatChannelId: string,
     *   tradeChannelId: string,
     *   hintChannelId: string,
     *   logChannelId: string
     * }} channelMap - Channel IDs for routing messages
     */
    constructor(client, channelMap) {
        this.client = client;
        this.channelMap = channelMap;
        this.inboundHandler = null;

        /**
         * Optional external user mapping function to resolve usernames to Discord IDs.
         * @type {(text: string) => string[] | Promise<string[]>}
         */
        this.getUserIdsFromNames = null;
    }

    /**
     * Hook for outbound embed sending with optional user pings.
     *
     * @param {'chat'|'trade'|'hint'|'log'} channelKey
     * @param {EmbedBuilder} embed
     * @param {string[]} [userIdsToPing]
     */
    async sendEmbed(channelKey, embed, userIdsToPing = []) {
        const channelId = this.channelMap[`${channelKey}ChannelId`];
        if (!channelId) return;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                throw new Error(`Channel ${channelId} is not text-based`);
            }

            const content = userIdsToPing.length
                ? userIdsToPing.map(id => `<@${id}>`).join(' ')
                : undefined;

            await channel.send({ embeds: [embed], content });
        } catch (err) {
            logger.error(`[DiscordMessenger] Failed to send embed to ${channelKey} channel:`, err);
        }
    }

    /**
     * Registers an inbound chat message listener from Discord to Archipelago.
     * Only messages in the chat channel are handled.
     * @param {(text: string) => void} callback
     */
    registerInboundHandler(callback) {
        this.inboundHandler = callback;

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (message.channelId !== this.channelMap.chatChannelId) return;

            try {
                const content = `${message.author.username}: ${message.content}`;
                callback(content);
            } catch (err) {
                logger.error('[DiscordMessenger] Failed to process inbound message:', err);
            }
        });
    }

    // ===== Shortcut helpers for raw messages (if needed outside of embed) =====

    /** @param {string} text */
    async sendChat(text) {
        return this.sendRaw('chat', text);
    }

    /** @param {string} text */
    async sendTrade(text) {
        return this.sendRaw('trade', text);
    }

    /** @param {string} text */
    async sendHint(text) {
        return this.sendRaw('hint', text);
    }

    /** @param {string} text */
    async sendLog(text) {
        return this.sendRaw('log', text);
    }

    /**
     * Internal utility to send a plain text message to a named channel.
     * @param {'chat'|'trade'|'hint'|'log'} channelKey
     * @param {string} text
     */
    async sendRaw(channelKey, text) {
        const channelId = this.channelMap[`${channelKey}ChannelId`];
        if (!channelId) return;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                throw new Error(`Channel ${channelId} is not text-based`);
            }

            await channel.send({ content: text });
        } catch (err) {
            logger.error(`[DiscordMessenger] Failed to send message to ${channelKey} channel:`, err);
        }
    }
}

export default DiscordMessenger;
