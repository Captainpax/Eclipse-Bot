// services/archipelago/messaging/type/adminCommand.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles !admin command response messages.
 * @param {[string, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleAdminCommand([text, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🛠️ Admin Command')
        .setDescription(text)
        .setColor(0xff5555);

    discordBot.sendEmbed('log', embed);
}
