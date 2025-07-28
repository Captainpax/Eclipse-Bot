// services/archipelago/messaging/type/serverChat.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles global server chat messages.
 * @param {[string, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleServerChat([message, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🌐 Server Chat')
        .setDescription(message)
        .setColor(0xcccccc);

    discordBot.sendEmbed('chat', embed);
}
