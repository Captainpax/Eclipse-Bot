// hint.mjs

/**
 * Handles !hint commands in the hint channel.
 */
export async function handleHintMessage(message, config, client) {
    if (message.author.bot) return;

    const msg = message.content.toLowerCase();

    if (msg.startsWith('!hint ')) {
        const args = msg.split(' ').slice(1);
        const [targetPlayer, ...hintText] = args;
        const hint = hintText.join(' ');

        if (!targetPlayer || !hint) {
            return message.reply('⚠️ Usage: `!hint <playerName> <hint message>`');
        }

        // TODO: Relay to AP server
        return message.reply(`📡 Hint sent to **${targetPlayer}**: "${hint}"`);
    }
}
