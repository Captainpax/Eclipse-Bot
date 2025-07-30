/**
 * Role hierarchy used to determine user power level.
 */
export const ROLE_RANKS = {
    player: 1,
    mod: 2,
    admin: 3,
};

/**
 * Get the rank of a user based on their highest role.
 * This now checks both in-memory roles and linkedGuilds from the DB schema.
 *
 * @param {object} user - Player document from DB
 * @param {string} [guildId] - Optional guild context
 * @returns {number} Role rank (0–3)
 */
export function getUserRank(user, guildId) {
    if (!user) return 0;

    let allRoles = [];
    if (Array.isArray(user.roles)) {
        allRoles = user.roles;
    }

    if (Array.isArray(user.linkedGuilds)) {
        const guildLink = user.linkedGuilds.find(g => g.guildId === guildId);
        if (guildLink?.roles) {
            allRoles = [...allRoles, ...guildLink.roles];
        }
    }

    return allRoles.length
        ? Math.max(...allRoles.map(r => ROLE_RANKS[r] || 0))
        : 0;
}

/**
 * Check if a user has a specific role (DB schema aware).
 *
 * @param {object} user - Player document
 * @param {string} roleName - 'player', 'mod', or 'admin'
 * @param {string} [guildId] - Optional guild scope
 * @returns {boolean}
 */
export function hasRole(user, roleName, guildId) {
    if (!user) return false;

    if (Array.isArray(user.roles) && user.roles.includes(roleName)) return true;

    if (guildId && Array.isArray(user.linkedGuilds)) {
        return user.linkedGuilds.some(
            g => g.guildId === guildId && g.roles.includes(roleName)
        );
    }

    return false;
}

/**
 * Add a role to a user in-memory (to be saved via DB later).
 *
 * @param {object} user
 * @param {string} roleName
 */
export function addRole(user, roleName) {
    if (!Array.isArray(user.roles)) {
        user.roles = [];
    }
    if (!user.roles.includes(roleName)) {
        user.roles.push(roleName);
    }
}

/**
 * Remove a role from a user.
 *
 * @param {object} user
 * @param {string} roleName
 */
export function removeRole(user, roleName) {
    if (!Array.isArray(user.roles)) return;
    user.roles = user.roles.filter(r => r !== roleName);
}

/**
 * Checks if a Discord guild member is a mod or admin based on server config roles.
 * Matches against Discord role IDs stored in config.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {object} config - Guild config from DB
 * @returns {boolean}
 */
export function isAdminOrMod(member, config) {
    if (!member || !config) return false;

    const isAdmin =
        Array.isArray(config.roles?.admin) &&
        config.roles.admin.some(roleId => member.roles.cache.has(roleId));

    const isMod =
        Array.isArray(config.roles?.mod) &&
        config.roles.mod.some(roleId => member.roles.cache.has(roleId));

    return isAdmin || isMod;
}
