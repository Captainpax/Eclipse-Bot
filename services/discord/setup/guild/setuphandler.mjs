import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import logger from '../../../../system/log/logHandler.mjs';

// New setup flow imports.  These modules handle each discrete step of the core
// setup wizard.  They encapsulate the logic for prompting the user, capturing
// their choices and progressing to the next step.  Each module lives under
// `services/discord/setup/core` or `services/discord/setup/guild` as
// appropriate.
import {handleMasterServerSelected, handleMasterServerSelection} from './setup/core/masterServer.mjs';
import {handleAdminCategoryChoice} from './setup/core/adminCategory.mjs';
import {handleDomainInput} from './setup/core/domainSetup.mjs';
import {handlePortRangeInput} from './setup/core/portRangeSetup.mjs';
import {askMongoUri, handleDockerMongo} from './setup/core/databaseSetup.mjs';
import {confirmCoreConfig, finalizeCoreConfig} from './setup/core/finalizeConfig.mjs';

// Guild-level role setup imports.  These functions orchestrate the
// per‑guild configuration wizard, including role creation/selection and
// optional assignment to members.  They will be invoked when handling
// interactions with `customId` beginning with `guild_`.
import {
    finalizeGuildConfig,
    handleAssignRolesChoice,
    handleModMembersSelected,
    handleModRoleSelected,
    handlePlayerMembersSelected,
    handlePlayerRoleSelected,
    handleRoleSelectionChoice
} from './setup/guild/rolesSetup.mjs';

dotenv.config({override: true});

/**
 * In-memory map of setup sessions per user.  Each session tracks the
 * conversation state (`step`), the user's choices and a reference to their
 * DM channel.  This map is keyed by the user's ID so that concurrent
 * sessions do not interfere with each other.
 * @type {Map<string, { step: string|number, choices: Object, dm: import('discord.js').DMChannel }>}
 */
export const setupSessions = new Map();

/**
 * Triggers the first-time setup wizard for the designated SUPER_USER_ID.
 * Sends a DM with a "Begin Setup" button.  The copy here has been
 * refreshed to feel like a helpful butler guiding the user through
 * configuration.
 * @param {import('discord.js').Client} client
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

    const dm = await user.createDM();
    setupSessions.set(user.id, {step: 1, choices: {}, dm});

    // Compose an elegant welcome embed befitting a digital butler.  We use a
    // blue accent colour to match the bot's theme and a more formal tone.
    const embed = new EmbedBuilder()
        .setTitle('🎩 Eclipse‑Bot Setup Concierge')
        .setDescription('Greetings, esteemed user!\n\nI am your humble Eclipse‑Bot butler, at your service to assist with the initial configuration of your guild. When you are ready to begin this distinguished process, kindly press **Begin Setup** below.')
        .setColor(0x3498db);

    const button = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🎩 Begin Setup')
        .setStyle(ButtonStyle.Primary);

    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(button)]});
}

/**
 * Handles button interactions during the setup wizard flow.  Each branch
 * delegates to one of the step handlers defined under the `setup/core` or
 * `setup/guild` folders.  Unknown customIds are logged as warnings.
 * @param {import('discord.js').ButtonInteraction|import('discord.js').SelectMenuInteraction} interaction
 * @param {import('discord.js').Client} client
 */
export async function handleSetupInteraction(interaction, client) {
    const session = setupSessions.get(interaction.user.id);

    if (!session) {
        // Session expired or invalid.  Inform the user politely and clean up
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ This setup session has expired. Please restart the wizard.',
                ephemeral: true
            }).catch(() => {
            });
        }
        logger.warn(`⚠️ Ignored expired or missing setup session for user ${interaction.user.id}`);
        if (interaction.message && interaction.message.deletable) {
            await interaction.message.delete().catch(() => {
            });
        }
        return;
    }

    try {
        switch (interaction.customId) {
            // Start the wizard by selecting the master server
            case 'setup_start':
                return handleMasterServerSelection(interaction, client, session);

            // The user has selected a master server from the select menu
            case 'setup_select_master':
                return handleMasterServerSelected(interaction, client, session);

            // The user is choosing or creating the admin category
            case 'setup_select_admin_category':
            case 'setup_create_admin_category':
                return handleAdminCategoryChoice(interaction, client, session);

            // Database choice buttons
            case 'setup_db_docker': {
                await handleDockerMongo(interaction, session);
                // After selecting Docker, we can proceed straight to confirmation
                return confirmCoreConfig(interaction, session, client);
            }
            case 'setup_db_manual':
                // Ask the user for their Mongo URI in DM
                return askMongoUri(interaction, session);

            // Confirmation of the core setup.  Once confirmed, the session is removed.
            case 'setup_confirm_core': {
                await finalizeCoreConfig(interaction, session, client);
                setupSessions.delete(interaction.user.id);
                if (interaction.message && interaction.message.deletable) {
                    await interaction.message.delete().catch(() => {
                    });
                }
                return;
            }

            // Guild-level setup interactions.  These identifiers are used
            // throughout the guild role setup wizard.  We delegate to the
            // corresponding functions imported from the guild setup modules.
            case 'guild_roles_autocreate':
            case 'guild_roles_existing':
                return handleRoleSelectionChoice(interaction, session, client);

            case 'guild_select_mod_role':
                return handleModRoleSelected(interaction, session);

            case 'guild_select_player_role':
                return handlePlayerRoleSelected(interaction, session);

            case 'guild_assign_roles_yes':
            case 'guild_assign_roles_no':
                return handleAssignRolesChoice(interaction, session);

            case 'guild_assign_mod_members':
                return handleModMembersSelected(interaction, session);

            case 'guild_assign_player_members':
                return handlePlayerMembersSelected(interaction, session);

            case 'guild_confirm':
                await finalizeGuildConfig(interaction, session);
                setupSessions.delete(interaction.user.id);
                return;

            default:
                // Unknown interaction; log and ignore
                logger.warn(`⚠️ Unknown setup step: ${interaction.customId}`);
        }
    } catch (err) {
        logger.error(`❌ Setup step failed: ${err.message}`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({content: '❌ Setup error, please retry.', flags: 64}).catch(() => {
            });
        }
    }
}

/**
 * Handles free‑form DM messages from the user during the setup process.  After
 * certain prompts (e.g. entering a domain or port range), we need to capture
 * the next message and pass it along to the appropriate handler.  The
 * `session.step` property determines which handler should be invoked.
 * @param {import('discord.js').Message} message
 */
export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session) return;

    switch (session.step) {
        case 'await_domain': {
            // Capture domain and move to port range
            await handleDomainInput(message, session);
            return;
        }
        case 'await_port_range': {
            // Capture port range and move to database setup
            await handlePortRangeInput(message, session);
            return;
        }
        case 'await_mongo_uri': {
            // Save custom Mongo URI and present confirmation
            session.choices.mongoUri = message.content.trim();
            return confirmCoreConfig(message, session);
        }
        case 'await_admin_category_name': {
            // Create a new admin category with the provided name
            const mod = await import('./setup/core/adminCategory.mjs');
            await mod.handleNewAdminCategoryName(message, session, message.client);
            return;
        }
        default:
            // Ignore messages not part of the wizard
            return;
    }
}