// discord/discordCommands.mjs

import { SlashCommandBuilder } from 'discord.js';
import { linkSlot, getLinkedSlots, initUserDB } from './discordUsers.mjs';

// Ensure DB is initialized
initUserDB();

/**
 * Define all slash commands in one place. Easy to add more later.
 */
const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with Pong!'),
        /**
         * @param {import('discord.js').ChatInputCommandInteraction} interaction
         */
        async execute(interaction) {
            await interaction.reply({
                content: '🏓 Pong!',
                flags: 1 << 6 // Use FLAGS.Ephemeral manually to suppress deprecation warning
            });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('link')
            .setDescription('Link your Discord account to a game slot')
            .addStringOption(option =>
                option.setName('slot')
                    .setDescription('The Archipelago slot name to link')
                    .setRequired(true)
            ),
        /**
         * @param {import('discord.js').ChatInputCommandInteraction} interaction
         */
        async execute(interaction) {
            const userId = interaction.user.id;
            const slot = interaction.options.getString('slot');

            try {
                const success = await linkSlot(userId, slot);
                if (success) {
                    await interaction.reply({
                        content: `✅ Linked slot \`${slot}\` to your Discord account.`,
                        flags: 1 << 6
                    });
                } else {
                    throw new Error('Link failed');
                }
            } catch (err) {
                console.error('Failed to link slot:', err);
                await interaction.reply({
                    content: '❌ Failed to link slot. Please try again later.',
                    flags: 1 << 6
                });
            }
        }
    }
];

/**
 * Returns all slash commands with their data and handler.
 * @returns {Array<{data: SlashCommandBuilder, execute: Function}>}
 */
export function getSlashCommands() {
    return commands;
}

/**
 * Central handler to dispatch commands based on name.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
export async function handleInteraction(interaction) {
    const command = commands.find(c => c.data.name === interaction.commandName);
    if (!command) {
        await interaction.reply({
            content: 'Unknown command.',
            ephemeral: true
        });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error('Error executing command:', err);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'There was an error executing this command.',
                ephemeral: true
            });
        }
    }
}
