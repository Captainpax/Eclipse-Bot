// services/discord/messaging/messageHandler.mjs

import {channelMap} from '../utilities.mjs';

import * as inboundChat from './incoming/discord/chat.mjs';
import * as inboundHint from './incoming/discord/hint.mjs';
import * as inboundLogs from './incoming/discord/logs.js';
import * as inboundTrade from './incoming/discord/trade.mjs';

import logger from '../../../system/log/logHandler.mjs';

/**
 * Dispatch table mapping channel keys to their handlers
 */
const discordInboundHandlers = {
    chat: inboundChat.handle,
    hint: inboundHint.handle,
    log: inboundLogs.handle,
    trade: inboundTrade.handle,
};

/**
 * Routes incoming Discord messages from specific channels to their corresponding handlers.
 * @param {import('discord.js').Message} message - The raw Discord message object
 * @param {Object} env - The bot’s environment configuration
 */
export async function handleIncomingDiscordMessage(message, env) {
    try {
        if (message.author.bot) return; // Ignore bots

        const {channelId} = message;
        const channelKey = Object.entries(channelMap).find(([, id]) => id === channelId)?.[0];

        if (!channelKey) {
            logger.warn(`📭 Unhandled message from unknown channel ID: ${channelId}`);
            return;
        }

        const handler = discordInboundHandlers[channelKey];

        if (!handler) {
            logger.warn(`⚠️ No handler registered for channel type: ${channelKey}`);
            return;
        }

        await handler(message, env);
    } catch (err) {
        logger.error('💥 Discord message handler failed:', err);
    }
}
