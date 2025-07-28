// system/database/databaseHandler.mjs

import {
    initSQLite,
    getUserLink,
    upsertUserLink,
    logMessage,
    logReceivedItem,
    getItemsBySlot,
} from './sqlite/sqliteHandler.mjs';

export function initDatabase() {
    initSQLite();
}

export {
    getUserLink,
    upsertUserLink,
    logMessage,
    logReceivedItem,
    getItemsBySlot,
};
