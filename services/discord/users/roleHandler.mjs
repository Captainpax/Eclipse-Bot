// services/discord/users/roleHandler.mjs

import {saveUsersToDisk} from './usersHandler.mjs';

// Role hierarchy
export const ROLE_RANKS = {
    player: 1,
    mod: 2,
    owner: 3,
};

/**
 * Gets the rank of a user (based on highest assigned role)
 * @param {object} user
 * @returns {number}
 */
export function getUserRank(user) {
    if (!user || !Array.isArray(user.roles)) return 0;
    return Math.max(...user.roles.map(r => ROLE_RANKS[r] || 0));
}

/**
 * Checks if a user has a specific role
 * @param {object} user
 * @param {string} roleName - "player", "mod", "owner"
 */
export function hasRole(user, roleName) {
    return user?.roles?.includes(roleName);
}

/**
 * Adds a role to a user and saves
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
 * Removes a role from a user and saves
 * @param {object} user
 * @param {string} roleName
 */
export function removeRole(user, roleName) {
    user.roles = user.roles.filter(r => r !== roleName);
    saveUsersToDisk();
}
