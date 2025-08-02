import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import logger from '../../system/log/logHandler.mjs';

// Core setup imports
import {handleMasterServerSelected, handleMasterServerSelection} from './setup/core/masterServer.mjs';
import {handleAdminCategoryChoice} from './setup/core/adminCategory.mjs';
import {handleDomainInput} from './setup/core/domainSetup.mjs';
import {handlePortRangeInput} from './setup/core/portRangeSetup.mjs';
import {askMongoUri, handleDockerMongo} from './setup/core/databaseSetup.mjs';
import {confirmCoreConfig, finalizeCoreConfig} from './setup/core/finalizeConfig.mjs';

// Guild-level setup imports
import {handleRoleSelectionChoice, startGuildRoleSetup} from './setup/guild/rolesSelection.mjs';
import {
    askPickModRole,
    askPickPlayerRole,
    handleModRoleSelected,
    handlePlayerRoleSelected
} from './setup/guild/rolePicking.mjs';
import {
    askAssignModMembers,
    askAssignPlayerMembers,
    askAssignRoles,
    handleAssignRolesChoice,
    handleModMembersSelected,
    handlePlayerMembersSelected
} from './setup/guild/roleAssignment.mjs';
import {confirmGuildConfig, finalizeGuildConfig} from './setup/guild/finalizeGuildConfig.mjs';

dotenv.config({override: true});

export const setupSessions = new Map();

export async function runFirstTimeSetup(client) {
    const superUserId = process.env.SUPER_USER_ID;
    if (!superUserId) return logger.error('❌ SUPER_USER_ID not set');

    const user = await client.users.fetch(superUserId).catch(() => null);
    if (!user) return logger.error('❌ SuperUser not found');

    const dm = await user.createDM();
    setupSessions.set(user.id, {step: 1, choices: {}, dm});

    const embed = new EmbedBuilder()
        .setTitle('🎩 Eclipse‑Bot Setup Concierge')
        .setDescription('Greetings, esteemed user!\n\nI am your humble Eclipse‑Bot butler, ready to assist with your configuration. Kindly press **Begin Setup** below to proceed.')
        .setColor(0x3498db);

    const button = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🎩 Begin Setup')
        .setStyle(ButtonStyle.Primary);

    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(button)]});
}

export async function handleSetupInteraction(interaction, client) {
    const session = setupSessions.get(interaction.user.id);

    if (!session) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ This setup session has expired. Please restart the wizard.',
                ephemeral: true
            }).catch(() => {
            });
        }
        return;
    }

    try {
        switch (interaction.customId.split(':')[0]) {
            case 'setup_start':
                return handleMasterServerSelection(interaction, client, session);
            case 'setup_select_master':
                return handleMasterServerSelected(interaction, client, session);
            case 'setup_select_admin_category':
            case 'setup_create_admin_category':
                return handleAdminCategoryChoice(interaction, client, session);
            case 'setup_db_docker':
                await handleDockerMongo(interaction, session);
                return confirmCoreConfig(interaction, session, client);
            case 'setup_db_manual':
                return askMongoUri(interaction, session);
            case 'setup_confirm_core':
                await finalizeCoreConfig(interaction, session, client);
                setupSessions.delete(interaction.user.id);
                return;

            case 'guild_roles_start':
                return startGuildRoleSetup(interaction, session, client);
            case 'guild_roles_choice':
                return handleRoleSelectionChoice(interaction, session, client);
            case 'guild_roles_pick_mod':
                return askPickModRole(interaction, session, client);
            case 'guild_roles_selected_mod':
                return handleModRoleSelected(interaction, session, client);
            case 'guild_roles_pick_player':
                return askPickPlayerRole(interaction, session, client);
            case 'guild_roles_selected_player':
                return handlePlayerRoleSelected(interaction, session, client);
            case 'guild_assign_roles':
                return askAssignRoles(interaction, session, client);
            case 'guild_assign_choice':
                return handleAssignRolesChoice(interaction, session, client);
            case 'guild_assign_mod':
                return askAssignModMembers(interaction, session, client);
            case 'guild_selected_mod_members':
                return handleModMembersSelected(interaction, session, client);
            case 'guild_assign_player':
                return askAssignPlayerMembers(interaction, session, client);
            case 'guild_selected_player_members':
                return handlePlayerMembersSelected(interaction, session, client);
            case 'guild_confirm':
                await confirmGuildConfig(interaction, session, client);
                return;
            case 'guild_finalize':
                await finalizeGuildConfig(interaction, session, client);
                setupSessions.delete(interaction.user.id);
                return;

            default:
                logger.warn(`⚠️ Unknown setup step: ${interaction.customId}`);
        }
    } catch (err) {
        logger.error(`❌ Setup step failed: ${err.message}`);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({content: '❌ Setup error, please retry.', ephemeral: true}).catch(() => {
            });
        }
    }
}

export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session) return;

    switch (session.step) {
        case 'await_domain':
            return handleDomainInput(message, session);
        case 'await_port_range':
            return handlePortRangeInput(message, session);
        case 'await_mongo_uri':
            session.choices.mongoUri = message.content.trim();
            return confirmCoreConfig(message, session);
        case 'await_admin_category_name': {
            const mod = await import('./setup/core/adminCategory.mjs');
            return mod.handleNewAdminCategoryName(message, session, message.client);
        }
        default:
            return;
    }
}