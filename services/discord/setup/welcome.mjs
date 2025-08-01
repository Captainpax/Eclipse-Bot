import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import logger from '../../../system/log/logHandler.mjs';
import {addToSignupQueue} from '../guilds/channelHandler.mjs';
import {getPlayer, saveGuildConfig} from '../users/usersHandler.mjs';

/**
 * Sends a persistent welcome wizard in the waiting room.
 * @param {import('discord.js').Client} client Discord.js client instance
 * @param {object} config Guild configuration object (will be mutated)
 * @returns {Promise<boolean>} True on success
 */
export async function sendWelcomeMessage(client, config) {
    try {
        if (!client || !config) {
            logger.error('❌ sendWelcomeMessage called without client or config');
            return false;
        }

        const guild = await client.guilds.fetch(config.guildId);
        const waitingRoomChannelId =
            config.channels?.waitingRoom?.[0] || config.waitingRoomChannelId;
        if (!waitingRoomChannelId) {
            logger.error('❌ Waiting room channel ID missing from config');
            return false;
        }

        const waitingRoomChannel = await guild.channels.fetch(waitingRoomChannelId);
        if (!waitingRoomChannel) {
            logger.error(`❌ Waiting room channel ${waitingRoomChannelId} not found`);
            return false;
        }

        let stage = 'owner';
        let ownerId = null;
        const mods = new Set();

        const buildContent = () => {
            if (stage === 'owner') {
                const embed = new EmbedBuilder()
                    .setTitle('👋 Welcome to Eclipse‑Bot')
                    .setDescription(
                        'I’m Eclipse‑Bot, your assistant for Archipelago games.\n\n' +
                        'To get started:\n' +
                        '➡️ **First**, run the `/ec link` command to link your Discord account.\n' +
                        '➡️ **Then**, click **I’m the Owner** if you’re hosting this game.'
                    )
                    .setColor(0x5865f2);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('owner_select')
                        .setLabel('👑 I’m the Owner')
                        .setStyle(ButtonStyle.Primary)
                );
                return {embeds: [embed], components: [row]};
            }

            if (stage === 'mods') {
                const embed = new EmbedBuilder()
                    .setTitle('👑 Owner Selected')
                    .setDescription(
                        `Thanks, <@${ownerId}>, for volunteering!\n\n` +
                        'Would anyone like to help as a mod?\n' +
                        'Mods assist the owner and can manage server setup.'
                    )
                    .setColor(0xf1c40f);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('mod_join')
                        .setLabel('🛡️ Join as Mod')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('mod_no')
                        .setLabel('🚫 No Mods')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('mod_next')
                        .setLabel('➡️ Next')
                        .setStyle(ButtonStyle.Success)
                );
                return {embeds: [embed], components: [row]};
            }

            const embed = new EmbedBuilder()
                .setTitle('🎮 Player Signup')
                .setDescription(
                    'Click **Join Next Game** to enter the player signup queue.\n\n' +
                    'Only the owner can click **Start Server Creation**.'
                )
                .setColor(0x57f287);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('player_join')
                    .setLabel('🎮 Join Next Game')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('server_start')
                    .setLabel('🚀 Start Server Creation')
                    .setStyle(ButtonStyle.Primary)
            );
            return {embeds: [embed], components: [row]};
        };

        let message = await waitingRoomChannel.send(buildContent());
        const collector = message.createMessageComponentCollector({componentType: 2});

        collector.on('collect', async interaction => {
            try {
                // 🔐 Check linked status
                const player = await getPlayer(interaction.user.id);
                if (!player?.settings?.linked) {
                    return await interaction.reply({
                        content: '❌ You must use `/ec link` before interacting with Eclipse-Bot.',
                        ephemeral: true
                    });
                }

                // 👑 OWNER STAGE
                if (stage === 'owner' && interaction.customId === 'owner_select') {
                    ownerId = interaction.user.id;
                    config.ownerId = ownerId;
                    await saveGuildConfig(config);

                    const modRoleId = config.roles?.mod?.[0];
                    if (modRoleId) {
                        try {
                            const member = await interaction.guild.members.fetch(ownerId);
                            if (!member.roles.cache.has(modRoleId)) {
                                await member.roles.add(modRoleId);
                            }
                        } catch (err) {
                            logger.warn(`⚠️ Failed to assign mod role to owner: ${err.message}`);
                        }
                    }

                    stage = 'mods';
                    await message.edit(buildContent());
                    return await interaction.reply({content: '👑 You are now the owner!', ephemeral: true});
                }

                // 🛡️ MOD STAGE
                if (stage === 'mods') {
                    if (interaction.customId === 'mod_join') {
                        const modRoleId = config.roles?.mod?.[0];
                        if (!modRoleId) {
                            return await interaction.reply({
                                content: '⚠️ No mod role is configured.',
                                ephemeral: true
                            });
                        }

                        if (mods.has(interaction.user.id)) {
                            return await interaction.reply({
                                content: '⚠️ You’re already a mod.',
                                ephemeral: true
                            });
                        }

                        mods.add(interaction.user.id);
                        try {
                            const member = await interaction.guild.members.fetch(interaction.user.id);
                            if (!member.roles.cache.has(modRoleId)) {
                                await member.roles.add(modRoleId);
                            }
                        } catch (err) {
                            logger.warn(`⚠️ Failed to assign mod role: ${err.message}`);
                        }

                        return await interaction.reply({content: '🛡️ You’re now a mod!', ephemeral: true});
                    }

                    if (interaction.customId === 'mod_no' && interaction.user.id === ownerId) {
                        stage = 'players';
                        await message.edit(buildContent());
                        return await interaction.reply({content: '🚫 No mods added.', ephemeral: true});
                    }

                    if (interaction.customId === 'mod_next' && interaction.user.id === ownerId) {
                        stage = 'players';
                        await message.edit(buildContent());
                        return await interaction.reply({content: '➡️ Proceeding to player signup.', ephemeral: true});
                    }

                    return await interaction.reply({content: '⚠️ Only the owner can proceed.', ephemeral: true});
                }

                // 🎮 PLAYER STAGE
                if (stage === 'players') {
                    if (interaction.customId === 'player_join') {
                        const result = addToSignupQueue(config.guildId, interaction.user.id);
                        if (result === 'already') {
                            return await interaction.reply({content: '⚠️ You’re already signed up!', ephemeral: true});
                        }

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

                        return await interaction.reply({content: '✅ Signed up for the next game!', ephemeral: true});
                    }

                    if (interaction.customId === 'server_start' && interaction.user.id === ownerId) {
                        return await interaction.reply({content: '🛠️ Starting server creation…', ephemeral: true});
                    }

                    return await interaction.reply({
                        content: '⚠️ Only the owner can start the server.',
                        ephemeral: true
                    });
                }
            } catch (err) {
                logger.error(`🔥 Welcome wizard error: ${err.message}`);
                try {
                    await interaction.reply({content: '❌ Something went wrong.', ephemeral: true});
                } catch {
                }
            }
        });

        return true;
    } catch (err) {
        logger.error(`❌ Failed to send welcome wizard: ${err.message}`);
        return false;
    }
}
