// waiting-room.mjs

import {isAdminOrMod} from '../../users/roleHandler.mjs';
import {createRemainingChannels} from './index.mjs';

// In-memory signup list
const signupQueue = {};

/**
 * Creates the waiting-room channel for signups.
 */
export async function createWaitingRoomChannel(client, config) {
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild) return false;

    try {
        const channel = await guild.channels.create({
            name: 'waiting-room',
            type: 0,
            parent: config.categoryId,
            permissionOverwrites: [
                {id: guild.roles.everyone.id, allow: ['SendMessages', 'ViewChannel']},
            ],
        });

        config.waitingRoomChannelId = channel.id;
        return true;
    } catch (err) {
        console.error('❌ Failed to create waiting-room channel:', err);
        return false;
    }
}

/**
 * Handles !me and !create_channels in waiting-room.
 */
export async function handleWaitingRoomMessage(message, config, client) {
    if (message.author.bot) return;

    const guildId = message.guild.id;
    const msg = message.content.toLowerCase();

    if (msg === '!me') {
        const isLinked = true; // TODO: replace with real check

        if (!isLinked) {
            return message.reply('❌ You must `/link` your player name first.');
        }

        signupQueue[guildId] ??= [];
        if (signupQueue[guildId].includes(message.author.id)) {
            return message.reply('⚠️ You’re already on the signup list!');
        }

        signupQueue[guildId].push(message.author.id);
        return message.reply('✅ You’ve been added to the signup queue!');
    }

    if (msg === '!create_channels') {
        const hasPerms = await isAdminOrMod(message.member, config);
        if (!hasPerms) {
            return message.reply('❌ You need to be an admin or mod to use this command.');
        }

        await createRemainingChannels(client, config);
        return message.reply('✅ Game channels created successfully.');
    }
}
