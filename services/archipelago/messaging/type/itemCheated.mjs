// services/archipelago/messaging/type/itemCheated.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles when a cheated item is sent to a player.
 * @param {[string, Object, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleItemCheated([text, item, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🧪 Cheated Item Sent')
        .setDescription(`${item.receiving_player}: ${text}`)
        .addFields([
            {name: 'Item', value: item.item_name, inline: true},
            {name: 'From', value: item.sending_player.toString(), inline: true}
        ])
        .setColor(0xff69b4);

    discordBot.sendEmbed('log', embed);
}
