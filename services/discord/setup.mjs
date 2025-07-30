// 📁 services/discord/setup.mjs

import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';
import dotenv from 'dotenv';
import logger from '../../system/log/logHandler.mjs';
import {saveGuildConfig} from './users/usersHandler.mjs';
import Docker from 'dockerode';
import net from 'net';

dotenv.config();

const docker = new Docker({socketPath: '/var/run/docker.sock'});
const setupSessions = new Map(); // userId -> session state

/**
 * Sends a DM to the SuperUser to begin the Eclipse-Bot setup wizard.
 *
 * @param {import('discord.js').Client} client - The Discord bot client instance.
 * @returns {Promise<void>}
 */
export async function runFirstTimeSetup(client) {
    const superUserId = process.env.SUPER_USER_ID;
    if (!superUserId) return logger.error('❌ SUPER_USER_ID not set in .env');

    const superUser = await client.users.fetch(superUserId).catch(() => null);
    if (!superUser) return logger.error('❌ Could not find SuperUser for setup.');

    const dm = await superUser.createDM();
    setupSessions.set(superUser.id, {step: 1, choices: {}, dm});

    const embed = new EmbedBuilder()
        .setTitle('🔧 Eclipse-Bot Setup Wizard')
        .setDescription('Welcome! This wizard will guide you through the first-time setup.\n\nPress **Start Setup** to begin.')
        .setColor(0x5865F2);

    const startButton = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary);

    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(startButton)]});
    logger.info('📩 Sent setup wizard DM to SuperUser.');
}

/**
 * Handles button and select menu interactions during setup.
 *
 * @param {import('discord.js').Interaction} interaction - Discord interaction.
 * @param {import('discord.js').Client} client - Discord client instance.
 */
export async function handleSetupInteraction(interaction, client) {
    const userId = interaction.user.id;
    if (!setupSessions.has(userId)) return;
    const session = setupSessions.get(userId);

    switch (interaction.customId) {
        // ───────────── STEP 1: Server Selection ─────────────
        case 'setup_start': {
            const guildChoices = client.guilds.cache
                .filter(g => g.ownerId === userId)
                .map(g => ({label: g.name, description: `ID: ${g.id}`, value: g.id}));

            if (guildChoices.length === 0) {
                return interaction.reply({content: '❌ No owned servers found where I am present.', ephemeral: true});
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('setup_select_guild')
                .setPlaceholder('Select a server...')
                .addOptions(guildChoices);

            const embed = new EmbedBuilder()
                .setTitle('Step 1️⃣ - Server Selection')
                .setDescription('Choose the server where Eclipse-Bot should be configured.')
                .setColor(0x5865F2);

            await interaction.update({embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)]});
            session.step = 2;
            break;
        }

        // ───────────── STEP 2: Category ─────────────
        case 'setup_select_guild': {
            session.choices.guildId = interaction.values[0];

            const guild = await client.guilds.fetch(session.choices.guildId);
            const categories = guild.channels.cache.filter(ch => ch.type === 4);
            const catChoices = categories.map(c => ({label: c.name, value: c.id}));

            const catSelect = new StringSelectMenuBuilder()
                .setCustomId('setup_select_category')
                .setPlaceholder('Select an existing category...')
                .addOptions(catChoices.length ? catChoices : [{label: 'No categories found', value: 'none'}]);

            const createNewBtn = new ButtonBuilder()
                .setCustomId('setup_create_category')
                .setLabel('➕ Create New Category')
                .setStyle(ButtonStyle.Secondary);

            const embed = new EmbedBuilder()
                .setTitle('Step 2️⃣ - Category Setup')
                .setDescription('Pick an existing category for Eclipse-Bot channels or create a new one.')
                .setColor(0x5865F2);

            await interaction.update({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(catSelect), new ActionRowBuilder().addComponents(createNewBtn)]
            });
            session.step = 3;
            break;
        }

        case 'setup_select_category': {
            session.choices.categoryId = interaction.values[0];
            await askDatabaseSetup(interaction, session);
            break;
        }

        case 'setup_create_category': {
            const guild = await client.guilds.fetch(session.choices.guildId);
            const newCategory = await guild.channels.create({name: 'Eclipse-Bot', type: 4});
            session.choices.categoryId = newCategory.id;
            await askDatabaseSetup(interaction, session);
            break;
        }

        // ───────────── STEP 3: Database Setup ─────────────
        case 'setup_db_docker': {
            await session.dm.send('🐳 **Starting MongoDB Docker container... this may take up to a minute.**');
            const success = await startMongoDocker(session);
            if (success) {
                await session.dm.send('✅ MongoDB container is running and ready!');
                await askRoles(interaction, session, true);
            } else {
                await session.dm.send('❌ Failed to start MongoDB container. Please check Docker and try manual URI setup.');
            }
            break;
        }

        case 'setup_db_manual': {
            session.choices.mongoUri = 'manual';
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('Step 3️⃣ - MongoDB Setup')
                    .setDescription('Please type your **MongoDB URI** in this DM channel now.')
                    .setColor(0x5865F2)],
                components: []
            });
            session.step = 'await_mongo_uri';
            break;
        }

        // ───────────── STEP 4: Roles ─────────────
        case 'setup_roles_autocreate': {
            const guild = await client.guilds.fetch(session.choices.guildId);
            await session.dm.send('⚙️ Creating default Moderator and Player roles...');
            const modRole = await guild.roles.create({name: 'Eclipse-Mod', color: 'Blue'});
            const playerRole = await guild.roles.create({name: 'Eclipse-Player', color: 'Green'});
            session.choices.modRoleId = modRole.id;
            session.choices.playerRoleId = playerRole.id;
            await finalizeConfig(interaction, session);
            break;
        }

        default:
            break;
    }
}

