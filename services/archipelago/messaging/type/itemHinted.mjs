// services/archipelago/messaging/type/itemHinted.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles hint-style messages about items.
 * @param {[string, Object, boolean, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleItemHinted([text, item, found, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle(found ? '🔍 Item Found (Hint)' : '💡 Item Hint')
        .setDescription(text)
        .addFields([
            {name: 'Item', value: item.item_name, inline: true},
            {name: 'Receiving Player', value: item.receiving_player.toString(), inline: true},
            {name: 'From', value: item.sending_player.toString(), inline: true}
        ])
        .setColor(found ? 0x00ffcc : 0xcccc00);

    discordBot.sendEmbed('hint', embed);
    discordBot.sendEmbed('log', embed);
}
