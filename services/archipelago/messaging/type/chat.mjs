// services/archipelago/messaging/type/chat.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles player chat messages from Archipelago.
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleChat([message, player, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle(`💬 ${player.name}`)
        .setDescription(message)
        .setColor(0x00bfff);

    discordBot.sendEmbed('chat', embed);
}
