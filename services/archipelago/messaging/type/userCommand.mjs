// services/archipelago/messaging/type/userCommand.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles messages from user-triggered commands like !status, !hint, etc.
 * @param {[string, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleUserCommand([text, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('⌨️ Command Output')
        .setDescription(text)
        .setColor(0xdddddd);

    discordBot.sendEmbed('chat', embed);
}
