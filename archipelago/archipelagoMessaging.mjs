// archipelagoMessaging.mjs

/**
 * Parses and routes Archipelago messages to the appropriate Discord channels.
 *
 * @param {object} packet - The message packet from the Archipelago server.
 * @param {any} client - The connected Archipelago client.
 * @param {any} discordBot - The connected Discord bot instance.
 */
export function handlePacket(packet, client, discordBot) {
    if (!packet) return;

    // Log general messages
    if (packet.cmd === 'Print') {
        const text = packet.text ?? '';
        const lower = text.toLowerCase();

        if (text.includes('has joined the game')) {
            discordBot?.sendToLogChannel(`➕ ${text}`).catch(() => {});
            discordBot?.sendToChatChannel(`➕ ${text}`).catch(() => {});
        } else if (text.includes('has left the game')) {
            discordBot?.sendToLogChannel(`➖ ${text}`).catch(() => {});
            discordBot?.sendToChatChannel(`➖ ${text}`).catch(() => {});
        } else if (lower.includes('trade')) {
            discordBot?.sendToTradeChannel(`🔄 ${text}`).catch(() => {});
        } else if (
            lower.startsWith('hint') ||
            lower.startsWith('hints') ||
            lower.includes('hint points') ||
            lower.includes('each hint') ||
            lower.startsWith('no hints')
        ) {
            discordBot?.sendToHintChannel(`💡 ${text}`).catch(() => {});
        } else if (
            lower.includes(' found ') ||
            lower.includes(' sent ') ||
            lower.includes(' received ') ||
            lower.startsWith('received ') ||
            lower.startsWith('you got')
        ) {
            discordBot?.sendToLogChannel(`✅ ${text}`).catch(() => {});
        } else {
            discordBot?.sendToChatChannel(`💬 ${text}`).catch(() => {});
        }
    }

    // Handle multiple messages in one packet
    if (packet.cmd === 'PrintJSON' && Array.isArray(packet.data)) {
        packet.data.forEach((entry) => {
            if (typeof entry.text === 'string') {
                const text = entry.text;
                discordBot?.sendToChatChannel(`💬 ${text}`).catch(() => {});
            }
        });
    }
}
