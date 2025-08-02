import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from '../../Downloads/discord.mjs';

/**
 * Summarises the user's selections and prompts for confirmation.  This
 * function gathers the choices stored in the session and renders them in an
 * embed.  A single Confirm button advances to finalisation.
 *
 * @param {import('../../Downloads/discord.mjs').Interaction|import('discord.js').Message} interactionOrMessage
 * @param {Object} session
 * @param {import('../../Downloads/discord.mjs').Client} [client]
 */
export async function confirmCoreConfig(interactionOrMessage, session, client) {
    const lines = [];
    if (session.choices.masterServerId) {
        let guildName;
        if (client) {
            const guild = client.guilds.cache.get(session.choices.masterServerId);
            guildName = guild?.name;
        }
        lines.push(`**Master Server:** ${guildName || session.choices.masterServerId}`);
    }
    if (session.choices.adminCategoryId) {
        lines.push(`**Admin Category ID:** ${session.choices.adminCategoryId}`);
    }
    if (session.choices.domain) {
        lines.push(`**Domain:** ${session.choices.domain}`);
    }
    if (session.choices.portRange) {
        lines.push(`**Port Range:** ${session.choices.portRange}`);
    }
    if (session.choices.mongo) {
        lines.push(`**Database Setup:** ${session.choices.mongo === 'docker' ? 'Docker MongoDB' : 'Custom URI'}`);
    }
    if (session.choices.mongoUri) {
        lines.push(`**Mongo URI:** ${session.choices.mongoUri}`);
    }
    const embed = new EmbedBuilder()
        .setTitle('✅ Confirm Your Configuration')
        .setDescription(lines.join('\n') || 'No configuration provided.')
        .setColor(0x3498db);
    const confirmButton = new ButtonBuilder()
        .setCustomId('setup_confirm_core')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(confirmButton);
    if ('reply' in interactionOrMessage && typeof interactionOrMessage.reply === 'function') {
        await interactionOrMessage.followUp({embeds: [embed], components: [row], flags: 64});
    } else if (session.dm) {
        await session.dm.send({embeds: [embed], components: [row]});
    }
}

/**
 * Finalises the core configuration.  This is where the bot would persist the
 * chosen settings (e.g. save them to a database or file) and create any
 * necessary channels.  For now, it simply acknowledges completion.
 *
 * @param {import('../../Downloads/discord.mjs').ButtonInteraction} interaction
 * @param {Object} session
 * @param {import('../../Downloads/discord.mjs').Client} client
 */
export async function finalizeCoreConfig(interaction, session, client) {
    // Persist configuration here.  For example, write to a file, update a
    // database, or set environment variables.  This stub simply thanks the
    // user.
    await interaction.update({
        content: '🎉 Your core configuration has been saved. Thank you for setting up Eclipse‑Bot!',
        embeds: [],
        components: []
    });
}