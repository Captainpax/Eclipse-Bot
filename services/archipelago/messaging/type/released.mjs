// services/archipelago/messaging/type/released.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles when a player releases their remaining items to the multiworld.
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleReleased([text, player, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('📦 Items Released')
        .setDescription(`${player.name}: ${text}`)
        .setColor(0xffcc00);

    discordBot.sendEmbed('log', embed);
}
