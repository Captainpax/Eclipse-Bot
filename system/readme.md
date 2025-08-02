# 🧱 System Utilities

This directory contains core infrastructure components shared across Eclipse‑Bot:

- 💾 **Database** layer — manages MongoDB schema & access
- 🪵 **Logging & Error Handling** — centralized logging, backoff/retry, and alerting

These modules support both Discord and Archipelago services with clean separation from bot logic.

---

## 📁 Contents

| Subfolder / File               | Role                                         |
|--------------------------------|----------------------------------------------|
| `database/`                    | MongoDB connection and schema logic          |
| `database/databaseHandler.mjs` | Top‑level API for safe, retry‑aware DB calls |
| `database/mongo/`              | Low‑level Mongoose logic                     |
| `mongo/mongoHandler.mjs`       | Initiates connection & handles retries       |
| `mongo/mongoSchemas.mjs`       | Player, guild, and variant entities          |
| `log/logHandler.mjs`           | Central logger used across services          |

---

## 🧩 Module Overview

### `system/database/`

Acts as a proxy between business logic and raw DB operations:

- Exposes typed API hooks (`upsertPlayer`, `saveGuildConfig`, etc.)
- Applies **exponential backoff** for safe retry on network issues
- Wraps low‑level Mongoose logic via `mongo/`

### `system/database/mongo/`

Encapsulates Mongoose schemas (`player`, `guildConfig`) and runtime constructs:

- Connects to MongoDB using credentials from `.env`
- Handles `reconnect`, `disconnect`, and signal-level cleanup
- Defines `session`​‑aware save/update utilities

### `system/log/`

A generic logger surfaced via `logHandler.mjs` to all services:

- Writes to console and file (with configurable verbosity)
- Captures startup, error, and retry events
- Supports environment-based `LOG_LEVEL` settings

---

## 🔁 Service Interaction

```text
Discord Service  ──↔──  System │ Database │ Log
Archipelago Service ──↔──  System │ Database │ Log
````

Both subservice modules call into the system layer to persist data and emit logs without cycling through Discord or
Archipelago modules.

---

## 🧭 Related Docs

* [Root README](../README.md)
* [Discord Service (bot interface)](../services/discord/README.md)
* [Archipelago Service (game server hosting)](../services/archipelago/README.md)
