import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';
// In the flattened environment the logger resides at the project root.
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

        // Determine or create the category for the admin panel
        let category;
        if (interaction.customId === 'setup_create_category') {
            category = await guild.channels.create({
                name: 'Eclipse-Bot',
                type: 4
            });
            session.choices.categoryId = category.id;
        } else {
            session.choices.categoryId = interaction.values[0];
            // Attempt to fetch the category from cache or API
            category = guild.channels.cache.get(session.choices.categoryId);
            if (!category) {
                category = await guild.channels.fetch(session.choices.categoryId);
            }
        }

        // If the chosen category already contains channels, warn the user and
        // remove them to ensure a clean slate for the admin panel.
        const existingChildren = guild.channels.cache.filter(
            (ch) => ch.parentId === session.choices.categoryId
        );
        if (existingChildren.size > 0) {
            await interaction.followUp({
                content: `⚠️ The selected category already contains ${existingChildren.size} channel(s). They will be removed for a fresh admin panel setup.`,
                flags: 64
            });
            for (const child of existingChildren.values()) {
                try {
                    await child.delete();
                } catch (err) {
                    logger.error(`❌ Failed to delete channel ${child.id}: ${err.message}`);
                }
            }
        }

        // Always create a log channel inside this category for diagnostics
        const logsCh = await guild.channels.create({
            name: 'ap-logs',
            type: 0,
            parent: session.choices.categoryId
        });
        session.choices.logsId = logsCh.id;

        // Wire up the logger to forward messages to the log channel
        const discordLogger = {
            async sendToLogChannel(msg) {
                try {
                    await logsCh.send({content: msg});
                } catch (err) {
                    logger.error(`❌ Failed to send log message: ${err.message}`);
                }
            }
        };
        const level =
            process.env.DEBUG?.toLowerCase() === 'true' || process.env.DEBUG === '1'
                ? 'debug'
                : 'high';
        logger.setDiscordLogger(discordLogger, level);

        await interaction.followUp({
            content: `✅ Log channel created: <#${logsCh.id}>`,
            flags: 64
        });
    } catch (err) {
        logger.error(`❌ Failed to set up category: ${err.message}`);
        return interaction.followUp({
            content: '❌ Could not set or create category. Check permissions.',
            flags: 64
        });
    }
    // Flow continues in next setup stage
}