/**
 * Handles manual text messages during setup.
 *
 * @param {import('discord.js').Message} message - Discord message object.
 */
export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session) return;

    if (session.step === 'await_mongo_uri') {
        session.choices.mongoUri = message.content.trim();
        await askRoles(message, session);
    }
}

/**
 * Asks the user how they want to set up MongoDB.
 */
async function askDatabaseSetup(interaction, session) {
    const dockerBtn = new ButtonBuilder()
        .setCustomId('setup_db_docker')
        .setLabel('🐳 Use Docker for MongoDB')
        .setStyle(ButtonStyle.Primary);

    const manualBtn = new ButtonBuilder()
        .setCustomId('setup_db_manual')
        .setLabel('🔗 Provide Existing URI')
        .setStyle(ButtonStyle.Secondary);

    const embed = new EmbedBuilder()
        .setTitle('Step 3️⃣ - Database Setup')
        .setDescription('Choose how to configure MongoDB.\nEclipse-Bot can spin up a local container or you can provide your own connection string.')
        .setColor(0x5865F2);

    await interaction.update({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(dockerBtn, manualBtn)]
    });
    session.step = 4;
}

/**
 * Starts a MongoDB Docker container for the bot's database.
 *
 * @param {Object} session - Current setup session data.
 * @returns {Promise<boolean>} - True if container started successfully.
 */
async function startMongoDocker(session) {
    try {
        const password = Math.random().toString(36).slice(-10);
        const containerName = 'ecbot-mongo';

        await session.dm.send('🔄 Removing any old MongoDB container...');
        try {
            const old = docker.getContainer(containerName);
            await old.remove({force: true}).catch(() => {
            });
        } catch (_) {
        }

        // ✅ Auto-pull mongo image if missing
        await session.dm.send('📦 Pulling `mongo:latest` image (if not cached)... this might take a while.');
        await new Promise((resolve, reject) => {
            docker.pull('mongo:latest', (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, () => {
                    logger.info('✅ mongo:latest image ready.');
                    resolve();
                });
            });
        });

        await session.dm.send('🚀 Creating MongoDB container...');
        const container = await docker.createContainer({
            Image: 'mongo:latest',
            name: containerName,
            Env: [
                `MONGO_INITDB_ROOT_USERNAME=ecbot`,
                `MONGO_INITDB_ROOT_PASSWORD=${password}`
            ],
            HostConfig: {
                PortBindings: {
                    '27017/tcp': [{HostPort: '27017'}]
                },
                RestartPolicy: {Name: 'unless-stopped'}
            }
        });
        await container.start();

        await session.dm.send('⏳ Waiting for MongoDB to become ready...');
        let attempts = 0;
        while (attempts < 15) {
            const ready = await checkMongoReady('localhost', 27017);
            if (ready) break;
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }
        if (attempts >= 15) {
            logger.error('MongoDB container did not become ready in time.');
            return false;
        }

        session.choices.mongoUri = `mongodb://ecbot:${password}@localhost:27017`;
        session.choices.mongoUser = 'ecbot';
        session.choices.mongoPass = password;

        return true;
    } catch (err) {
        logger.error('Failed to start Mongo Docker container:', err);
        return false;
    }
}

