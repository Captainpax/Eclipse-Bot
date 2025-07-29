// trade.mjs

/**
 * Handles !send commands in the trade channel.
 */
export async function handleTradeMessage(message, config, client) {
    if (message.author.bot) return;

    const msg = message.content.toLowerCase();

    if (msg.startsWith('!send ')) {
        const args = msg.split(' ').slice(1);
        const [item, , recipient] = args;

        if (!item || !recipient) {
            return message.reply('⚠️ Usage: `!send <item> to <playerName>`');
        }

        // TODO: Implement AP item send logic
        return message.reply(`📦 Sending **${item}** to **${recipient}**...`);
    }
}
