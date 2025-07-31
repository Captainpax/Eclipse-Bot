import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';

// Internal logger for debug/error reporting
import logger from '../../system/log/logHandler.mjs';

// Stage handlers
import {handleServerSelection} from './setup/serverSelection.mjs';
import {handleCategoryChoice, handleCategorySelection} from './setup/categorySelection.mjs';
import {askDatabaseSetup, askMongoUri, handleDockerMongo} from './setup/databaseSetup.mjs';
import {
    askRoles,
    autoCreateRoles,
    handleModRoleSelected,
    handlePlayerRoleSelected,
    pickExistingRoles
} from './setup/rolesSetup.mjs';
import {confirmConfig, finalizeConfig} from './setup/finalizeConfig.mjs';

// Load environment variables so SUPER_USER_ID is available at runtime
dotenv.config({override: true});

// In‑memory map that tracks active setup sessions
const setupSessions = new Map();

/**
 * Starts the Eclipse‑Bot setup wizard by DMing the super user.
 *
 * This function reads the SUPER_USER_ID from the environment, opens a DM
 * channel with that user, initialises a session entry, and sends the
 * introductory embed with a Start button. Any errors encountered during
 * lookup or DM creation are logged and abort the flow.
 *
 * @param {Client} client Discord client instance
 */
export async function runFirstTimeSetup(client) {
    const superUserId = process.env.SUPER_USER_ID;
    if (!superUserId) {
        return logger.error('❌ SUPER_USER_ID not set');
    }
    const user = await client.users.fetch(superUserId).catch(() => null);
    if (!user) {
        return logger.error('❌ SuperUser not found');
    }
    // initialise a session entry for this user
    const dm = await user.createDM();
    setupSessions.set(user.id, {step: 1, choices: {}, dm});
    // Compose the opening embed and start button
    const embed = new EmbedBuilder()
        .setTitle('🔧 Eclipse‑Bot Setup Wizard')
        .setDescription('Press **Start Setup** to begin configuration.')
        .setColor(0x5865F2);
    const button = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary);
    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(button)]});
}

/**
 * Handles button and menu interactions during the setup flow.
 *
 * Based on the customId of the interaction, this dispatcher will call the
 * appropriate stage handler or progress to the next stage. It also
 * gracefully handles errors, logging them and notifying the user when
 * something goes wrong.
 *
 * @param {Interaction} interaction The interaction from Discord
 * @param {Client} client Discord client instance
 */
export async function handleSetupInteraction(interaction, client) {
    const session = setupSessions.get(interaction.user.id);
    if (!session) return;
    try {
        switch (interaction.customId) {
            // Entry point → prompt to select server
            case 'setup_start':
                return handleServerSelection(interaction, client, session);
            // After server selection, prompt to pick or create a category
            case 'setup_select_guild':
                return handleCategorySelection(interaction, client, session);
            // Category selected or created – record choice then ask DB method
            case 'setup_select_category':
            case 'setup_create_category':
                await handleCategoryChoice(interaction, client, session);
                return askDatabaseSetup(interaction, session);
            // User chose to spin up a Dockerised Mongo instance
            case 'setup_db_docker':
                await handleDockerMongo(interaction, session);
                return askRoles(interaction, session);
            // User chose to manually enter a Mongo URI
            case 'setup_db_manual':
                return askMongoUri(interaction, session);
            // User wants to pick existing roles
            case 'setup_roles_existing':
                return pickExistingRoles(interaction, session, client, 'mod');
            // Moderator role selected → now ask for player role
            case 'setup_roles_select_mod':
                return handleModRoleSelected(interaction, session, client);
            // Player role selected → review configuration
            case 'setup_roles_select_player':
                await handlePlayerRoleSelected(interaction, session);
                return confirmConfig(interaction, session);
            // Auto‑create roles → immediately review configuration
            case 'setup_roles_autocreate':
                await autoCreateRoles(interaction, session, client);
                return confirmConfig(interaction, session);
            // Final confirmation → save and finish
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
            interaction.reply({content: '❌ Setup error, please retry.', flags: 64}).catch(() => {
            });
        }
    }
}

/**
 * Handles plain text messages during setup (used for manual Mongo URI).
 *
 * When the user is asked to enter their Mongo connection string, this
 * function captures the response, stores it in the session, and advances
 * directly to the role selection stage.
 *
 * @param {Message} message The message sent by the user
 */
export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session || session.step !== 'await_mongo_uri') return;
    session.choices.mongoUri = message.content.trim();
    await askRoles(message, session);
}

// Allow other modules (or tests) to inspect active sessions
export {setupSessions};