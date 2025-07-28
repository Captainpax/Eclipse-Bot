// services/archipelago/messaging/type/goaled.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles when a player reaches their goal.
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleGoaled([text, player, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🏁 Goal Reached!')
        .setDescription(`${player.name}: ${text}`)
        .setColor(0x00ff99);

    discordBot.sendEmbed('chat', embed);
    discordBot.sendEmbed('log', embed);
}
