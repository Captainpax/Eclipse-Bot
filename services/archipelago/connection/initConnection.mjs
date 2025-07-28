import WebSocket from 'ws';
import logger from '../../../system/log/logHandler.mjs';
import {handleSocketEvents} from './socket/socketHandler.mjs';

// Explicit Archipelago message type imports
import adminCommand from '../../archipelago/messaging/type/adminCommand.mjs';
import chat from '../../archipelago/messaging/type/chat.mjs';
import collected from '../../archipelago/messaging/type/collected.mjs';
import connected from '../../archipelago/messaging/type/connected.mjs';
import countdown from '../../archipelago/messaging/type/countdown.mjs';
import disconnected from '../../archipelago/messaging/type/disconnected.mjs';
import goaled from '../../archipelago/messaging/type/goaled.mjs';
import itemCheated from '../../archipelago/messaging/type/itemCheated.mjs';
import itemHinted from '../../archipelago/messaging/type/itemHinted.mjs';
import itemSent from '../../archipelago/messaging/type/itemSent.mjs';
import message from '../../archipelago/messaging/type/message.mjs';
import released from '../../archipelago/messaging/type/released.mjs';
import serverChat from '../../archipelago/messaging/type/serverChat.mjs';
import tagsUpdated from '../../archipelago/messaging/type/tagsUpdated.mjs';
import tutorial from '../../archipelago/messaging/type/tutorial.mjs';
import userCommand from '../../archipelago/messaging/type/userCommand.mjs';

let socketInstance = null;

// Unified handler map
const messageHandlers = {
    adminCommand,
    chat,
    collected,
    connected,
    countdown,
    disconnected,
    goaled,
    itemCheated,
    itemHinted,
    itemSent,
    message,
    released,
    serverChat,
    tagsUpdated,
    tutorial,
    userCommand,
};

/**
 * Connects to an Archipelago multiworld server via WebSocket
 * @param {{
 *   host: string,
 *   slotName: string,
 *   password?: string
 * }} options
 */
export async function createSocketConnection({host, slotName, password}) {
    const url = `ws://${host}`;
    logger.info(`🌐 Connecting to Archipelago server at ${url} as "${slotName}"...`);

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);

        ws.on('open', () => {
            logger.success('🔌 WebSocket connection opened.');

            const connectPacket = {
                cmd: 'Connect',
                name: slotName,
                tags: ['Eclipse-Bot', 'TextOnly'],
                password: password || undefined,
                uuid: null,
                version: {
                    major: 0,
                    minor: 4,
                    build: 4,
                },
            };

            ws.send(JSON.stringify(connectPacket));
        });

        ws.on('message', (data) => {
            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch (err) {
                logger.error('💥 Failed to parse incoming packet:', err);
                return;
            }

            const packets = Array.isArray(parsed) ? parsed : [parsed];
            for (const packet of packets) {
                handleSocketEvents(ws, packet);

                // Archipelago PrintJSON -> Message Event handling
                if (packet.cmd === 'PrintJSON' && Array.isArray(packet.data)) {
                    for (const [key, handler] of Object.entries(messageHandlers)) {
                        if (typeof handler === 'function') {
                            handler(packet, ws); // pass raw packet and socket
                        }
                    }
                }
            }
        });

        ws.on('error', (err) => {
            logger.error('❌ WebSocket error:', err);
            reject(err);
        });

        ws.on('close', (code, reason) => {
            logger.warn(`🔌 WebSocket closed: ${code} - ${reason}`);
        });

        socketInstance = ws;

        setTimeout(() => resolve(ws), 1000);
    });
}

/**
 * Returns the active WebSocket connection
 */
export function getSocket() {
    return socketInstance;
}
