import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import {saveGuildConfig} from '../users/usersHandler.mjs';
import {connectDatabase} from '../../../system/database/databaseHandler.mjs';

/**
 * Presents a final configuration review screen to the user.
 */
export async function confirmConfig(interaction, session) {
    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle('Step 5️⃣ - Review Config')
                .setDescription(
                    `Please confirm the following:\n\n` +
                    `**Guild:** <@${session.choices.guildId}>\n` +
                    `**Category:** <#${session.choices.categoryId}>\n` +
                    `**Mongo URI:** \`${session.choices.mongoUri}\`\n` +
                    `**Mod Role:** <@&${session.choices.modRoleId}>\n` +
                    `**Player Role:** <@&${session.choices.playerRoleId}>\n\n` +
                    `Press **Confirm** to save config.`
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
}

/**
 * Saves the collected configuration to the database and finalises setup.
 */
export async function finalizeConfig(interaction, session, client) {
    await interaction.deferUpdate().catch(() => {
    });

    const guild = await client.guilds.fetch(session.choices.guildId);
    // Always create a fresh console channel and waiting room channel. For
    // the logs channel, reuse the one created during category selection if
    // available. If it does not exist or has been deleted, create a new
    // one to ensure logs can be sent.
    const consoleCh = await guild.channels.create({
        name: 'ap-console',
        type: 0,
        parent: session.choices.categoryId
    });
    let logsCh;
    if (session.choices.logsId) {
        try {
            logsCh = await guild.channels.fetch(session.choices.logsId);
        } catch (_) {
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
                .setDescription(`Server is ready!\nMongo URI: \`${config.mongoUri}\``)
                .setColor(0x57F287)
        ],
        components: []
    });
}
