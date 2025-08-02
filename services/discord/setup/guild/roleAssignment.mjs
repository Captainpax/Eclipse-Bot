import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, UserSelectMenuBuilder} from 'discord.js';

/**
 * Asks whether roles should be assigned immediately after creation or
 * selection.  Presents Yes/No buttons.  If the user declines, we proceed
 * directly to the final confirmation.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 * @param {import('discord.js').Client} client
 */
export async function askAssignRoles(interaction, session, client) {
    const embed = new EmbedBuilder()
        .setTitle('👥 Assign Roles to Members')
        .setDescription('Would you like me to assign the Moderator and Player roles to members now?')
        .setColor(0x3498db);
    const yesButton = new ButtonBuilder()
        .setCustomId('guild_assign_roles_yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Success);
    const noButton = new ButtonBuilder()
        .setCustomId('guild_assign_roles_no')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(yesButton, noButton);
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], components: [row], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], components: [row], flags: 64});
    }
    session.step = 'guild_assign_choice';
}

/**
 * Processes the Yes/No choice for role assignment.  If Yes, begins the
 * member selection flow; if No, proceeds directly to confirmation.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object} session
 */
export async function handleAssignRolesChoice(interaction, session) {
    if (interaction.customId === 'guild_assign_roles_no') {
        const {confirmGuildConfig} = await import('./finalizeGuildConfig.mjs');
        return confirmGuildConfig(interaction, session, interaction.client);
    }
    if (interaction.customId === 'guild_assign_roles_yes') {
        return askAssignModMembers(interaction, session);
    }
}

/**
 * Prompts the administrator to select members to receive the Moderator role.
 * Uses Discord's native user select menu.  Once members are selected,
 * handleModMembersSelected() will be invoked.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
export async function askAssignModMembers(interaction, session) {
    const embed = new EmbedBuilder()
        .setTitle('🧑‍⚖️ Assign Moderator Role')
        .setDescription('Select the members who should receive the Moderator role.')
        .setColor(0x3498db);
    const userMenu = new UserSelectMenuBuilder()
        .setCustomId('guild_assign_mod_members')
        .setPlaceholder('Select moderators')
        .setMinValues(0)
        .setMaxValues(25);
    const row = new ActionRowBuilder().addComponents(userMenu);
    // Update the previous message to avoid sending a new one; if no message
    // exists (interaction has not yet been replied), reply instead.
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], components: [row], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], components: [row], flags: 64});
    }
    session.step = 'guild_assign_mod_members';
}

/**
 * Stores the selected moderator member IDs and proceeds to ask for
 * player member selection.
 *
 * @param {import('discord.js').UserSelectMenuInteraction} interaction
 * @param {Object} session
 */
export async function handleModMembersSelected(interaction, session) {
    session.choices.modMembers = interaction.values;
    return askAssignPlayerMembers(interaction, session);
}

/**
 * Prompts the administrator to select members to receive the Player role.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
export async function askAssignPlayerMembers(interaction, session) {
    const embed = new EmbedBuilder()
        .setTitle('🎮 Assign Player Role')
        .setDescription('Select the members who should receive the Player role.')
        .setColor(0x3498db);
    const userMenu = new UserSelectMenuBuilder()
        .setCustomId('guild_assign_player_members')
        .setPlaceholder('Select players')
        .setMinValues(0)
        .setMaxValues(25);
    const row = new ActionRowBuilder().addComponents(userMenu);
    await interaction.update({embeds: [embed], components: [row]});
    session.step = 'guild_assign_player_members';
}

/**
 * Stores the selected player member IDs and proceeds to the final
 * confirmation step.
 *
 * @param {import('discord.js').UserSelectMenuInteraction} interaction
 * @param {Object} session
 */
export async function handlePlayerMembersSelected(interaction, session) {
    session.choices.playerMembers = interaction.values;
    const {confirmGuildConfig} = await import('./finalizeGuildConfig.mjs');
    return confirmGuildConfig(interaction, session, interaction.client);
}