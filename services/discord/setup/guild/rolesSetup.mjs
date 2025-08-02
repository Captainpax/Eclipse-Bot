// This file re‑exports the various steps of the guild setup wizard.  Each
// function is defined in its own module to keep concerns separate and
// maintain a clear flow.  Import only the functions you need in your
// slash‑command handlers.

export {startGuildRoleSetup, handleRoleSelectionChoice} from './rolesSelection.mjs';
export {autoCreateRoles} from './roleCreation.mjs';
export {
    askPickModRole,
    handleModRoleSelected,
    askPickPlayerRole,
    handlePlayerRoleSelected
} from './rolePicking.mjs';
export {
    askAssignRoles,
    handleAssignRolesChoice,
    askAssignModMembers,
    handleModMembersSelected,
    askAssignPlayerMembers,
    handlePlayerMembersSelected
} from './roleAssignment.mjs';
export {
    confirmGuildConfig,
    finalizeGuildConfig
} from './finalizeGuildConfig.mjs';