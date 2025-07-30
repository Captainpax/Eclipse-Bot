import path from 'path';
import fs from 'fs';
import {REST} from 'discord.js';
import {Routes} from 'discord-api-types/v10';
import logger from '../../../system/log/logHandler.mjs';

export class registerCommandHandlers {
    constructor(client, token, clientId, guildId) {
        this.client = client;
        this.token = token;
        this.clientId = clientId;
        this.guildId = guildId;
        this.commands = new Map();
    }

    async register() {
        const commandsDir = path.resolve('./services/discord/commands');
        const commandList = [];

        const readCommands = async (dir) => {
            const entries = fs.readdirSync(dir, {withFileTypes: true});
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await readCommands(fullPath);
                } else if (entry.name.endsWith('.mjs')) {
                    const cmdModule = await import(`file://${fullPath}`);
                    if (cmdModule?.data && cmdModule?.execute) {
                        commandList.push(cmdModule.data.toJSON());
                        this.commands.set(cmdModule.data.name, cmdModule);
                    }
                }
            }
        };
        await readCommands(commandsDir);
        this.client.commands = this.commands;

        const rest = new REST({version: '10'}).setToken(this.token);
        const route = this.guildId
            ? Routes.applicationGuildCommands(this.clientId, this.guildId)
            : Routes.applicationCommands(this.clientId);

        try {
            logger.info(`📡 Registering ${commandList.length} slash command(s)...`);
            await rest.put(route, {body: commandList});
            logger.success(`✅ Slash commands registered successfully (${this.guildId ? 'Guild' : 'Global'})`);
        } catch (error) {
            logger.error(`❌ Failed to register commands: ${error}`);
        }
    }
}
