// archipelago/archipelagoMessaging.mjs

import { EmbedBuilder } from 'discord.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open SQLite database once per session
const dbPromise = open({
    filename: './discordUsers.db',
    driver: sqlite3.Database
});

// === De-duplication tracking ===
let lastMessageHash = null;

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

/**
 * Gets all linked Discord IDs based on names appearing in the text.
 * @param {string} text
 * @returns {Promise<string[]>} Array of user IDs
 */
async function getUserMentions(text) {
    try {
        const db = await dbPromise;
        const names = extractNames(text);
        if (!names.length) return [];

        const all = await db.all(
            `SELECT DISTINCT discord_id FROM user_links WHERE slot_name IN (${names.map(() => '?').join(',')})`,
            names
        );
        return all.map(r => r.discord_id);
    } catch (err) {
        console.error('[getUserMentions] Failed to lookup Discord IDs:', err);
        return [];
    }
}

/**
 * Extracts possible slot names from text using heuristics.
 * @param {string} text
 * @returns {string[]}
 */
function extractNames(text) {
    const nameRegex = /([A-Z][a-z]+(?: [A-Z][a-z]+)*)(?: \(Team #[0-9]+\))?/g;
    const found = new Set();
    let match;
    while ((match = nameRegex.exec(text)) !== null) {
        found.add(match[1]);
    }
    return [...found];
}

/**
 * Parses and routes Archipelago messages to the appropriate Discord channels.
 * @param {object} packet - The message packet from the Archipelago server.
 * @param {any} client - The connected Archipelago client.
 * @param {any} discordBot - The connected Discord bot instance.
 */
export async function handlePacket(packet, client, discordBot) {
    if (!packet) return;

    // ======== Handle Print packets (plain text) ========
    if (packet.cmd === 'Print') {
        const text = packet.text ?? '';
        const lower = text.toLowerCase();
        if (!text || text.includes('Now that you are connected, you can use !help')) return;

        const hash = simpleHash(text);
        if (hash === lastMessageHash) return;
        lastMessageHash = hash;

        const userIds = await getUserMentions(text);
        const pingLine = userIds.map(id => `<@${id}>`).join(' ');

        const embed = new EmbedBuilder()
            .setDescription(text)
            .setColor(0xeeeeee);

        if (text.includes('has joined the game')) {
            embed.setTitle('🟢 Join Event');
            if (pingLine) embed.addFields({ name: 'User', value: pingLine, inline: false });
            discordBot.sendEmbed('chat', embed);
            discordBot.sendEmbed('log', embed);
            return;
        }

        if (text.includes('has left the game')) {
            embed.setTitle('🔴 Leave Event');
            if (pingLine) embed.addFields({ name: 'User', value: pingLine, inline: false });
            discordBot.sendEmbed('chat', embed);
            discordBot.sendEmbed('log', embed);
            return;
        }

        if (
            lower.includes('trade') ||
            (lower.includes(' sent ') && lower.includes(' to ')) ||
            (lower.includes(' received ') && lower.includes(' from '))
        ) {
            embed.setTitle('🔄 Trade Event');
            if (pingLine) embed.addFields({ name: 'Players', value: pingLine, inline: false });
            discordBot.sendEmbed('trade', embed);
            return;
        }

        if (
            lower.startsWith('hint') ||
            lower.startsWith('hints') ||
            lower.includes('hint points') ||
            lower.includes('each hint') ||
            lower.startsWith('no hints')
        ) {
            embed.setTitle('💡 Hint Message');
            if (pingLine) embed.addFields({ name: 'Players', value: pingLine, inline: false });
            discordBot.sendEmbed('hint', embed);
            return;
        }

        if (
            lower.includes(' found ') ||
            lower.startsWith('received ') ||
            lower.startsWith('you got')
        ) {
            embed.setTitle('✅ Item Received');
            if (pingLine) embed.addFields({ name: 'Mentioned', value: pingLine, inline: false });
            discordBot.sendEmbed('log', embed);
            return;
        }

        embed.setTitle('💬 Archipelago Message');
        if (pingLine) embed.addFields({ name: 'Mentioned', value: pingLine, inline: false });
        discordBot.sendEmbed('chat', embed);
    }

    // ======== Handle PrintJSON packets ========
    if (packet.cmd === 'PrintJSON' && Array.isArray(packet.data)) {
        const combined = packet.data.map(entry => entry.text).filter(Boolean).join('\n');
        if (!combined || combined.includes('Now that you are connected, you can use !help')) return;

        const hash = simpleHash(combined);
        if (hash === lastMessageHash) return;
        lastMessageHash = hash;

        const userIds = await getUserMentions(combined);
        const pingLine = userIds.map(id => `<@${id}>`).join(' ');

        const embed = new EmbedBuilder()
            .setTitle('💬 Message')
            .setDescription(combined)
            .setColor(0xaaaaaa);

        if (pingLine) embed.addFields({ name: 'Mentioned', value: pingLine, inline: false });

        discordBot.sendEmbed('chat', embed);
    }
}
