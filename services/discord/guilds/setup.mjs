import logger from '../../../system/log/logHandler.mjs';
import {saveGuildConfig} from '../users/usersHandler.mjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Runs the first-time setup for a guild by DMing the owner.
 */
export async function runFirstTimeSetup(client) {
    const guildId = process.env.GUILD_ID;
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return logger.error('❌ Guild not found for setup.');

    const owner = await guild.fetchOwner().catch(() => null);
    if (!owner) return logger.error('❌ Could not fetch guild owner.');

    const dm = await owner.createDM();

    try {
        await dm.send("👋 Hi! I'm Eclipse-Bot, here to help you host Archipelago servers.\nLet's get your server set up.");

        // Ask: Do you want to be admin?
        await dm.send("Would you like to be assigned as the **admin**? (yes/no)");
        const adminResponse = await waitForReply(dm);
        const assignAdmin = adminResponse.content.toLowerCase().startsWith('y');

        // Ask: Mod role
        await dm.send("Please **mention** the role or paste its **ID** you'd like to use as **Moderator**.");
        const modResponse = await waitForReply(dm);
        const modRoleId = modResponse.mentions.roles.first()?.id || modResponse.content.trim();

        // Ask: Player role
        await dm.send("Now please **mention** the role or paste its **ID** you'd like to use as **Player**.");
        const playerResponse = await waitForReply(dm);
        const playerRoleId = playerResponse.mentions.roles.first()?.id || playerResponse.content.trim();

        // Ask: Category
        await dm.send("Please **mention** the category or paste its **ID** you'd like the bot to use for creating channels.");
        const catResponse = await waitForReply(dm);
        const categoryId = catResponse.mentions.channels.first()?.id || catResponse.content.trim();

        // Ask: FQDN
        await dm.send("🌐 Please enter the **Fully Qualified Domain Name (FQDN)** players will use (e.g., `archi.yourdomain.com`).");
        const fqdnResponse = await waitForReply(dm);
        const fqdn = fqdnResponse.content.trim();

        // Ask: Port Range
        await dm.send("🔌 What **port range** should Eclipse-Bot use for hosting servers? (e.g., `38200-38300`)");
        const portResponse = await waitForReply(dm);
        const [portStart, portEnd] = portResponse.content
            .trim()
            .split('-')
            .map(p => parseInt(p));

        // Validate everything
        const invalid = !isSnowflake(modRoleId) ||
            !isSnowflake(playerRoleId) ||
            !isSnowflake(categoryId) ||
            !fqdn ||
            !portStart || !portEnd || portStart >= portEnd;

        if (invalid) {
            logger.error('❌ Setup validation failed:');
            if (!isSnowflake(modRoleId)) logger.error('- Invalid Mod Role ID');
            if (!isSnowflake(playerRoleId)) logger.error('- Invalid Player Role ID');
            if (!isSnowflake(categoryId)) logger.error('- Invalid Category ID');
            if (!fqdn) logger.error('- Missing FQDN');
            if (!portStart || !portEnd) logger.error('- Missing Port Range');
            if (portStart >= portEnd) logger.error(`- Invalid Port Range: ${portStart} >= ${portEnd}`);

            await dm.send(`❌ One or more inputs were invalid. Please run setup again.

Debug:
- Mod Role ID: \`${modRoleId || 'null'}\`
- Player Role ID: \`${playerRoleId || 'null'}\`
- Category ID: \`${categoryId || 'null'}\`
- FQDN: \`${fqdn || 'null'}\`
- Port Range: \`${portStart || '?'}-${portEnd || '?'}\`
`);
            return;
        }

        const config = {
            guildId,
            adminId: assignAdmin ? owner.id : null,
            modRoleId,
            playerRoleId,
            categoryId,
            fqdn,
            portRange: {start: portStart, end: portEnd},
            bootstrapped: false
        };

        await saveGuildConfig(config);
        await dm.send("✅ Setup complete! Eclipse-Bot is now ready to host Archipelago servers.");
        logger.info(`✅ Setup complete for guild ${guildId}`);

    } catch (err) {
        logger.error('❌ Error during first-time setup:', err);
        await dm.send("❌ Something went wrong during setup. Please contact support.");
    }
}

/**
 * Waits for a user reply in a DM conversation.
 * @param {import('discord.js').DMChannel} dm
 * @returns {Promise<import('discord.js').Message>}
 */
function waitForReply(dm) {
    return new Promise((resolve, reject) => {
        const filter = m => !m.author.bot;
        dm.awaitMessages({filter, max: 1, time: 60000, errors: ['time']})
            .then(collected => resolve(collected.first()))
            .catch(() => reject(new Error('Timed out waiting for DM response')));
    });
}

/**
 * Checks if a string is a valid Discord snowflake
 * @param {string} id
 * @returns {boolean}
 */
function isSnowflake(id) {
    return /^\d{17,20}$/.test(id);
}
