// logs.mjs

/**
 * Creates the logs channel for internal system output.
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
 * Deletes user messages in the logs channel.
 */
export async function handleLogsMessage(message, config, client) {
    if (message.author.bot) return;

    try {
        await message.delete();
        await message.author.send("📛 The `logs` channel is reserved for Eclipse-Bot system output only.");
    } catch (err) {
        console.warn('Failed to delete unauthorized message in logs:', err);
    }
}
