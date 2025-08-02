import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';

/**
 * Summarises the chosen roles and any assigned members, then prompts the
 * administrator to confirm the configuration.
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 * @param {import('discord.js').Client} client
 */
export async function confirmGuildConfig(interaction, session, client) {
    const guild = interaction.guild;
    let modRoleName = session.choices.modRoleId;
    let playerRoleName = session.choices.playerRoleId;
    if (guild) {
        modRoleName = guild.roles.cache.get(session.choices.modRoleId)?.name || modRoleName;
        playerRoleName = guild.roles.cache.get(session.choices.playerRoleId)?.name || playerRoleName;
    }
    const lines = [];
    lines.push(`**Moderator Role:** ${modRoleName}`);
    lines.push(`**Player Role:** ${playerRoleName}`);
    if (session.choices.modMembers?.length) {
        const names = session.choices.modMembers.map(id => {
            const member = guild.members.cache.get(id);
            return member ? member.displayName : `<@${id}>`;
        });
        lines.push(`**Mod Members:** ${names.join(', ')}`);
    }
    if (session.choices.playerMembers?.length) {
        const names = session.choices.playerMembers.map(id => {
            const member = guild.members.cache.get(id);
            return member ? member.displayName : `<@${id}>`;
        });
        lines.push(`**Player Members:** ${names.join(', ')}`);
    }
    const embed = new EmbedBuilder()
        .setTitle('✅ Confirm Guild Setup')
        .setDescription(lines.join('\n'))
        .setColor(0x3498db);
    const confirmButton = new ButtonBuilder()
        .setCustomId('guild_confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(confirmButton);
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({embeds: [embed], components: [row], flags: 64});
    } else {
        await interaction.reply({embeds: [embed], components: [row], flags: 64});
    }
    session.step = 'guild_confirm';
}

/**
 * Applies the selected roles to the selected members and concludes the
 * guild setup.  If no members were selected, the roles are still created
 * or recorded but not assigned to anyone.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object} session
 */
export async function finalizeGuildConfig(interaction, session) {
    const guild = interaction.guild;
    // Assign the Moderator role to selected members
    if (guild && session.choices.modMembers?.length) {
        for (const id of session.choices.modMembers) {
            const member = guild.members.cache.get(id);
            if (member) {
                await member.roles.add(session.choices.modRoleId).catch(() => {
                });
            }
        }
    }
    // Assign the Player role to selected members
    if (guild && session.choices.playerMembers?.length) {
        for (const id of session.choices.playerMembers) {
            const member = guild.members.cache.get(id);
            if (member) {
                await member.roles.add(session.choices.playerRoleId).catch(() => {
                });
            }
        }
    }
    await interaction.update({content: '🎉 Guild setup complete!', embeds: [], components: []});
    // Session can be cleared or further actions taken here if needed
}