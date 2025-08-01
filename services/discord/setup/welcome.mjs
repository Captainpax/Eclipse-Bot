import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import logger from '../../../system/log/logHandler.mjs';
import {addToSignupQueue} from '../guilds/channelHandler.mjs';
import {getPlayer} from '../users/usersHandler.mjs';

/**
 * Sends an interactive welcome message to the server's waiting room.
 *
 * This helper posts a short introduction embed and three buttons:
 *
 *  - **Join Next Game** – Adds the user to the signup queue for the next game
 *    and assigns them the configured player role. Requires the player to have
 *    previously linked their Archipelago account via `/ec link`.
 *
 *  - **Call Owner** – Notifies the configured server owner (admin) that a
 *    player needs assistance.
 *
 *  - **Call Mod** – Notifies the configured moderator role that a
 *    player needs assistance.
 *
 * The collector keeps running indefinitely, allowing multiple users to use
 * these buttons without the message expiring. Errors are logged but do
 * not crash the collector. Replies to users are sent ephemerally when
 * appropriate to avoid spam in the waiting room.
 *
 * @param {import('discord.js').Client} client Discord.js client instance
 * @param {object} config Server configuration from the database
 * @returns {Promise<boolean>} True on success, false on failure
 */
export async function sendWelcomeMessage(client, config) {
    try {
        // Validate config
        if (!client || !config) {
            logger.error('❌ sendWelcomeMessage called without client or config');
            return false;
        }

        // Resolve guild and waiting room channel
        const guild = await client.guilds.fetch(config.guildId);
        if (!guild) {
            logger.error(`❌ Guild ${config.guildId} not found when sending welcome message`);
            return false;
        }

        // Determine the waiting room channel ID.  This may come from the
        // bootstrapped channels array or the legacy property.
        const waitingRoomChannelId =
            (config.channels?.waitingRoom && config.channels.waitingRoom[0]) ||
            config.waitingRoomChannelId;
        if (!waitingRoomChannelId) {
            logger.error('❌ Waiting room channel ID missing from config');
            return false;
        }
        const waitingRoomChannel = await guild.channels.fetch(waitingRoomChannelId);
        if (!waitingRoomChannel) {
            logger.error(`❌ Waiting room channel ${waitingRoomChannelId} not found`);
            return false;
        }

        // Build the welcome embed
        const embed = new EmbedBuilder()
            .setTitle('👋 Welcome to Eclipse‑Bot')
            .setDescription(
                'I’m Eclipse‑Bot, your friendly assistant for Archipelago games.\n\n' +
                'Use the buttons below to join the next game or call for assistance.'
            )
            .setColor(0x5865f2);

        // Create interactive buttons
        const joinBtn = new ButtonBuilder()
            .setCustomId('welcome_join_game')
            .setLabel('🎮 Join Next Game')
            .setStyle(ButtonStyle.Success);
        const ownerBtn = new ButtonBuilder()
            .setCustomId('welcome_call_owner')
            .setLabel('📣 Call Owner')
            .setStyle(ButtonStyle.Secondary);
        const modBtn = new ButtonBuilder()
            .setCustomId('welcome_call_mod')
            .setLabel('🛠 Call Mod')
            .setStyle(ButtonStyle.Secondary);
        const actionRow = new ActionRowBuilder().addComponents(joinBtn, ownerBtn, modBtn);

        // Send the embed and buttons to the waiting room
        const message = await waitingRoomChannel.send({embeds: [embed], components: [actionRow]});

        // Set up a collector to handle button interactions.  We omit the
        // `time` option so the collector does not automatically end.
        const collector = message.createMessageComponentCollector({componentType: 2});

        collector.on('collect', async interaction => {
            try {
                // Ensure interactions come from a guild
                if (!interaction.guild) return;

                if (interaction.customId === 'welcome_join_game') {
                    // Check if the user is linked via getPlayer
                    const player = await getPlayer(interaction.user.id);
                    if (!player || !player.settings?.linked) {
                        return await interaction.reply({
                            content: '❌ You must use `/ec link` before joining the signup queue.',
                            flags: 64 // Ephemeral reply
                        });
                    }

                    // Add the user to the signup queue (in-memory)
                    const result = addToSignupQueue(config.guildId, interaction.user.id);
                    if (result === 'already') {
                        return await interaction.reply({
                            content: '⚠️ You’re already on the signup list!',
                            flags: 64
                        });
                    }

                    // Assign the player Discord role if configured
                    const playerRoleId = config.roles?.player?.[0];
                    if (playerRoleId) {
                        try {
                            const member = await interaction.guild.members.fetch(interaction.user.id);
                            if (!member.roles.cache.has(playerRoleId)) {
                                await member.roles.add(playerRoleId);
                            }
                        } catch (err) {
                            logger.warn(`⚠️ Failed to assign player role: ${err.message}`);
                        }
                    }

                    return await interaction.reply({
                        content: '✅ You’ve been added to the signup queue!',
                        flags: 64
                    });
                }

                if (interaction.customId === 'welcome_call_owner') {
                    // Notify the owner(s).  Use the admin role list or fallback to adminId.
                    const ownerIds =
                        (Array.isArray(config.roles?.admin) && config.roles.admin.length
                            ? config.roles.admin
                            : [config.adminId]).filter(Boolean);
                    if (!ownerIds.length) {
                        return await interaction.reply({
                            content: '⚠️ No owner configured on this server.',
                            flags: 64
                        });
                    }
                    const mentions = ownerIds.map(id => `<@${id}>`).join(' ');
                    return await interaction.reply({
                        content: `📣 ${mentions}, ${interaction.user} is requesting assistance!`,
                        allowedMentions: {users: ownerIds},
                        flags: 0
                    });
                }

                if (interaction.customId === 'welcome_call_mod') {
                    // Notify the mod role(s).  Mentions must be formatted as role mentions.
                    const modRoleIds = Array.isArray(config.roles?.mod) ? config.roles.mod : [];
                    if (!modRoleIds.length) {
                        return await interaction.reply({
                            content: '⚠️ No mod role configured on this server.',
                            flags: 64
                        });
                    }
                    const roleMentions = modRoleIds.map(id => `<@&${id}>`).join(' ');
                    return await interaction.reply({
                        content: `🛠 ${roleMentions}, ${interaction.user} needs help!`,
                        allowedMentions: {roles: modRoleIds},
                        flags: 0
                    });
                }
            } catch (err) {
                logger.error(`🔥 Error processing welcome button interaction: ${err.message}`);
                try {
                    await interaction.reply({
                        content: '❌ Something went wrong while processing your request.',
                        flags: 64
                    });
                } catch (_) {
                    // Ignore secondary errors
                }
            }
        });

        return true;
    } catch (err) {
        logger.error(`❌ Failed to send welcome message: ${err.message}`);
        return false;
    }
}
