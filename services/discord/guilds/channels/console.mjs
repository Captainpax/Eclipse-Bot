// console.mjs

/**
 * Creates the console channel for bot/system command output.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} config
 * @returns {Promise<boolean>}
 */
export async function createConsoleChannel(client, config) {
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild) return false;

    try {
        const channel = await guild.channels.create({
            name: 'console',
            type: 0, // GUILD_TEXT
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
 * Handles messages in the console channel.
 * Allows basic bot command inputs from admins/mods.
 */
export async function handleConsoleMessage(message, config, client) {
    if (message.author.bot) return;

    const allowedRoles = [config.adminId, config.modRoleId];
    const isAllowed = message.member.roles.cache.some(r => allowedRoles.includes(r.id));

    if (!isAllowed) {
        await message.delete().catch(() => null);
        return message.author.send("❌ You’re not allowed to type in the `console` channel.");
    }

    if (message.content.startsWith('!status')) {
        return message.reply('🖥️ Eclipse-Bot is online and connected.');
    }

    if (message.content.startsWith('!restart')) {
        return message.reply('♻️ Restarting the server... (stub)').then(() => {
            // TODO: Trigger restart from APServerHandler
        });
    }
}
