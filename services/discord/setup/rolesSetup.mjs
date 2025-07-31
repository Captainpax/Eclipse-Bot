import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';
import logger from '../../../system/log/logHandler.mjs';

/**
 * Asks the user whether to pick existing roles or create new ones.
 */
/**
 * Presents the user with a choice to pick existing roles or have them auto created.
 *
 * This helper works with both Interaction objects (during the slash command
 * setup flow) and regular Message objects (during manual Mongo URI entry).
 * When called with a Message, the prompt is sent to the DM channel stored
 * on the session. When called with an Interaction, the existing response
 * is edited in-place.
 *
 * @param {import('discord.js').Interaction | import('discord.js').Message} ctx
 *   The context to respond to
 * @param {Object} session The active setup session
 */
export async function askRoles(ctx, session) {
    // Build the common embed and buttons
    const existingBtn = new ButtonBuilder()
        .setCustomId('setup_roles_existing')
        .setLabel('🎭 Pick Existing Roles')
        .setStyle(ButtonStyle.Secondary);
    const autoBtn = new ButtonBuilder()
        .setCustomId('setup_roles_autocreate')
        .setLabel('✨ Auto-create Roles')
        .setStyle(ButtonStyle.Primary);

    session.step = 5;
    const payload = {
        embeds: [
            new EmbedBuilder()
                .setTitle('Step 4️⃣ - Roles')
                .setDescription('Would you like to use existing roles or auto-create them?')
                .setColor(0x5865F2)
        ],
        components: [new ActionRowBuilder().addComponents(existingBtn, autoBtn)]
    };
    // Determine how to send the prompt
    // If ctx has editReply (Interaction), edit the previous reply; otherwise send to DM
    if (typeof ctx.editReply === 'function') {
        return ctx.editReply(payload);
    }
    // If it's a message, send the prompt in the DM channel
    try {
        // Prefer the session's DM channel if available
        if (session.dm && typeof session.dm.send === 'function') {
            return session.dm.send(payload);
        }
        // Fallback: send in the message channel
        if (ctx.channel && typeof ctx.channel.send === 'function') {
            return ctx.channel.send(payload);
        }
    } catch (err) {
        logger.error(`❌ Failed to send roles prompt: ${err.message}`);
    }
}

/**
 * Builds a role selection menu for either moderator or player roles.
 */
export async function pickExistingRoles(interaction, session, client, type, skipDefer = false) {
    if (!skipDefer) await interaction.deferUpdate();
    const guild = await client.guilds.fetch(session.choices.guildId);
    const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({label: r.name, value: r.id}))
        .slice(0, 25);

    const roleSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(type === 'mod' ? 'setup_roles_select_mod' : 'setup_roles_select_player')
        .setPlaceholder(type === 'mod' ? 'Select Moderator Role' : 'Select Player Role')
        .addOptions(roles);

    session.step = type === 'mod' ? 'mod_role' : 'player_role';

    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle(`Select ${type === 'mod' ? 'Moderator' : 'Player'} Role`)
                .setDescription(`Choose a role for **${type}**.`)
                .setColor(0x5865F2)
        ],
        components: [new ActionRowBuilder().addComponents(roleSelectMenu)]
    });
}

/**
 * Stores the selected moderator role and prompts for the player role.
 */
export async function handleModRoleSelected(interaction, session, client) {
    await interaction.deferUpdate();
    session.choices.modRoleId = interaction.values[0];
    return pickExistingRoles(interaction, session, client, 'player', true);
}

/**
 * Stores the selected player role.
 */
export async function handlePlayerRoleSelected(interaction, session) {
    await interaction.deferUpdate();
    session.choices.playerRoleId = interaction.values[0];
}

/**
 * Auto‑creates moderator and player roles in the selected guild.
 */
export async function autoCreateRoles(interaction, session, client) {
    await interaction.deferReply({flags: 64});
    try {
        const guild = await client.guilds.fetch(session.choices.guildId);
        const mod = await guild.roles.create({name: 'Eclipse-Mod', color: 'Blue'});
        const player = await guild.roles.create({name: 'Eclipse-Player', color: 'Green'});
        session.choices.modRoleId = mod.id;
        session.choices.playerRoleId = player.id;
    } catch (err) {
        logger.error(`❌ Failed to create roles: ${err.message}`);
        return interaction.editReply({content: '❌ Role creation failed.', flags: 64});
    }
}
