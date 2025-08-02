import {EmbedBuilder} from 'discord.js';

/**
 * Automatically creates moderator and player roles within the guild.  This
 * function is invoked when the administrator opts to have new roles
 * provisioned.  After creating the roles, it proceeds to ask whether the
 * roles should be immediately assigned to members.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object} session
 * @param {import('discord.js').Client} client
 */
export async function autoCreateRoles(interaction, session, client) {
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({content: '❌ This command must be run within a guild.', flags: 64});
        return;
    }
    // Create the Moderator role
    const modRole = await guild.roles.create({
        name: 'Eclipse Mod',
        color: 0xffa500,
        mentionable: true,
        reason: 'Auto-created by Eclipse‑Bot setup'
    });
    // Create the Player role
    const playerRole = await guild.roles.create({
        name: 'Eclipse Player',
        color: 0x00ff00,
        mentionable: true,
        reason: 'Auto-created by Eclipse‑Bot setup'
    });
    // Store role IDs in the session for later use
    session.choices.modRoleId = modRole.id;
    session.choices.playerRoleId = playerRole.id;
    // Inform the user
    const embed = new EmbedBuilder()
        .setTitle('✅ Roles Created')
        .setDescription(`I have created **${modRole.name}** and **${playerRole.name}**.`)
        .setColor(0x3498db);
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], flags: 64});
    }
    // Proceed to ask about assigning these roles
    const assignmentModule = await import('./roleAssignment.mjs');
    return assignmentModule.askAssignRoles(interaction, session, client);
}