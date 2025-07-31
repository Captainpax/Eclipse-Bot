/**
 * 📁 services/discord/commands/commandHandler.mjs
 * ------------------------------------------------
 * Handles dynamic registration of:
 *   - Slash commands (/commands)
 *   - Text commands (!commands or plain words)
 *
 * ✅ Recursively loads all command modules
 * ✅ Registers slash commands via Discord REST API
 * ✅ Supports modular text command files
 * ✅ Logs success/errors with debug info
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

        this.commands = new Map();      // Slash commands
        this.textCommands = new Map();  // Text commands
    }

    /**
     * Recursively reads a directory and dynamically imports .mjs command files.
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

            if (!entry.name.endsWith('.mjs')) continue;
            if (entry.name.startsWith('_') || entry.name === 'index.mjs') continue;

            try {
                // Bust Node's import cache to support live reload
                const modulePath = `file://${fullPath}?v=${Date.now()}`;
                const cmdModule = await import(modulePath);

                if (type === 'slash' && cmdModule?.data && cmdModule?.execute) {
                    this.commands.set(cmdModule.data.name, cmdModule);
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

        // Attach loaded commands to client
        this.client.commands = this.commands;
        this.client.textCommands = this.textCommands;

        // Build array for API
        const commandList = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
        logger.debug(`📦 Slash commands loaded: ${Array.from(this.commands.keys()).join(', ') || 'None'}`);
        logger.debug(`📦 Text commands loaded: ${Array.from(this.textCommands.keys()).join(', ') || 'None'}`);

        // Prepare REST
        const rest = new REST({version: '10'}).setToken(this.token);
        const route = this.guildId
            ? Routes.applicationGuildCommands(this.clientId, this.guildId)
            : Routes.applicationCommands(this.clientId);

        try {
            logger.info(`📡 Registering ${commandList.length} slash command(s) (${this.guildId ? 'Guild' : 'Global'})...`);
            await rest.put(route, {body: commandList});
            logger.success(`✅ Slash commands registered successfully (${this.guildId ? 'Guild' : 'Global'})`);
        } catch (error) {
            logger.error(`❌ Failed to register slash commands: ${error.message}`);
        }

        logger.info(`💬 Loaded ${this.textCommands.size} text command(s).`);
    }
}
