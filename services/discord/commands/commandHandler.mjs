// services/discord/commands/commandHandler.mjs

import {getUser} from '../users/usersHandler.mjs';
import logger from '../../../system/log/logHandler.mjs';

// Static imports for all available commands
import ping from './roles/player/ping.mjs';
import link from './roles/player/link.mjs';
import save from './roles/mod/save.mjs';
import resetdb from './roles/admin/resetDB.mjs';

// Define role ranks
const ROLE_RANKS = {
    player: 1,
    mod: 2,
    owner: 3,
    admin: 3,
};

// Map commands to their handler and required role rank
const commandMap = new Map([
    ['ping', {handler: ping, rank: ROLE_RANKS.player}],
    ['link', {handler: link, rank: ROLE_RANKS.player}],
    ['save', {handler: save, rank: ROLE_RANKS.mod}],
    ['resetdb', {handler: resetdb, rank: ROLE_RANKS.admin}],
]);

/**
 * Registers all statically loaded commands
 */
export async function registerCommandHandlers() {
    logger.info('🧭 Registering Discord commands by role...');
    for (const [name, {rank}] of commandMap.entries()) {
        logger.debug(`↳ Registered !${name} (rank ${rank})`);
    }
    logger.success(`✅ Registered ${commandMap.size} commands.`);
}

/**
 * Handles incoming !commands based on user's role rank
 * @param {import('discord.js').Message} message
 * @param {Object} env
 */
export async function handleUserCommand(message, env) {
    const [cmdName, ...args] = message.content.slice(1).trim().split(/\s+/);
    const commandName = cmdName.toLowerCase();
    const command = commandMap.get(commandName);

    if (!command) {
        return message.reply(`❓ Unknown command: \`${commandName}\``);
    }

    const user = getUser(message.author.id);
    const roles = user?.roles || ['player'];
    const userRank = Math.max(...roles.map((r) => ROLE_RANKS[r] || 0));

    if (userRank < command.rank) {
        return message.reply('🚫 You don’t have permission to use this command.');
    }

    try {
        await command.handler(message, args, env);
    } catch (err) {
        logger.error(`💥 Error in command "${commandName}":`, err);
        await message.reply('⚠️ There was an error running that command.');
    }
}
