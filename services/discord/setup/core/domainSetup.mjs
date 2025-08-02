import {EmbedBuilder} from 'discord.js';

/**
 * Prompts the user to provide a domain name for Eclipse‑Bot.  The domain
 * typically corresponds to where any web services or API endpoints will be
 * hosted.  The user should reply in DM with a plain domain (e.g.
 * `example.com`).
 *
 * @param {import('discord.js').Interaction|import('discord.js').Message} interactionOrMessage
 * @param {Object} session
 */
export async function askDomain(interactionOrMessage, session) {
    const embed = new EmbedBuilder()
        .setTitle('🌐 Domain Configuration')
        .setDescription('Please provide the domain that Eclipse‑Bot should use.\n\nFor example: `example.com`. Simply reply with your domain name.')
        .setColor(0x3498db);

    // Determine whether to send via interaction followUp or DM.  When
    // called from a button/select handler the parameter will be an
    // interaction; when called from handleSetupMessage it will be a Message.
    if ('reply' in interactionOrMessage && typeof interactionOrMessage.reply === 'function') {
        await interactionOrMessage.followUp({embeds: [embed], flags: 64});
    } else if (session.dm) {
        await session.dm.send({embeds: [embed]});
    }
    session.step = 'await_domain';
}

/**
 * Handles the domain input typed by the user in DM.  Stores the domain in
 * session.choices and then prompts for the port range.
 *
 * @param {import('discord.js').Message} message
 * @param {Object} session
 */
export async function handleDomainInput(message, session) {
    session.choices.domain = message.content.trim();
    // Proceed to port configuration
    const {askPortRange} = await import('./portRangeSetup.mjs');
    return askPortRange(message, session);
}