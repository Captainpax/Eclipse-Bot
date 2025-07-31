import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from '../../Downloads/discord.mjs';
import dotenv from 'dotenv';
import logger from '../../system/log/logHandler.mjs';

import {handleServerSelection} from './setup/serverSelection.mjs';
import {handleCategoryChoice, handleCategorySelection} from './setup/categorySelection.mjs';
import {askDatabaseSetup, askMongoUri, handleDockerMongo, injectMongoUri} from './setup/databaseSetup.mjs';
import {
    askRoles,
    autoCreateRoles,
    handleModRoleSelected,
    handlePlayerRoleSelected,
    pickExistingRoles
} from './setup/rolesSetup.mjs';
import {confirmConfig, finalizeConfig} from './setup/finalizeConfig.mjs';
import {connectDatabase} from '../../system/database/databaseHandler.mjs';
// Load environment variables
dotenv.config({override: true});

// In-memory map that tracks active setup sessions
const setupSessions = new Map();

/**
 * Starts the setup wizard by DMing the super user.
 */
export async function runFirstTimeSetup(client) {
    const superUserId = process.env.SUPER_USER_ID;
    if (!superUserId) return logger.error('❌ SUPER_USER_ID not set');

    const user = await client.users.fetch(superUserId).catch(() => null);
    if (!user) return logger.error('❌ SuperUser not found');

    const dm = await user.createDM();
    setupSessions.set(user.id, {step: 1, choices: {}, dm});

    const embed = new EmbedBuilder()
        .setTitle('🔧 Eclipse‑Bot Setup Wizard')
        .setDescription('Press **Start Setup** to begin configuration.')
        .setColor(0x5865F2);
    const button = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary);
    await dm.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
    });
}

/**
 * Handles button and menu interactions during the setup flow.
 */
export async function handleSetupInteraction(interaction, client) {
    const session = setupSessions.get(interaction.user.id);
    if (!session) return;

    try {
        switch (interaction.customId) {
            case 'setup_start':
                return handleServerSelection(interaction, client, session);

            case 'setup_select_guild':
                return handleCategorySelection(interaction, client, session);

            case 'setup_select_category':
            case 'setup_create_category':
                await handleCategoryChoice(interaction, client, session);
                return askDatabaseSetup(interaction, session);

            case 'setup_db_docker':
                await handleDockerMongo(interaction, session);
                if (connectDatabase) await connectDatabase();
                return askRoles(interaction, session);

            case 'setup_db_manual':
                return askMongoUri(interaction, session);

            case 'setup_roles_existing':
                return pickExistingRoles(interaction, session, client, 'mod');

            case 'setup_roles_select_mod':
                return handleModRoleSelected(interaction, session, client);

            case 'setup_roles_select_player':
                await handlePlayerRoleSelected(interaction, session);
                return confirmConfig(interaction, session);

            case 'setup_roles_autocreate':
                await autoCreateRoles(interaction, session, client);
                return confirmConfig(interaction, session);

            case 'setup_confirm_config':
                await finalizeConfig(interaction, session, client);
                setupSessions.delete(interaction.user.id);
                return;

            default:
                logger.warn(`⚠️ Unknown setup step: ${interaction.customId}`);
        }
    } catch (err) {
        logger.error(`❌ Setup step failed: ${err.message}`);
        if (!interaction.deferred && !interaction.replied) {
            interaction.reply({
                content: '❌ Setup error, please retry.',
                flags: 64
            }).catch(() => {
            });
        }
    }
}

/**
 * Handles plain text messages for manual Mongo URI entry.
 */
export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session || session.step !== 'await_mongo_uri') return;
    // Capture the provided URI
    const uri = message.content.trim();
    session.choices.mongoUri = uri;
    // Persist the URI in the environment and .env file
    try {
        injectMongoUri(uri);
    } catch (err) {
        logger.error(`❌ Failed to save Mongo URI: ${err.message}`);
    }
    // Attempt to connect to the database immediately so we can surface errors early.
    if (typeof connectDatabase === 'function') {
        try {
            await connectDatabase();
        } catch (err) {
            logger.error(`❌ Database connection failed: ${err.message}`);
        }
    }
    // Move on to the roles step
    await askRoles(message, session);
}

export {setupSessions};
