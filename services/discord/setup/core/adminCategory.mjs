import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';

/**
 * Prompts the user to select an existing category for the admin panel or to
 * create a new one.  Categories are listed from the selected master guild.
 *
 * @param {import('../../Downloads/discord.mjs').SelectMenuInteraction|import('discord.js').ButtonInteraction} interaction
 * @param {import('../../Downloads/discord.mjs').Client} client
 * @param {Object} session
 */
export async function handleAdminCategorySelection(interaction, client, session) {
    const guildId = session.choices.masterServerId;
    const guild = await client.guilds.fetch(guildId);
    // Filter for category channels (type 4 in discord.js v14)
    const categories = guild.channels.cache.filter(ch => ch.type === 4);
    const options = categories.map(cat => ({label: cat.name, value: cat.id}));

    const embed = new EmbedBuilder()
        .setTitle('🗂️ Choose Admin Panel Category')
        .setDescription('Select an existing category where the administrative panel should reside, or choose to create a new one.')
        .setColor(0x3498db);

    const select = new StringSelectMenuBuilder()
        .setCustomId('setup_select_admin_category')
        .setPlaceholder('Select a category')
        .addOptions(options.length > 0 ? options : [{label: 'No existing categories', value: 'none', default: true}]);

    const createButton = new ButtonBuilder()
        .setCustomId('setup_create_admin_category')
        .setLabel('Create New')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(select, createButton);
    await interaction.update({embeds: [embed], components: [row]});
    session.step = 'await_admin_category_choice';
}

/**
 * Handles the user's choice of admin category.  If an existing category is
 * selected, we move directly to the domain prompt.  If the user chooses to
 * create a new category, we set the session to await a category name via
 * DM.
 *
 * @param {import('../../Downloads/discord.mjs').SelectMenuInteraction|import('discord.js').ButtonInteraction} interaction
 * @param {import('../../Downloads/discord.mjs').Client} client
 * @param {Object} session
 */
export async function handleAdminCategoryChoice(interaction, client, session) {
    const guildId = session.choices.masterServerId;
    const guild = await client.guilds.fetch(guildId);

    if (interaction.customId === 'setup_select_admin_category') {
        const categoryId = interaction.values?.[0];
        // If there were no categories, the placeholder 'none' will come through.
        if (categoryId && categoryId !== 'none') {
            session.choices.adminCategoryId = categoryId;
        }
        // Ask the user for the domain next
        const {askDomain} = await import('./domainSetup.mjs');
        return askDomain(interaction, session);
    }

    if (interaction.customId === 'setup_create_admin_category') {
        // Ask the user to type the category name via DM.  The response will be
        // captured in handleSetupMessage().
        await interaction.reply({content: '🛠️ Please enter a name for the new admin category.', flags: 64});
        session.step = 'await_admin_category_name';

    }
}

/**
 * Called when the user types the name of a new admin category in DM.  This
 * function creates the category within the selected guild and then
 * advances to the domain setup.
 *
 * @param {import('../../Downloads/discord.mjs').Message} message
 * @param {Object} session
 * @param {import('../../Downloads/discord.mjs').Client} client
 */
export async function handleNewAdminCategoryName(message, session, client) {
    const guildId = session.choices.masterServerId;
    const guild = await client.guilds.fetch(guildId);
    const name = message.content.trim();
    if (!name) {
        await session.dm.send('⚠️ Please provide a valid category name.');
        return;
    }
    // Create the category channel.  In discord.js v14, type 4 is Category.
    const newCategory = await guild.channels.create({name, type: 4}).catch(() => null);
    if (!newCategory) {
        await session.dm.send('❌ Unable to create category. Please check my permissions and try again.');
        return;
    }
    session.choices.adminCategoryId = newCategory.id;
    // Proceed to domain setup
    const {askDomain} = await import('./domainSetup.mjs');
    return askDomain(message, session);
}