import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';

/**
 * Handles prompting the user to choose or create a text category.
 *
 * This function records the selected guild in the session, fetches the
 * available categories within that guild, and builds a select menu and a
 * "create" button. The UI is then edited into the interaction response.
 *
 * @param {Interaction} interaction The interaction from Discord
 * @param {Client} client The Discord client
 * @param {Object} session The active session state
 * @param {boolean} [skipDefer=false] Whether to skip deferring the update
 */
export async function handleCategorySelection(interaction, client, session, skipDefer = false) {
    if (!skipDefer) await interaction.deferUpdate();
    session.choices.guildId = interaction.values[0];
    const guild = await client.guilds.fetch(session.choices.guildId);
    const categories = guild.channels.cache.filter(ch => ch.type === 4);
    const catChoices = categories.map(c => ({label: c.name, value: c.id}));
    const menu = new StringSelectMenuBuilder()
        .setCustomId('setup_select_category')
        .setPlaceholder('Choose or create category')
        .addOptions(catChoices.length ? catChoices : [{label: 'None found', value: 'none'}]);
    const createBtn = new ButtonBuilder()
        .setCustomId('setup_create_category')
        .setLabel('➕ Create New Category')
        .setStyle(ButtonStyle.Secondary);
    session.step = 3;
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 2️⃣ - Category').setDescription('Choose a text category or create a new one.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(menu), new ActionRowBuilder().addComponents(createBtn)]
    });
}

/**
 * Records the category choice and defers the interaction.
 *
 * If the user clicked the create button, this function will create a new
 * category under the selected guild. Otherwise it stores the chosen
 * category ID. The caller (setup handler) is responsible for continuing
 * the flow by invoking the next stage.
 *
 * @param {Interaction} interaction The interaction that triggered this call
 * @param {Client} client The Discord client instance
 * @param {Object} session The session state
 */
export async function handleCategoryChoice(interaction, client, session) {
    await interaction.deferUpdate();
    const guild = await client.guilds.fetch(session.choices.guildId);
    if (interaction.customId === 'setup_create_category') {
        const cat = await guild.channels.create({name: 'Eclipse-Bot', type: 4});
        session.choices.categoryId = cat.id;
    } else {
        session.choices.categoryId = interaction.values[0];
    }
    // nothing to send here; the next stage will edit the reply

}