/**
 * Checks if MongoDB is accepting connections on the given port.
 *
 * @param {string} host - Host address.
 * @param {number} port - MongoDB port.
 * @returns {Promise<boolean>}
 */
function checkMongoReady(host, port) {
    return new Promise(resolve => {
        const socket = net.createConnection(port, host);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('error', () => resolve(false));
    });
}

/**
 * Asks the user to configure roles for the bot.
 */
async function askRoles(interactionOrMsg, session) {
    const replyFunc = interactionOrMsg.update ? interactionOrMsg.update.bind(interactionOrMsg) : interactionOrMsg.reply.bind(interactionOrMsg);

    const autoBtn = new ButtonBuilder()
        .setCustomId('setup_roles_autocreate')
        .setLabel('✨ Auto-create Roles')
        .setStyle(ButtonStyle.Primary);

    const embed = new EmbedBuilder()
        .setTitle('Step 4️⃣ - Role Setup')
        .setDescription('Eclipse-Bot needs **Moderator** and **Player** roles.\nYou can create them automatically or assign existing roles later.')
        .setColor(0x5865F2);

    await replyFunc({embeds: [embed], components: [new ActionRowBuilder().addComponents(autoBtn)]});
    session.step = 5;
}

/**
 * Finalizes the configuration and saves it to the database.
 */
async function finalizeConfig(interaction, session) {
    const config = {
        guildId: session.choices.guildId,
        adminId: interaction.user.id,
        categoryId: session.choices.categoryId,
        modRoleId: session.choices.modRoleId || null,
        playerRoleId: session.choices.playerRoleId || null,
        fqdn: 'not-set',
        portRange: {start: 38200, end: 38300},
        mongoUri: session.choices.mongoUri || null,
        bootstrapped: false
    };

    await saveGuildConfig(config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Setup Complete')
        .setDescription(`Eclipse-Bot is ready to host Archipelago servers!\n\n**Mongo URI:** \`${config.mongoUri}\``)
        .setColor(0x57F287);

    await interaction.update({embeds: [embed], components: []});
    setupSessions.delete(interaction.user.id);

    logger.info(`✅ Setup completed for guild ${config.guildId}`);

    // ✅ Send setup summary DM
    try {
        const superUser = await interaction.client.users.fetch(interaction.user.id);
        await superUser.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📜 Eclipse-Bot Setup Summary')
                    .setColor(0x00FFAA)
                    .setDescription('Here are your final setup details:')
                    .addFields(
                        {name: 'Guild ID', value: config.guildId, inline: true},
                        {name: 'Admin ID', value: config.adminId, inline: true},
                        {name: 'Category ID', value: config.categoryId, inline: true},
                        {name: 'Mod Role ID', value: config.modRoleId || 'Not Set', inline: true},
                        {name: 'Player Role ID', value: config.playerRoleId || 'Not Set', inline: true},
                        {name: 'Mongo URI', value: `\`${config.mongoUri}\``, inline: false},
                        {name: 'Port Range', value: `${config.portRange.start}-${config.portRange.end}`, inline: true}
                    )
                    .setFooter({text: '⚠️ Keep this information safe, especially the MongoDB credentials.'})
            ]
        });
        logger.info('📩 Setup summary sent to SuperUser.');
    } catch (err) {
        logger.error('❌ Failed to send SuperUser setup summary DM:', err);
    }
}
