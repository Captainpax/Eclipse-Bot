# 🗄️ system/database/

This layer provides a **trusted, retry‑aware gateway** that shields both the Discord and Archipelago services from
low‑level MongoDB logic — while keeping your files neatly organized.

It abstracts away Mongoose details and ensures that database operations are **reliable**, **logged**, and **safe**
against connection issues.

---

## 🧾 Contents

| File / Folder         | Role                                                  |
|-----------------------|-------------------------------------------------------|
| `databaseHandler.mjs` | Type-safe, retry-wrapped access to your models        |
| `mongo/`              | Mongoose-based schema definitions and low-level logic |

---

## ⚙️ databaseHandler API (through `database/databaseHandler.mjs`)

- `upsertPlayer(userData)` – inserts or updates a player
- `getPlayer(discordId)` – retrieves a player by Discord identifier
- `listPlayers()` – returns all players in the guild
- `saveGuildConfig(config)` – persists server configuration
- `getGuildConfig(guildId)` – retrieves guild config from DB
- `logReceivedItem(logEntry)` – records an item/trade/received event
- `addServerInstance(entry)` – tracks active AP instances per guild
- `addPlayerToServer(playerId, serverId)` – links a player to a server instance

These functions:

- Handle **exponential backoff retries** (on Mongo network errors)
- Log all attempts via `system/log/logHandler`
- Return failures as typed `DatabaseError` objects or normalized results
- Are automatically exported for use by bot and AP services

---

## 🧩 How It Works

1. **Initializer** (`databaseHandler`) checks `MONGO_URI` + credentials from `.env`.
2. It **owns** one connection pool with mongoose (via `mongo/mongoHandler.mjs`).
3. Each exported function invokes a **tracing wrapper**:
    - Logs the start and end of operation
    - Retries on failure up to 4 times, using jittered backoff
    - Wraps exceptions in a standardized `DatabaseError` type
4. **Consumers** (Discord slash commands, AP event handlers) simply call into this API — with no direct Mongoose
   knowledge or password exposure.

---

## 🚚 Usage Example

```js
import db from '../system/database/databaseHandler.js';

await db.upsertPlayer({
    discordId: '123456789',
    username: 'Pax',
    role: 'player',
});

const guildConfig = await db.getGuildConfig('987654321');

// In case of small network failure, this call will back off and retry silently:
await db.saveGuildConfig({guildId, channelIds: {...}, roles: {...}});
```

---

## 🔍 Configuration & Best Practices

- Read database credentials from `.env`:
  ```env
  MONGO_URI=...
  MONGO_USER=...
  MONGO_PASS=...
  ```
- In **production**, set `OEM` log level to include `Mongoose` traces and retries.
- Always call the **safe wrapper**, never import Mongoose directly from other modules.
- Each function returns either a valid result or an object like:
  ```js
  { error: true, code: 'DB_RETRY_FAILED', message: '...' }
  ```

---

## 📎 Related Docs

- [Root README](../../README.md)
- [Mongo Submodule](./mongo/README.md)
- [Logging System](../log/README.md)
