// archipelago/archipelagoUtilities.mjs

import logger from '../logger.mjs';

/**
 * Registers core Archipelago event listeners on the bot's client.
 * @param {import('./archipelago.mjs').default} bot - The ArchipelagoBot instance
 */
export function registerArchipelagoEvents(bot) {
    const client = bot.client;
    if (!client) {
        logger.error('Cannot register Archipelago events: client is null');
        return;
    }

    const possibleEmitters = [
        client.events,
        client.network,
        client.connection,
        client.messages
    ];

    const eventEmitter = possibleEmitters.find(em => em?.on);
    if (!eventEmitter) {
        logger.error('[archipelagoUtilities] No event emitter found on client');
        logger.debug('Available keys:', Object.keys(client));
        return;
    }

    logger.debug(`Using Archipelago emitter: ${eventEmitter.constructor?.name || 'Unknown'}`);

    eventEmitter.on('SocketClosed', ({ code, reason }) => {
        bot.connected = false;
        logger.warn(`Disconnected from Archipelago (code ${code}): ${reason || 'no reason provided'}`);
    });

    eventEmitter.on('Error', (err) => {
        logger.error('Archipelago client error:', err);
    });

    eventEmitter.on('ConnectionRefused', (errors) => {
        const message = Array.isArray(errors)
            ? errors.join(', ')
            : errors?.errors?.join(', ') || 'unknown reasons';
        logger.error(`Connection refused by server: ${message}`);
    });
}
