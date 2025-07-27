// discord/discordMessaging.mjs

import logger from '../logger.mjs';

/**
 * Handles Discord message relaying between Discord and external services like Archipelago.
 * Allows separate channels for chat, trades, hints, and logs.
 */
class DiscordMessenger {
    /**
     * @param {import('discord.js').Client} client - The connected Discord client
     * @param {{
     *   chatChannelId: string,
     *   tradeChannelId: string,
     *   hintChannelId: string,
     *   logChannelId: string
     * }} channelMap
     */
    constructor(client, channelMap) {
        this.client = client;
        this.channelMap = channelMap;
        this.inboundHandler = null;
    }

    /**
     * Registers a listener for messages from the chat channel to send to Archipelago.
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

    /**
     * Sends a chat message to the chat channel.
     * @param {string} text
     */
    async sendChat(text) {
        return this.sendToChannel(this.channelMap.chatChannelId, text);
    }

    /**
     * Sends a trade message to the trade channel.
     * @param {string} text
     */
    async sendTrade(text) {
        return this.sendToChannel(this.channelMap.tradeChannelId, text);
    }

    /**
     * Sends a hint message to the hint channel.
     * @param {string} text
     */
    async sendHint(text) {
        return this.sendToChannel(this.channelMap.hintChannelId, text);
    }

    /**
     * Sends a log/status message to the log channel.
     * @param {string} text
     */
    async sendLog(text) {
        return this.sendToChannel(this.channelMap.logChannelId, text);
    }

    /**
     * Internal utility to send a message to a specific channel ID.
     * @param {string} channelId
     * @param {string} text
     */
    async sendToChannel(channelId, text) {
        if (!channelId) return;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                throw new Error(`Channel ${channelId} is not text-based or could not be fetched`);
            }
            await channel.send({ content: text });
        } catch (err) {
            logger.error(`[DiscordMessenger] Failed to send message to channel ${channelId}:`, err);
        }
    }
}

export default DiscordMessenger;
