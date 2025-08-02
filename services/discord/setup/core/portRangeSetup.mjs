import {EmbedBuilder} from 'discord.js';

/**
 * Prompts the user to specify a port or a range of ports for Eclipse‑Bot to
 * utilise.  Users can provide a single port (e.g. `8080`) or a range
 * separated by a hyphen (e.g. `3000-3010`).
 *
 * @param {import('../../Downloads/discord.mjs').Interaction|import('discord.js').Message} interactionOrMessage
 * @param {Object} session
 */
export async function askPortRange(interactionOrMessage, session) {
    const embed = new EmbedBuilder()
        .setTitle('🔢 Port Range Configuration')
        .setDescription('Please specify the port or range of ports Eclipse‑Bot should use.\n\nFor example: `8080` or `3000-3010`. Simply reply with your desired port or range.')
        .setColor(0x3498db);

    if ('reply' in interactionOrMessage && typeof interactionOrMessage.reply === 'function') {
        await interactionOrMessage.followUp({embeds: [embed], flags: 64});
    } else if (session.dm) {
        await session.dm.send({embeds: [embed]});
    }
    session.step = 'await_port_range';
}

/**
 * Handles the user's port range input.  The raw text is stored in
 * session.choices.portRange.  We do not perform parsing here; any
 * validation can be added in future iterations.  After collecting the
 * port range, we move to the database setup step.
 *
 * @param {import('../../Downloads/discord.mjs').Message} message
 * @param {Object} session
 */
export async function handlePortRangeInput(message, session) {
    session.choices.portRange = message.content.trim();
    // Proceed to database setup
    const {askDatabaseSetup} = await import('./databaseSetup.mjs');
    return askDatabaseSetup(message, session);
}