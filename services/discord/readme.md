# 💬 Discord Service

This folder houses all **Discord-facing logic** for Eclipse‑Bot — including message/event handling, command
registration, role checks, and interactive setup.

It’s designed for modularity, scalability, and clean separation of concerns across different layers of Discord
interaction.

---

## 📁 Structure Overview

| Folder/File                              | Purpose                                                                                                                                    |
|------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| [`initDiscord.mjs`](./initDiscord.mjs)   | Entry point for the Discord bot — logs in, handles events, routes commands, and runs first-time setup:contentReference[oaicite:0]{index=0} |
| [`setupHandler.mjs`](./setupHandler.mjs) | DM-based interactive wizard for initial guild setup (channel, roles, DB config):contentReference[oaicite:1]{index=1}                       |
| [`utilities.mjs`](./utilities.mjs)       | Utility functions for bot messaging, role lookup, and channel-safe communication:contentReference[oaicite:2]{index=2}                      |

---

## 🔗 Submodules

### `commands/`

Handles all **slash** and **text** commands.

- Slash commands are grouped under `/ec`, and loaded dynamically at runtime
- Text commands (e.g. `!me`, `!create_channels`) are executed in the `waiting-room` channel

→ See [`commands/`](./commands/README.md)

---

### `guilds/`

Handles server-specific setup and player interactions in text channels.

- `channelHandler.mjs` routes non-slash messages
- `channels/` subfolder contains logic for creating console, logs, trade, and hint channels

→ See [`guilds/`](./guilds/README.md)

---

### `setup/`

All files used during the **first-time setup wizard**:

- Allows the SuperUser to choose roles, categories, and Mongo options
- Works via DM using buttons and dropdown menus

---

### `users/`

Handles Discord ↔️ MongoDB user mapping.

- Wraps DB operations (`getPlayer`, `saveGuildConfig`, etc.)
- Includes role hierarchy utilities (`getUserRank`, `hasRole`)

---

## 🧠 Lifecycle Summary

1. **Bot starts up** via `initDiscord.mjs`
2. Loads environment + connects to Discord
3. If first time, DMs SUPER_USER_ID with setup wizard
4. Loads all slash/text commands dynamically
5. Listens for `messageCreate` and `interactionCreate`
6. Handles commands and role-based logic cleanly

---

## 📎 Related Docs

- [Root README](../../README.md)
- [Archipelago Service](../archipelago/README.md)
- [System Utilities](../../system/README.md)
