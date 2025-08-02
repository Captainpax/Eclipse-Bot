import {ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder} from '../../Downloads/discord.mjs';

/**
 * Presents a select menu listing all guilds the bot is currently a member of
 * and prompts the user to choose which one should be designated the Master
 * Server.  The Master Server is where the core administrative channels and
 * categories will reside.  Once the user makes a selection, the next step
 * is to choose the admin category.
 *
 * @param {import('../../Downloads/discord.mjs').SelectMenuInteraction|import('discord.js').ButtonInteraction} interaction
 * @param {import('../../Downloads/discord.mjs').Client} client
 * @param {Object} session
 */
export async function handleMasterServerSelection(interaction, client, session) {
    // Build an array of guild options from the client's guild cache.  We use
    // name and ID so the user can easily identify each server.  In case the
    // bot has not cached all guilds, `.cache.map()` will still return
    // whatever is available.
    const guilds = client.guilds.cache.map(guild => ({id: guild.id, name: guild.name}));

    if (guilds.length === 0) {
        await interaction.update({
            content: '⚠️ I do not currently belong to any servers. Please invite me to a server and try again.',
            embeds: [],
            components: []
        });
        return;
    }

    const options = guilds.map(g => ({
        label: g.name,
        value: g.id
    }));

    const embed = new EmbedBuilder()
        .setTitle('🏰 Select the Master Server')
        .setDescription('Pray tell, which server shall be your **Master Server**? This is the guild where Eclipse‑Bot will create its primary administrative panel. Please select a server from the list below.')
        .setColor(0x3498db);

    const select = new StringSelectMenuBuilder()
        .setCustomId('setup_select_master')
        .setPlaceholder('Select a server')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);
    await interaction.update({embeds: [embed], components: [row]});
    session.step = 'await_master_server';
}

/**
 * Handles the selection of a Master Server.  Stores the guild ID in the
 * session and transitions into the Admin Category selection step.
 *
 * @param {import('../../Downloads/discord.mjs').SelectMenuInteraction} interaction
 * @param {import('../../Downloads/discord.mjs').Client} client
 * @param {Object} session
 */
export async function handleMasterServerSelected(interaction, client, session) {
    const selectedGuildId = interaction.values?.[0];
    if (!selectedGuildId) {
        await interaction.reply({content: '⚠️ No server was selected.', flags: 64});
        return;
    }
    session.choices.masterServerId = selectedGuildId;
    session.step = 'await_admin_category';
    // Dynamically import the next step to avoid circular dependencies
    const {handleAdminCategorySelection} = await import('./adminCategory.mjs');
    return handleAdminCategorySelection(interaction, client, session);
}