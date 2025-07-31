import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';
import logger from '../../../system/log/logHandler.mjs';

/**
 * Handles prompting the user to choose or create a text category.
 *
 * @param {Interaction} interaction The interaction from Discord
 * @param {Client} client The Discord client
 * @param {Object} session The active session state
 * @param {boolean} [skipDefer=false] Whether to skip deferring the update
 */
export async function handleCategorySelection(interaction, client, session, skipDefer = false) {
    try {
        if (!skipDefer) await interaction.deferUpdate();

        session.choices.guildId = interaction.values[0];
        const guild = await client.guilds.fetch(session.choices.guildId);

        // Fetch available text categories
        const categories = guild.channels.cache.filter(ch => ch.type === 4);
        const catChoices = categories.map(c => ({label: c.name, value: c.id}));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('setup_select_category')
            .setPlaceholder('Choose or create category')
            .addOptions(
                catChoices.length
                    ? catChoices
                    : [{label: 'No categories found', value: 'none'}]
            );

        const createBtn = new ButtonBuilder()
            .setCustomId('setup_create_category')
            .setLabel('➕ Create New Category')
            .setStyle(ButtonStyle.Secondary);

        session.step = 3;

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Step 2️⃣ - Category')
                    .setDescription('Choose a text category or create a new one.')
                    .setColor(0x5865F2)
            ],
            components: [
                new ActionRowBuilder().addComponents(menu),
                new ActionRowBuilder().addComponents(createBtn)
            ]
        });
    } catch (err) {
        logger.error(`❌ Failed to list categories: ${err.message}`);
        return interaction.followUp({
            content: '❌ Unable to fetch categories. Check permissions.',
            ephemeral: true
        });
    }
}

/**
 * Records the category choice and defers the interaction.
 *
 * @param {Interaction} interaction The interaction that triggered this call
 * @param {Client} client The Discord client instance
 * @param {Object} session The session state
 */
export async function handleCategoryChoice(interaction, client, session) {
    try {
        await interaction.deferUpdate();
        const guild = await client.guilds.fetch(session.choices.guildId);

        if (interaction.customId === 'setup_create_category') {
            const cat = await guild.channels.create({
                name: 'Eclipse-Bot',
                type: 4
            });
            session.choices.categoryId = cat.id;
        } else {
            session.choices.categoryId = interaction.values[0];
        }
    } catch (err) {
        logger.error(`❌ Failed to set category: ${err.message}`);
        return interaction.followUp({
            content: '❌ Could not set or create category. Check permissions.',
            ephemeral: true
        });
    }
    // Flow continues in next setup stage
}
