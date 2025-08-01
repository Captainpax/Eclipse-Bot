import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import {saveGuildConfig} from '../users/usersHandler.mjs';
import {connectDatabase} from '../../../system/database/databaseHandler.mjs';

/**
 * Builds a readable name or a fallback if fetching fails.
 * @param {import('discord.js').Guild} guild
 * @param {string} roleId
 * @returns {Promise<string>}
 */
async function getRoleName(guild, roleId) {
    try {
        const role = await guild.roles.fetch(roleId);
        return role ? role.name : `Unknown Role (${roleId})`;
    } catch {
        return `Unknown Role (${roleId})`;
    }
}

/**
 * Presents a final configuration review screen to the user with human-readable names.
 */
export async function confirmConfig(interaction, session, client) {
    try {
        const guild = await client.guilds.fetch(session.choices.guildId);
        const category = await guild.channels.fetch(session.choices.categoryId);
        const modRoleName = await getRoleName(guild, session.choices.modRoleId);
        const playerRoleName = await getRoleName(guild, session.choices.playerRoleId);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Step 5️⃣ - Review Config')
                    .setDescription('Please review your setup before saving:')
                    .addFields(
                        {name: 'Guild', value: guild?.name || `Unknown (${session.choices.guildId})`, inline: false},
                        {
                            name: 'Category',
                            value: category?.name || `Unknown (${session.choices.categoryId})`,
                            inline: true
                        },
                        {name: 'Mongo URI', value: `\`${session.choices.mongoUri}\``, inline: false},
                        {name: 'Mod Role', value: modRoleName, inline: true},
                        {name: 'Player Role', value: playerRoleName, inline: true}
                    )
                    .setColor(0xF1C40F)
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('setup_confirm_config')
                        .setLabel('✅ Confirm & Save')
                        .setStyle(ButtonStyle.Success)
                )
            ]
        });
    } catch (err) {
        console.error('🔥 Error in confirmConfig:', err);
        return interaction.editReply({content: '❌ Failed to build confirmation screen. Please retry.', components: []});
    }
}

/**
 * Saves the collected configuration to the database and finalizes setup.
 */
export async function finalizeConfig(interaction, session, client) {
    await interaction.deferUpdate().catch(() => {
    });

    try {
        const guild = await client.guilds.fetch(session.choices.guildId);

        // Create required channels
        const consoleCh = await guild.channels.create({
            name: 'ap-console',
            type: 0,
            parent: session.choices.categoryId
        });

        let logsCh;
        if (session.choices.logsId) {
            try {
                logsCh = await guild.channels.fetch(session.choices.logsId);
            } catch {
                logsCh = null;
            }
        }
        if (!logsCh) {
            logsCh = await guild.channels.create({
                name: 'ap-logs',
                type: 0,
                parent: session.choices.categoryId
            });
        }

        const waitingCh = await guild.channels.create({
            name: 'ap-waiting-room',
            type: 0,
            parent: session.choices.categoryId
        });

        // Build config
        const config = {
            guildId: session.choices.guildId,
            adminId: interaction.user.id,
            fqdn: 'not-set',
            portRange: {start: 38200, end: 38300},
            mongoUri: session.choices.mongoUri,
            bootstrapped: true,
            roles: {
                admin: [interaction.user.id],
                mod: [session.choices.modRoleId],
                player: [session.choices.playerRoleId]
            },
            channels: {
                category: [session.choices.categoryId],
                console: [consoleCh.id],
                logs: [logsCh.id],
                waitingRoom: [waitingCh.id]
            }
        };

        await connectDatabase();
        await saveGuildConfig(config);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ Setup Complete')
                    .setDescription(
                        `Your server is now ready!\n\n` +
                        `**Mongo URI:** \`${config.mongoUri}\`\n` +
                        `**Guild:** ${guild.name}`
                    )
                    .setColor(0x57F287)
            ],
            components: []
        });
    } catch (err) {
        console.error('🔥 Error in finalizeConfig:', err);
        return interaction.editReply({content: '❌ Failed to finalize configuration. Please retry.', components: []});
    }
}
