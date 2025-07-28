// services/archipelago/messaging/type/disconnected.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles when a player disconnects from the game.
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleDisconnected([text, player, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🔴 Player Disconnected')
        .setDescription(`${player.name}: ${text}`)
        .setColor(0xdc143c);

    discordBot.sendEmbed('chat', embed);
    discordBot.sendEmbed('log', embed);
}
