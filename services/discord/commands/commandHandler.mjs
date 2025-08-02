/**
 * 📁 services/discord/commands/commandHandler.mjs
 * ------------------------------------------------
 * Handles dynamic registration of:
 *   - Slash commands grouped under `/ec`
 *   - Text commands
 *
 * ✅ Recursively loads all command modules (supports nested folders)
 * ✅ Preserves command options & permissions
 * ✅ Registers instantly for guild testing (if guildId provided)
 * ✅ Logs details for debugging
 */

import path from 'path';
import fs from 'fs';
import {REST} from 'discord.js';
import {Routes} from 'discord-api-types/v10';
import logger from '../../../system/log/logHandler.mjs';

export class registerCommandHandlers {
    /**
     * @param {import('discord.js').Client} client
     * @param {string} token - Discord bot token
     * @param {string} clientId - Discord application ID
     * @param {string|null} guildId - Guild ID for instant slash registration (optional)
     */
    constructor(client, token, clientId, guildId = null) {
        this.client = client;
        this.token = token;
        this.clientId = clientId;
        this.guildId = guildId;

        this.commands = new Map();
        this.textCommands = new Map();
        this.slashCommands = []; // store proper subcommand data
    }

    /**
     * Recursively loads command files.
     * @param {string} dir
     * @param {'slash'|'text'} type
     */
    async loadCommandsFromDir(dir, type = 'slash') {
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir, {withFileTypes: true});

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await this.loadCommandsFromDir(fullPath, type);
                continue;
            }

            // Skip non-.mjs or handler files
            if (!entry.name.endsWith('.mjs')) continue;
            if (entry.name.includes('commandHandler')) continue;

            try {
                const modulePath = `file://${fullPath}?v=${Date.now()}`;
                const imported = await import(modulePath);
                const cmdModule = imported?.default ?? imported;

                if (type === 'slash' && cmdModule?.data && cmdModule?.execute) {
                    this.commands.set(cmdModule.data.name, cmdModule);
                    this.slashCommands.push(cmdModule.data.toJSON());
                    logger.debug(`✅ [Slash] Loaded command: ${cmdModule.data.name}`);
                } else if (type === 'text' && cmdModule?.name && cmdModule?.execute) {
                    this.textCommands.set(cmdModule.name.toLowerCase(), cmdModule);
                    logger.debug(`💬 [Text] Loaded command: ${cmdModule.name}`);
                } else {
                    logger.warn(`⚠️ Skipped ${entry.name} (missing required exports).`);
                }
            } catch (err) {
                logger.error(`❌ Failed to load command file: ${entry.name} (${err.message})`);
            }
        }
    }

    /**
     * Registers all slash and text commands with Discord API.
     */
    async register() {
        const slashDir = path.resolve('./services/discord/commands');
        const textDir = path.resolve('./services/discord/textCommands');

        logger.info('🔍 Scanning command directories...');
        await this.loadCommandsFromDir(slashDir, 'slash');
        await this.loadCommandsFromDir(textDir, 'text');

        this.client.commands = this.commands;
        this.client.textCommands = this.textCommands;

        const rest = new REST({version: '10'}).setToken(this.token);
        const route = this.guildId
            ? Routes.applicationGuildCommands(this.clientId, this.guildId)
            : Routes.applicationCommands(this.clientId);

        // Build a single root command (`/ec`) that holds all subcommands.
        // Discord expects subcommands to be defined under a parent slash command.
        const rootCommand = {
            name: 'ec',
            description: 'Eclipse‑Bot commands',
            options: this.slashCommands,
        };

        try {
            logger.info(
                `📡 Registering 1 slash command with ${this.slashCommands.length} subcommand(s) (${this.guildId ? 'Guild' : 'Global'})...`,
            );
            await rest.put(route, {body: [rootCommand]});
            logger.success(`✅ Slash commands registered successfully.`);
        } catch (error) {
            logger.error(`❌ Failed to register slash commands: ${error.message}`);
        }

        logger.info(`💬 Loaded ${this.textCommands.size} text command(s).`);
    }
}
