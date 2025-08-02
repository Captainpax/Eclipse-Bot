# 🌐 Archipelago Service

This module manages the integration between Eclipse‑Bot and [Archipelago](https://archipelago.gg) multiworld servers. It
connects via WebSocket, routes messages, interprets events, and handles reconnect logic.

---

## 📁 Structure Overview

| File/Folder                                    | Purpose                                                                                                           |
|------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| [`initArchipelago.mjs`](./initArchipelago.mjs) | Top-level entry to establish an AP connection based on environment variables:contentReference[oaicite:0]{index=0} |
| [`connection/`](./connection)                  | Manages WebSocket creation, reconnection, and socket event delegation                                             |
| [`messaging/`](./messaging)                    | Interprets PrintJSON messages from AP and turns them into Discord embeds                                          |
| [`utilities.mjs`](./utilities.mjs)             | Resolves mentions, filters duplicate messages, parses slot names:contentReference[oaicite:1]{index=1}             |

---

## 🔌 Connection Lifecycle

### 1. `initArchipelago.mjs`

```js
await createSocketConnection({
  host: env.ARCHIPELAGO_SERVER,
  slotName: env.ARCHIPELAGO_SLOT,
  password: env.ARCHIPELAGO_PASSWORD
});
````

Initiates a connection and registers the bot’s slot on the server.

### 2. `connection/initConnection.mjs`

* Opens WebSocket connection to the host
* Sends a `Connect` packet
* Forwards all socket messages to `socketHandler`
* If the packet is `PrintJSON`, invokes handlers in `messaging/type/`

### 3. `connection/retryConnection.mjs`

If the connection drops or fails, `retryConnection()` will automatically:

* Retry up to 5 times
* Back off progressively
* Log status and success/failure messages

---

## 💬 Messaging & Embeds

### `messaging/messageHandler.mjs`

Listens for `PrintJSON` events and sends embeds to the correct Discord channel:

| Event Type           | Discord Channel |
|----------------------|-----------------|
| Player joined/left   | `chat`, `log`   |
| Item traded/received | `trade`, `log`  |
| Hints used/found     | `hint`, `log`   |
| Generic message      | `chat`          |

It uses:

* `isDuplicateMessage()` to skip repeats
* `getUserMentionsFromText()` to tag players by slot name

---

## 📎 Related Modules

* [Discord Service](../discord/README.md)
* [System Logging](../../system/log/logHandler.mjs)

---

## 📌 Notes

* Each `PrintJSON` message is parsed and tagged intelligently using the message text itself.
* Slot → Discord mappings are resolved from MongoDB's `players` collection.
* The bot always connects using the `TextOnly` and `Eclipse-Bot` tags to avoid unintended game behavior.


