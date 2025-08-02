import {ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';

/**
 * Prompts the administrator to choose an existing role to act as the
 * Moderator role.  Only roles other than @everyone are offered.  After
 * selection, it will ask for the Player role.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
export async function askPickModRole(interaction, session) {
    const guild = interaction.guild;
    const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({label: r.name, value: r.id}));
    const embed = new EmbedBuilder()
        .setTitle('🎖️ Select Moderator Role')
        .setDescription('Please choose an existing role to serve as Moderator.')
        .setColor(0x3498db);
    const select = new StringSelectMenuBuilder()
        .setCustomId('guild_select_mod_role')
        .setPlaceholder('Select a moderator role')
        .addOptions(roles);
    const row = new ActionRowBuilder().addComponents(select);
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], components: [row], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], components: [row], flags: 64});
    }
    session.step = 'guild_mod_role_selection';
}

/**
 * Handles the moderator role selection and proceeds to ask for the player
 * role.
 *
 * @param {import('discord.js').SelectMenuInteraction} interaction
 * @param {Object} session
 */
export async function handleModRoleSelected(interaction, session) {
    const roleId = interaction.values[0];
    session.choices.modRoleId = roleId;
    const {askPickPlayerRole} = await import('./rolePicking.mjs');
    return askPickPlayerRole(interaction, session);
}

/**
 * Prompts the administrator to choose an existing role to act as the
 * Player role.  The previously selected Moderator role is excluded from
 * this list.
 *
 * @param {import('discord.js').SelectMenuInteraction} interaction
 * @param {Object} session
 */
export async function askPickPlayerRole(interaction, session) {
    const guild = interaction.guild;
    const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone' && r.id !== session.choices.modRoleId)
        .map(r => ({label: r.name, value: r.id}));
    const embed = new EmbedBuilder()
        .setTitle('🎮 Select Player Role')
        .setDescription('Please choose an existing role to serve as Player.')
        .setColor(0x3498db);
    const select = new StringSelectMenuBuilder()
        .setCustomId('guild_select_player_role')
        .setPlaceholder('Select a player role')
        .addOptions(roles);
    const row = new ActionRowBuilder().addComponents(select);
    await interaction.update({embeds: [embed], components: [row]});
    session.step = 'guild_player_role_selection';
}

/**
 * Handles the player role selection and proceeds to ask about assigning
 * roles to members.
 *
 * @param {import('discord.js').SelectMenuInteraction} interaction
 * @param {Object} session
 */
export async function handlePlayerRoleSelected(interaction, session) {
    const roleId = interaction.values[0];
    session.choices.playerRoleId = roleId;
    const assignmentModule = await import('./roleAssignment.mjs');
    return assignmentModule.askAssignRoles(interaction, session, interaction.client);
}