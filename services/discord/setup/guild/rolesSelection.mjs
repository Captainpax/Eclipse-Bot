import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';

/**
 * Starts the guild setup flow by asking the administrator how they would like
 * to handle roles.  The two options presented are to create fresh roles
 * automatically or to select from existing roles within the guild.
 *
 * @param {import('discord.js').CommandInteraction|import('discord.js').ButtonInteraction} interaction
 * @param {Object} session
 * @param {import('discord.js').Client} client
 */
export async function startGuildRoleSetup(interaction, session, client) {
    const embed = new EmbedBuilder()
        .setTitle('🎭 Guild Role Setup')
        .setDescription('How shall we handle roles for this guild?')
        .addFields(
            {name: 'Create new roles', value: 'I will create fresh Moderator and Player roles for you.'},
            {name: 'Use existing roles', value: 'Select roles that already exist in your server.'}
        )
        .setColor(0x3498db);
    const autoButton = new ButtonBuilder()
        .setCustomId('guild_roles_autocreate')
        .setLabel('Create new')
        .setStyle(ButtonStyle.Primary);
    const existingButton = new ButtonBuilder()
        .setCustomId('guild_roles_existing')
        .setLabel('Use existing')
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(autoButton, existingButton);
    // We respond to the interaction here; if it has been deferred or replied,
    // followUp is used instead of reply
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], components: [row], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], components: [row], flags: 64});
    }
    session.step = 'guild_role_selection';
}

/**
 * Handles the user's choice of role creation versus selecting existing roles.
 * Delegates to either the role creation or role picking modules accordingly.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object} session
 * @param {import('discord.js').Client} client
 */
export async function handleRoleSelectionChoice(interaction, session, client) {
    if (interaction.customId === 'guild_roles_autocreate') {
        const {autoCreateRoles} = await import('./roleCreation.mjs');
        return autoCreateRoles(interaction, session, client);
    }
    if (interaction.customId === 'guild_roles_existing') {
        const {askPickModRole} = await import('./rolePicking.mjs');
        return askPickModRole(interaction, session);
    }
}