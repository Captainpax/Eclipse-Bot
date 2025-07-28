// services/archipelago/messaging/messageHandler.mjs

import { EmbedBuilder } from 'discord.js';
import logger from '../../../system/log/logHandler.mjs';
import {isDuplicateMessage, getUserMentionsFromText} from '../utilities.mjs';

/**
 * Handles Archipelago PrintJSON messages and sends Discord embeds
 */
export async function handlePrintJSONMessage(entries, discordBot) {
    if (!Array.isArray(entries)) return;

    const text = entries.map(e => e.text).filter(Boolean).join(' ').trim();
    if (!text || isDuplicateMessage(text)) return;

    logger.debug('📨 AP Message:', text);

    const mentions = await getUserMentionsFromText(text);
    const pingLine = mentions.join(' ');

    const embed = new EmbedBuilder()
        .setColor(0xeeeeee)
        .setDescription(text);

    const fields = pingLine ? [{name: 'Mentioned', value: pingLine}] : [];

    // Smart categorization of event types
    if (text.includes('has joined the game')) {
        embed.setTitle('🟢 Join Event').addFields(...fields);
        discordBot.sendEmbed('chat', embed);
        discordBot.sendEmbed('log', embed);
    } else if (text.includes('has left the game')) {
        embed.setTitle('🔴 Leave Event').addFields(...fields);
        discordBot.sendEmbed('chat', embed);
        discordBot.sendEmbed('log', embed);
    } else if (
        text.includes('trade') ||
        (text.includes(' sent ') && text.includes(' to ')) ||
        (text.includes(' received ') && text.includes(' from '))
    ) {
        embed.setTitle('🔄 Trade Event').addFields(...fields);
        discordBot.sendEmbed('trade', embed);
    } else if (
        text.toLowerCase().includes('hint') ||
        text.includes('Hint Points') ||
        text.includes('used a hint')
    ) {
        embed.setTitle('💡 Hint Message').addFields(...fields);
        discordBot.sendEmbed('hint', embed);
    } else if (
        text.includes(' received ') ||
        text.includes(' found ') ||
        text.startsWith('You got')
    ) {
        embed.setTitle('🎁 Item Received').addFields(...fields);
        discordBot.sendEmbed('log', embed);
    } else {
        embed.setTitle('💬 Archipelago Message').addFields(...fields);
        discordBot.sendEmbed('chat', embed);
    }
}
