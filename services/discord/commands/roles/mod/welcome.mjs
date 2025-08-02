import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandSubcommandBuilder,} from 'discord.js';
import logger from '../../../../../system/log/logHandler.mjs';

/**
 * Sends the welcome message in the waiting room channel.
 * @param {import('discord.js').Client} client - The Discord bot client.
 * @param {Object} config - The guild config object containing waitingRoomChannelId, etc.
 * @returns {Promise<boolean>} - Whether the message was sent successfully.
 */
export async function sendWelcomeMessage(client, config) {
    if (!client || !config) {
        logger.error('❌ sendWelcomeMessage called without client or config');
        return false;
    }

    const waitingRoomId = config.channels?.waitingRoom?.[0] || config.waitingRoomChannelId;
    if (!waitingRoomId) {
        logger.error('❌ Waiting room channel ID missing from config.');
        return false;
    }

    const channel = await client.channels.fetch(waitingRoomId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        logger.error(`❌ Failed to fetch waiting room channel (${waitingRoomId}) or it is not text-based.`);
        return false;
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📢 Welcome to the Eclipse Game Lobby')
        .setDescription('Get ready to join the next game! Use the buttons below to sign up or view game info.')
        .setFooter({text: 'Eclipse-Bot Waiting Room'})
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('signup_me').setLabel('🎮 I’m In!').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('show_info').setLabel('📘 Game Info').setStyle(ButtonStyle.Secondary),
    );

    try {
        await channel.send({embeds: [embed], components: [row]});
        logger.success(`✅ Sent welcome message to waiting room: ${waitingRoomId}`);
        return true;
    } catch (err) {
        logger.error(`❌ Failed to send welcome message: ${err.message}`);
        return false;
    }
}

/**
 * Slash subcommand definition and handler for `/ec welcome`.
 * This wraps the welcome message helper into a slash command so users can trigger
 * the waiting‑room welcome embed manually. The command will send the welcome
 * embed in the channel where it is invoked, using that channel as the waiting room.
 */
export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('welcome')
        .setDescription('Send the waiting‑room welcome message to this channel.'),

    /**
     * Executes the `/ec welcome` subcommand. Attempts to send the welcome embed
     * into the current channel by constructing a minimal config that points
     * the waitingRoomChannelId to the invoking channel. Replies with a success
     * or failure message.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        try {
            // Build a minimal config object pointing the waiting room ID to this channel.
            const config = {
                waitingRoomChannelId: interaction.channelId,
                channels: {waitingRoom: [interaction.channelId]},
            };

            const sent = await sendWelcomeMessage(interaction.client, config);

            if (sent) {
                await interaction.reply({
                    content: '✅ Welcome message sent to this channel.',
                    flags: 64, // Ephemeral reply so only the invoker sees it
                });
            } else {
                await interaction.reply({
                    content:
                        '❌ Failed to send the welcome message. Please ensure the bot has permission to send messages here.',
                    flags: 64,
                });
            }
        } catch (err) {
            logger.error(`🔥 /ec welcome command error: ${err.message}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction
                    .reply({
                        content: '❌ There was an error executing this command.',
                        flags: 64,
                    })
                    .catch(() => {
                    });
            }
        }
    },
};
