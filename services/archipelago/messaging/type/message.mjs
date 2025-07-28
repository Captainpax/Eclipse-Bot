// services/archipelago/messaging/type/message.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles plain message packets.
 * @param {[string, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleMessage([text, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('💬 Server Message')
        .setDescription(text)
        .setColor(0xeeeeee);

    discordBot.sendEmbed('chat', embed);
}
