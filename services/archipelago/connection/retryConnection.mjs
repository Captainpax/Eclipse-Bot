// services/archipelago/connection/retryConnection.mjs

import logger from '../../../system/logHandler.mjs';
import {createSocketConnection} from './initConnection.mjs';

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // in ms
let retryTimer = null;

/**
 * Attempts to reconnect to Archipelago after failure/disconnect
 * @param {{
 *   host: string,
 *   slotName: string,
 *   password?: string
 * }} options
 */
export function retryConnection(options) {
    if (retryCount >= MAX_RETRIES) {
        logger.error('🛑 Max reconnection attempts reached. Giving up.');
        return;
    }

    if (retryTimer) {
        clearTimeout(retryTimer);
    }

    retryCount++;
    const delay = RETRY_INTERVAL * retryCount;

    logger.warn(`🔁 Reconnection attempt #${retryCount} in ${delay / 1000}s...`);

    retryTimer = setTimeout(async () => {
        try {
            await createSocketConnection(options);
            logger.success('✅ Reconnected to Archipelago successfully!');
            retryCount = 0;
        } catch (err) {
            logger.error(`❌ Retry #${retryCount} failed:`, err.message || err);
            retryConnection(options); // try again
        }
    }, delay);
}

/**
 * Cancels any scheduled retry (e.g., when manual reconnect succeeds)
 */
export function cancelRetry() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
        retryCount = 0;
        logger.debug('🔕 Reconnection timer cleared.');
    }
}
