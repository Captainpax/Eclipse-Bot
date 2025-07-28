// services/archipelago/messaging/type/countdown.mjs

import {EmbedBuilder} from 'discord.js';

/**
 * Handles countdown messages before a game starts.
 * @param {[string, number, MessageNode[]]} args
 * @param {WebSocket} socket
 * @param {Object} discordBot
 */
export default function handleCountdown([text, value, nodes], socket, discordBot) {
    const embed = new EmbedBuilder()
        .setTitle('⏳ Countdown')
        .setDescription(`${text} (${value})`)
        .setColor(0xffcc00);

    discordBot.sendEmbed('log', embed);
}
