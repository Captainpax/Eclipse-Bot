# 🌒 Eclipse-Bot

Eclipse-Bot is a powerful Discord bot designed to automate and manage **Archipelago** multiworld game servers. It
provides seamless player coordination, secure game channel handling, and dynamic slash/text command workflows — all
within your Discord server.

---

## ⚙️ Key Features

- 🔧 First-time setup wizard via DM
- 💬 Slash + text command handling
- 🧍 Signup queue system (`!me`, `!list`)
- 🛠️ Admin channel creation (`!create_channels`)
- 🏗️ Automatic channel bootstrapping
- 🧑‍⚖️ Role-based permissions (admin/mod/player)
- 🌐 Custom FQDN & port range assignment
- 🧠 MongoDB-backed persistent config
- 🧩 Archipelago connection support
- 🐳 Docker-ready deployment

---

## 🚀 Quickstart

### 1. Clone the Repo

```bash
git clone https://github.com/Captainpax/Eclipse-Bot.git
cd Eclipse-Bot
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Your Environment

Create a `.env` file based on `example.env`:

```env
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
SUPER_USER_ID=your_discord_user_id
MONGO_URI=mongodb://...
MONGO_USER=your_user
MONGO_PASS=your_pass
```

### 4. Run the Bot

```bash
npm start
```

The bot will:

* Log in
* Register slash commands
* DM the SUPER\_USER\_ID for setup
* Bootstrap required channels

---

## 🧭 Folder Guide

| Folder                                           | Description                                       |
|--------------------------------------------------|---------------------------------------------------|
| [`services/`](./services)                        | Bot logic (Discord, Archipelago, commands, setup) |
| [`services/discord`](./services/discord)         | Core Discord bot components                       |
| [`services/archipelago`](./services/archipelago) | Handles AP socket connections and host utilities  |
| [`system/`](./system)                            | Database and logging systems                      |

💡 For detailed breakdowns:

* [services/](./services/README.md)
* [system/](./system/README.md)

---

## 💬 Commands

### Text Commands (run in waiting-room)

* `!me` — Join the signup queue (must be linked)
* `!list` — View current signup queue
* `!create_channels` — Admin-only: sets up game channels

### Slash Commands

Grouped under `/ec`, dynamically loaded from `services/discord/commands/`.

---

## 🛡️ Required Discord Permissions

When adding the bot, grant:

* `Manage Channels`
* `Manage Roles`
* `Send Messages`
* `Read Message History`
* `Use Slash Commands`

---

## 🧱 Tech Stack

* Node.js 20+
* Discord.js 14+
* MongoDB (via Mongoose)
* Docker support
* Archipelago.js

---

## 📜 License

MIT — free to use, extend, and deploy. If you build something cool with Eclipse-Bot, let us know!

```

---

Let me know when you're ready and I’ll generate the next-level `README.md` files for `/services`, `/services/discord`, `/services/archipelago`, and `/system`.
```

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


