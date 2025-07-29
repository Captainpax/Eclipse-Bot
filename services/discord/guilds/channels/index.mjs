// index.mjs

// ──────────────── Channel Creators ────────────────

/**
 * Creates the console channel for admin/mod command input.
 */
export async function createConsoleChannel(client, config) {
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild) return false;

    try {
        const channel = await guild.channels.create({
            name: 'console',
            type: 0,
            parent: config.categoryId,
            permissionOverwrites: [
                {id: guild.roles.everyone.id, deny: ['SendMessages']},
                {id: config.adminId, allow: ['SendMessages', 'ViewChannel']},
                {id: config.modRoleId, allow: ['SendMessages', 'ViewChannel']},
            ],
        });

        config.consoleChannelId = channel.id;
        return true;
    } catch (err) {
        console.error('❌ Failed to create console channel:', err);
        return false;
    }
}

/**
 * Creates the logs channel for system output.
 */
export async function createLogsChannel(client, config) {
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild) return false;

    try {
        const channel = await guild.channels.create({
            name: 'logs',
            type: 0,
            parent: config.categoryId,
            permissionOverwrites: [
                {id: guild.roles.everyone.id, deny: ['SendMessages']},
                {id: config.adminId, allow: ['ViewChannel']},
                {id: config.modRoleId, allow: ['ViewChannel']},
            ],
        });

        config.logsChannelId = channel.id;
        return true;
    } catch (err) {
        console.error('❌ Failed to create logs channel:', err);
        return false;
    }
}

/**
 * Creates the waiting-room channel for signups and !create_channels.
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
 * Creates the chat, hint, and trade channels.
 */
export async function createRemainingChannels(client, config) {
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild) return false;

    try {
        const createTextChannel = async (name, assignToField) => {
            const channel = await guild.channels.create({
                name,
                type: 0,
                parent: config.categoryId,
                permissionOverwrites: [
                    {id: guild.roles.everyone.id, allow: ['SendMessages', 'ViewChannel']},
                ],
            });

            config[assignToField] = channel.id;
        };

        await createTextChannel('chat', 'chatChannelId');
        await createTextChannel('hint', 'hintChannelId');
        await createTextChannel('trade', 'tradeChannelId');

        return true;
    } catch (err) {
        console.error('❌ Failed to create remaining game channels:', err);
        return false;
    }
}

// ──────────────── Message Handlers ────────────────

export {handleChatMessage} from './chat.mjs';
export {handleConsoleMessage} from './console.mjs';
export {handleHintMessage} from './hint.mjs';
export {handleLogsMessage} from './logs.mjs';
export {handleTradeMessage} from './trade.mjs';
export {handleWaitingRoomMessage} from './waiting-room.mjs';
