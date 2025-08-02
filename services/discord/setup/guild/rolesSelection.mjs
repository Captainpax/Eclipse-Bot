import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';

/**
 * Starts the guild setup flow by asking the administrator how they would like
 * to handle roles.
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
        .setCustomId('guild_roles_choice:autocreate')
        .setLabel('Create new')
        .setStyle(ButtonStyle.Primary);
    const existingButton = new ButtonBuilder()
        .setCustomId('guild_roles_choice:existing')
        .setLabel('Use existing')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(autoButton, existingButton);

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], components: [row], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], components: [row], flags: 64});
    }

    session.step = 'guild_role_selection';
}

export async function handleRoleSelectionChoice(interaction, session, client) {
    const [, choice] = interaction.customId.split(':');

    if (choice === 'autocreate') {
        const {autoCreateRoles} = await import('./roleCreation.mjs');
        return autoCreateRoles(interaction, session, client);
    }

    if (choice === 'existing') {
        const {askPickModRole} = await import('./rolePicking.mjs');
        return askPickModRole(interaction, session);
    }
}