// services/archipelago/messaging/type/tutorial.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles tutorial messages such as "use !help".
 * @param {[string, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleTutorial([text, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('📘 Tutorial')
        .setDescription(text)
        .setColor(0x66ccff);

    discordBot.sendEmbed('chat', embed);
}
