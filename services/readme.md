# 🧩 services/

This directory contains the **runtime logic** for Eclipse-Bot — broken into modular services that handle Discord
integration, Archipelago server management, player interaction, and more.

---

## 📦 Structure

| Subfolder                       | Description                                                                                                                      |
|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| [`discord/`](./discord)         | Handles all Discord bot logic — commands, setup, channel interaction, role checks, and slash command registration.               |
| [`archipelago/`](./archipelago) | Manages connections to Archipelago servers, including socket handling, event routing, message processing, and hosting utilities. |

---

## 🔁 How It Works

Eclipse-Bot orchestrates player activity and server management by coordinating logic across these services:

- The **Discord** service runs the bot interface, listens to commands and messages, and invokes backend actions.
- The **Archipelago** service connects to external AP servers or hosts new ones, while handling communication with
  players and state changes.

Each service is isolated but shares config and logging through the shared `/system` layer.

---

## 🔗 More Details

- [services/discord/](./discord/README.md)
- [services/archipelago/](./archipelago/README.md)

