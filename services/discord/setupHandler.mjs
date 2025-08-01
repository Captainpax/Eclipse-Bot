import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import logger from '../../system/log/logHandler.mjs';

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

dotenv.config({override: true});

/**
 * In-memory map of setup sessions per user.
 * @type {Map<string, { step: number|string, choices: Object, dm: import('discord.js').DMChannel }>}
 */
export const setupSessions = new Map();

/**
 * Triggers the first-time setup wizard for the designated SUPER_USER_ID.
 * Sends a DM with a "Start Setup" button.
 * @param {import('discord.js').Client} client
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
        .setColor(0x5865f2);

    const button = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary);

    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(button)]});
}

/**
 * Handles button interactions during the setup wizard flow.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
export async function handleSetupInteraction(interaction, client) {
    const session = setupSessions.get(interaction.user.id);

    if (!session) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ This setup session is no longer active or has expired.',
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
            case 'setup_start':
                return handleServerSelection(interaction, client, session);

            case 'setup_select_guild':
                return handleCategorySelection(interaction, client, session);

            case 'setup_select_category':
            case 'setup_create_category': {
                await handleCategoryChoice(interaction, client, session);
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate();
                }
                return askDatabaseSetup(interaction, session);
            }

            case 'setup_db_docker': {
                await handleDockerMongo(interaction, session);
                return askRoles(interaction, session);
            }

            case 'setup_db_manual':
                return askMongoUri(interaction, session);

            case 'setup_roles_existing':
                return pickExistingRoles(interaction, session, client, 'mod');

            case 'setup_roles_select_mod':
                return handleModRoleSelected(interaction, session, client);

            case 'setup_roles_select_player': {
                await handlePlayerRoleSelected(interaction, session);
                return confirmConfig(interaction, session, client);
            }

            case 'setup_roles_autocreate': {
                await autoCreateRoles(interaction, session, client);
                return confirmConfig(interaction, session, client);
            }

            case 'setup_confirm_config': {
                await finalizeConfig(interaction, session, client);

                setupSessions.delete(interaction.user.id);
                if (interaction.message && interaction.message.deletable) {
                    await interaction.message.delete().catch(() => {
                    });
                }
                return;
            }

            default:
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
 * Handles Mongo URI input via direct message.
 * @param {import('discord.js').Message} message
 */
export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session || session.step !== 'await_mongo_uri') return;

    session.choices.mongoUri = message.content.trim();
    await askRoles(message, session);
}
