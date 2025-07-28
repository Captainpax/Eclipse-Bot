// services/archipelago/messaging/type/itemSent.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles when a regular (non-cheated) item is sent between players.
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleItemSent([text, item, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🎁 Item Sent')
        .setDescription(text)
        .addFields([
            {name: 'Item', value: item.item_name, inline: true},
            {name: 'From', value: item.sending_player.toString(), inline: true},
            {name: 'To', value: item.receiving_player.toString(), inline: true}
        ])
        .setColor(0x3399ff);

    discordBot.sendEmbed('trade', embed);
}
