// services/archipelago/messaging/type/connected.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles a player joining the game.
 * @param {[string, Object, string[], MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleConnected([text, player, tags, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🟢 Player Connected')
        .setDescription(`${player.name} joined with tags: ${tags.join(', ')}`)
        .setColor(0x32cd32);

    discordBot.sendEmbed('chat', embed);
    discordBot.sendEmbed('log', embed);
}
