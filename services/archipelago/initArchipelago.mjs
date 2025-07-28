// services/archipelago/initArchipelago.mjs

import {createSocketConnection} from './connection/initConnection.mjs';
import logger from '../../system/log/logHandler.mjs';

/**
 * Initializes Archipelago connection and listeners
 * @param {Object} env - Environment variables
 */
export default async function initArchipelago(env) {
    logger.info('🌐 Initializing Archipelago connection...');

    const {ARCHIPELAGO_SERVER, ARCHIPELAGO_SLOT, ARCHIPELAGO_PASSWORD} = env;

    try {
        await createSocketConnection({
            host: ARCHIPELAGO_SERVER,
            slotName: ARCHIPELAGO_SLOT,
            password: ARCHIPELAGO_PASSWORD,
        });

        logger.success(`✅ Connected to Archipelago as "${ARCHIPELAGO_SLOT}"`);
    } catch (err) {
        logger.error('❌ Failed to connect to Archipelago:', err);
        throw err;
    }
}
