import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';

/**
 * Presents the user with a choice between provisioning a MongoDB instance via
 * Docker or providing their own Mongo URI.  The response is captured via
 * button interactions handled in setuphandler.js.
 *
 * @param {import('../../Downloads/discord.mjs').Interaction|import('discord.js').Message} interactionOrMessage
 * @param {Object} session
 */
export async function askDatabaseSetup(interactionOrMessage, session) {
    const embed = new EmbedBuilder()
        .setTitle('🗄️ Database Setup')
        .setDescription('How shall I arrange the database, sir?\n\nPlease choose whether you would like me to provision a MongoDB instance via Docker or if you will provide your own connection URI.')
        .setColor(0x3498db);
    const dockerButton = new ButtonBuilder()
        .setCustomId('setup_db_docker')
        .setLabel('Docker MongoDB')
        .setStyle(ButtonStyle.Primary);
    const manualButton = new ButtonBuilder()
        .setCustomId('setup_db_manual')
        .setLabel('Provide URI')
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(dockerButton, manualButton);
    if ('reply' in interactionOrMessage && typeof interactionOrMessage.reply === 'function') {
        await interactionOrMessage.followUp({embeds: [embed], components: [row], flags: 64});
    } else if (session.dm) {
        await session.dm.send({embeds: [embed], components: [row]});
    }
    session.step = 'await_db_choice';
}

/**
 * Prompts the user to provide their Mongo connection URI.  Once the user
 * enters the URI, the session will store it in session.choices.mongoUri
 * via handleSetupMessage().
 *
 * @param {import('../../Downloads/discord.mjs').Interaction|import('discord.js').Message} interactionOrMessage
 * @param {Object} session
 */
export async function askMongoUri(interactionOrMessage, session) {
    const embed = new EmbedBuilder()
        .setTitle('🔗 Provide Mongo URI')
        .setDescription('Please send your MongoDB connection URI.\n\nIt should look something like `mongodb+srv://user:password@cluster.mongodb.net/dbname`.')
        .setColor(0x3498db);
    if ('reply' in interactionOrMessage && typeof interactionOrMessage.reply === 'function') {
        await interactionOrMessage.followUp({embeds: [embed], flags: 64});
    } else if (session.dm) {
        await session.dm.send({embeds: [embed]});
    }
    session.step = 'await_mongo_uri';
}

/**
 * Handles the Docker choice.  When called, it simply records that the user
 * selected a Docker MongoDB setup.  Provisioning of the database would
 * happen in subsequent implementation.
 *
 * @param {import('../../Downloads/discord.mjs').Interaction} interaction
 * @param {Object} session
 */
export async function handleDockerMongo(interaction, session) {
    session.choices.mongo = 'docker';
    // For now, nothing else to do here.  In a future iteration we could
    // provision a container and store connection details.
    await interaction.deferUpdate();
}