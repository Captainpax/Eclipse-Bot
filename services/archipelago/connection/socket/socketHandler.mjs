// services/archipelago/connection/socket/socketHandler.mjs

import logger from '../../../../system/log/logHandler.mjs';

// 🔁 Basic lifecycle events
import onConnected from './event/connected.mjs';
import onDisconnected from './event/disconnected.mjs';
import onConnectionRefused from './event/connectionRefused.mjs';
import onInvalidPacket from './event/invalidPacket.mjs';

// 📦 Data packet events
import onReceivedPacket from './event/receivedPacket.mjs';
import onSentPackets from './event/sentPackets.mjs';

// 📡 Info and updates
import onRoomInfo from './event/roomInfo.mjs';
import onRoomUpdate from './event/roomUpdate.mjs';
import onDataPackage from './event/dataPackage.mjs';
import onLocationInfo from './event/locationInfo.mjs';

// 📬 Messaging + item handling
import onPrintJSON from './event/printJSON.mjs';
import onReceivedItems from './event/receivedItems.js';
import onSetReply from './event/setReply.mjs';
import onRetrieved from './event/retrieved.mjs';
import onBounced from './event/bounced.mjs';

/**
 * Routes Archipelago socket events to their appropriate handler
 * @param {import('@archipelago-multi/client').ArchipelagoSocket} socket
 */
export function handleSocketEvents(socket) {
    logger.debug('🧠 Registering Archipelago socket event listeners...');

    socket.addListener('Connected', onConnected);
    socket.addListener('Disconnected', onDisconnected);
    socket.addListener('ConnectionRefused', onConnectionRefused);
    socket.addListener('InvalidPacket', onInvalidPacket);

    socket.addListener('ReceivedPacket', onReceivedPacket);
    socket.addListener('SentPackets', onSentPackets);

    socket.addListener('RoomInfo', onRoomInfo);
    socket.addListener('RoomUpdate', onRoomUpdate);
    socket.addListener('DataPackage', onDataPackage);
    socket.addListener('LocationInfo', onLocationInfo);

    socket.addListener('PrintJSON', onPrintJSON);
    socket.addListener('ReceivedItems', onReceivedItems);
    socket.addListener('SetReply', onSetReply);
    socket.addListener('Retrieved', onRetrieved);
    socket.addListener('Bounced', onBounced);
}
