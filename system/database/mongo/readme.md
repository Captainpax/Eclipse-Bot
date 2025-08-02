# 🌿 system/database/mongo/

This folder contains all low‑level **Mongoose schemas, models, and connection logic** for use by `databaseHandler.mjs`.

These files should _never_ be imported outside the system layer — they expose raw schemas and database internals.

---

## 🧱 Structure & Main Files

| File               | Description                                               |
|--------------------|-----------------------------------------------------------|
| `mongoSchemas.mjs` | Defines `Player`, `GuildConfig`, `ServerInstance` schemas |
| `mongoHandler.mjs` | Establishes connection, handles retries, onClose signals  |

---

## 🧵 Schemas at a Glance

- **Player**
    - `discordId`: String, indexed
    - `username`: String
    - `role`: `'player' | 'mod' | 'admin'`
    - `serverId`: ObjectId (optional)
    - *Timestamps*: `createdAt`, `updatedAt`

- **GuildConfig**
    - `guildId`: String, unique
    - `portalHost`, `portRange`, `channelsMap`, `rolesMap`, `phase`: configuration metadata
    - `instances`: list of running AP servers (with `channelId`, `lang`, `currentGame`)

- **ServerInstance**
    - Embeds per server-instance data like slot config, host, map seed

---

## ⚡ Connection Logic (`mongoHandler.mjs`)

- Expects environment vars: `MONGO_URI`, `MONGO_USER`, `MONGO_PASS`
- Uses `mongoose.connect()` with options:
    - `useNewUrlParser`, `useUnifiedTopology`
    - `autoIndex`: disabled in production
- Handles:
    - `reconnect`, `disconnect`, `SIGINT` / `SIGTERM`, and cleans up appropriately
    - Logging via `logHandler` when connections fail or need reconnect

Example:

```js
await mongoose.connect(MONGO_URI, { user: MONGO_USER, pass: MONGO_PASS });
mongoose.on('connected', () => log.info('Mongo connected'));
mongoose.on('error', (err) => log.warn('Mongo error', { err }));
```

---

## 🚀 Performing DB Operations

```js
import mongoose from 'mongoose';
import { PlayerModel, GuildConfigModel, ServerInstanceModel } from './mongoSchemas.mjs';

async function upsertPlayer(playerData) {
  const filter = { discordId: playerData.discordId };
  const update = { $set: playerData };
  const player = await PlayerModel.findOneAndUpdate(filter, update, {
    new: true, upsert: true, timestamps: true
  });
  return player.toObject();
}
```

> ✅ Use these raw schema methods *only* within the system layer.

---

## 🧾 Best Practices

1. **Model only what you store** — derived fields like `player.serverId` should be updated via API calls (never via
   consumers).
2. **Avoid versioned schemas** — if you change types, write migration scripts instead of reindexing production data.
3. **Ensure timestamps are enabled** on all schemas for auditability.
4. **Always log events**:
   ```js
   log.trace('Mongo method upsertPlayer succeeded', { discordId, guildId });
   ```
5. **Watch for deprecated warnings** and upgrade Mongoose carefully when bumping Node.js versions.

---

## 📎 Related Reads

- [Proxy Layer (`databaseHandler.mjs`)](../databaseHandler.mjs)
- [Log Module](../../log/logHandler.mjs)
- [Project Root README](../../README.md)
