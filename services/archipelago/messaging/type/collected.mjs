// services/archipelago/messaging/type/collected.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles item collection message (remaining items pulled).
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleCollected([text, player, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('📦 Items Collected')
        .setDescription(`${player.name}: ${text}`)
        .setColor(0x87cefa);

    discordBot.sendEmbed('log', embed);
}
