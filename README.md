
---

# 🌒 Eclipse-Bot

A powerful Discord bot designed to host and manage **Archipelago** multiworld servers, handle player queues, create secure game channels, and simplify admin workflows — all from your server.

---

## ⚙️ Features

- 🔧 **First-time Setup** via DM to guild owner
- 💬 Slash command registration and command handling
- 🧍 Player signup queue (`!me`, `!list`)
- 🛠️ Admin channel creation (`!create_channels`)
- 🏗️ Automatic bootstrapping of required channels (console, logs, waiting-room)
- 🧑‍⚖️ Role-based permissions (admin/mod/player)
- 🌐 Custom FQDN + port range assignment for hosted servers
- 🧠 Guild config persistence
- ✨ Fully asynchronous, multi-server ready

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/yourname/eclipse-bot.git
cd eclipse-bot

2. Install Dependencies

npm install

3. Configure Environment

Create a .env file:

DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_bot_client_id
GUILD_ID=your_discord_guild_id
LOG_LEVEL=info

> 📝 GUILD_ID is used for bootstrapping and DMs.

You can customize other values as needed.




---

4. Run the Bot

npm start

The bot will:

Log in

Register slash commands

DM the server owner for setup (if no config exists)

Automatically set up required channels



---

🛡️ Permissions Needed

When inviting the bot to your server, ensure it has:

Manage Channels

Manage Roles

Send Messages

Read Message History

Use Slash Commands



---

🧠 Architecture Overview

📁 services/
  └── discord/
      ├── initDiscord.mjs        # Sets up Discord bot
      ├── commands/              # Slash command files
      └── guilds/
          ├── setup.mjs          # DM-based config wizard
          ├── channelHandler.mjs # !commands and router
          ├── channels/          # Channel creation logic
          └── users/             # Role checking + config storage

  └── archipelago/
      └── ...                   # AP hosting logic (WIP)

📁 system/
  └── log/logHandler.mjs       # Custom logger


---

✉️ Commands

Text Commands (in waiting-room):

!me — Join the signup queue (must be /linked)

!list — View current signup queue

!create_channels — Admin-only: creates all game channels


Slash Commands (coming soon):

> Registered from files in services/discord/commands/.




---

📦 Dependencies

discord.js

dotenv

node-fetch

ws



---

📜 License

MIT — free to use, modify, and deploy. If you build something cool with it, share it!


---


