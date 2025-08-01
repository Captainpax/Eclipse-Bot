import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import logger from '../../../system/log/logHandler.mjs';

/**
 * Sends the welcome message in the waiting room channel.
 * @param {import('discord.js').Client} client - The Discord bot client.
 * @param {Object} config - The guild config object containing waitingRoomChannelId, etc.
 * @returns {Promise<boolean>} - Whether the message was sent successfully.
 */
export async function sendWelcomeMessage(client, config) {
    if (!client || !config) {
        logger.error('❌ sendWelcomeMessage called without client or config');
        return false;
    }

    const waitingRoomId = config.channels?.waitingRoom?.[0] || config.waitingRoomChannelId;
    if (!waitingRoomId) {
        logger.error('❌ Waiting room channel ID missing from config.');
        return false;
    }

    const channel = await client.channels.fetch(waitingRoomId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        logger.error(`❌ Failed to fetch waiting room channel (${waitingRoomId}) or it is not text-based.`);
        return false;
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📢 Welcome to the Eclipse Game Lobby')
        .setDescription('Get ready to join the next game! Use the buttons below to sign up or view game info.')
        .setFooter({text: 'Eclipse-Bot Waiting Room'})
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('signup_me')
            .setLabel('🎮 I’m In!')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('show_info')
            .setLabel('📘 Game Info')
            .setStyle(ButtonStyle.Secondary)
    );

    try {
        await channel.send({embeds: [embed], components: [row]});
        logger.success(`✅ Sent welcome message to waiting room: ${waitingRoomId}`);
        return true;
    } catch (err) {
        logger.error(`❌ Failed to send welcome message: ${err.message}`);
        return false;
    }
}
