// services/discord/users/roleHandler.mjs

import {saveUsersToDisk} from './usersHandler.mjs';

/**
 * Role hierarchy used to determine user power level.
 */
export const ROLE_RANKS = {
    player: 1,
    mod: 2,
    owner: 3,
};

/**
 * Get the rank of a user based on their highest role.
 * @param {object} user - The user object
 * @returns {number} Role rank (0–3)
 */
export function getUserRank(user) {
    if (!user || !Array.isArray(user.roles)) return 0;
    return Math.max(...user.roles.map(r => ROLE_RANKS[r] || 0));
}

/**
 * Check if a user has a specific role.
 * @param {object} user
 * @param {string} roleName - One of: 'player', 'mod', 'owner'
 * @returns {boolean}
 */
export function hasRole(user, roleName) {
    return user?.roles?.includes(roleName);
}

/**
 * Add a role to a user and persist it.
 * @param {object} user
 * @param {string} roleName
 */
export function addRole(user, roleName) {
    if (!user.roles.includes(roleName)) {
        user.roles.push(roleName);
        saveUsersToDisk();
    }
}

/**
 * Remove a role from a user and persist the change.
 * @param {object} user
 * @param {string} roleName
 */
export function removeRole(user, roleName) {
    user.roles = user.roles.filter(r => r !== roleName);
    saveUsersToDisk();
}

/**
 * Checks if the Discord member is a mod or owner based on config.
 * @param {import('discord.js').GuildMember} member
 * @param {object} config
 * @returns {boolean}
 */
export function isAdminOrMod(member, config) {
    return (
        member.id === config.adminId ||
        member.roles.cache.has(config.modRoleId)
    );
}
