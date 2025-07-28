// services/archipelago/messaging/type/tagsUpdated.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles when a player's tags are updated.
 * @param {[string, Object, string[], MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleTagsUpdated([text, player, tags, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('🏷️ Tags Updated')
        .setDescription(`${player.name}: ${text}`)
        .addFields([{name: 'New Tags', value: tags.join(', ') || 'None'}])
        .setColor(0xaaaaff);

    discordBot.sendEmbed('log', embed);
}
