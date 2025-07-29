// chat.mjs

/**
 * Handles general chat messages and echo test (!say).
 */
export async function handleChatMessage(message, config, client) {
    if (message.author.bot) return;

    if (message.content.startsWith('!say ')) {
        const echo = message.content.slice(5).trim();
        if (echo.length) {
            return message.channel.send(`📣 ${message.author.displayName}: ${echo}`);
        }
    }
}
