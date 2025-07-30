/**
 * Eclipse-Bot Setup Wizard
 * ------------------------------------------------------
 * Handles first-time setup for Eclipse-Bot with:
 *  - Guild selection and channel category configuration
 *  - Automatic MongoDB container deployment (Docker)
 *  - Shared Docker network setup
 *  - Auto-generation of MongoDB credentials
 *  - Live updating of .env file and process.env variables
 *  - Immediate DB connection test (no restart required)
 *  - Saving guild configuration in database
 */

import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';
import dotenv from 'dotenv';
import logger from '../../system/log/logHandler.mjs';
import {saveGuildConfig} from './users/usersHandler.mjs';
import {DatabaseHandler} from './mongo/mongoHandler.mjs';
import Docker from 'dockerode';
import net from 'net';
import fs from 'fs';

dotenv.config();

const docker = new Docker({socketPath: '/var/run/docker.sock'});
const setupSessions = new Map(); // Stores ongoing setup states keyed by userId

// Shared constants
const DOCKER_NETWORK_NAME = 'ecbot-net';
const DEFAULT_DB_NAME = 'ecbot';

/* -------------------------------------------------------------------------- */
/*                             Helper Functions                               */

/* -------------------------------------------------------------------------- */

/**
 * Writes new MongoDB credentials to `.env` file
 * and updates process.env live.
 */
function updateEnvVars(uri, user, pass, dbName = DEFAULT_DB_NAME) {
    const envPath = './.env';
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Remove old values
    content = content
        .replace(/MONGO_URI=.*/g, '')
        .replace(/MONGO_USER=.*/g, '')
        .replace(/MONGO_PASS=.*/g, '')
        .replace(/MONGO_DB_NAME=.*/g, '');

    // Append new values
    content += `\nMONGO_URI=${uri}\nMONGO_USER=${user}\nMONGO_PASS=${pass}\nMONGO_DB_NAME=${dbName}\n`;

    fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
    logger.info('✅ Updated .env file with MongoDB credentials');

    // Live update for running bot session
    process.env.MONGO_URI = uri;
    process.env.MONGO_USER = user;
    process.env.MONGO_PASS = pass;
    process.env.MONGO_DB_NAME = dbName;

    logger.info('🔄 Updated environment variables in memory for current session');
}

/**
 * Ensures a shared Docker network exists for bot & database.
 */
async function ensureNetwork() {
    const networks = await docker.listNetworks();
    if (!networks.some(net => net.Name === DOCKER_NETWORK_NAME)) {
        logger.info(`🔧 Creating shared Docker network: ${DOCKER_NETWORK_NAME}`);
        await docker.createNetwork({Name: DOCKER_NETWORK_NAME, Driver: 'bridge'});
    }
}

/**
 * Waits until MongoDB is ready to accept connections.
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

/* -------------------------------------------------------------------------- */
/*                            Main Setup Functions                            */

/* -------------------------------------------------------------------------- */

/**
 * Starts the setup wizard via DM to SuperUser.
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
        .setDescription('Welcome! This wizard will guide you through first-time setup.\n\nPress **Start Setup** to begin.')
        .setColor(0x5865F2);

    const startButton = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary);

    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(startButton)]});
    logger.info('📩 Sent setup wizard DM to SuperUser.');
}

/**
 * Handles button/select menu interactions during setup flow.
 */
export async function handleSetupInteraction(interaction, client) {
    const userId = interaction.user.id;
    if (!setupSessions.has(userId)) return;
    const session = setupSessions.get(userId);

    switch (interaction.customId) {
        /* -------------------- STEP 1: Select Guild -------------------- */
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

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('Step 1️⃣ - Server Selection')
                    .setDescription('Choose the server where Eclipse-Bot should be configured.')
                    .setColor(0x5865F2)],
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            });
            session.step = 2;
            break;
        }

        /* -------------------- STEP 2: Category -------------------- */
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

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('Step 2️⃣ - Category Setup')
                    .setDescription('Pick an existing category for Eclipse-Bot channels or create a new one.')
                    .setColor(0x5865F2)],
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

        /* -------------------- STEP 3: Database -------------------- */
        case 'setup_db_docker': {
            await session.dm.send('🐳 **Starting MongoDB container on shared network...**');
            const success = await startMongoDocker(session);
            if (success) {
                await session.dm.send('✅ MongoDB container is running and ready!');
                await askRoles(interaction, session, true);
            } else {
                await session.dm.send('❌ Failed to start MongoDB container.');
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

        /* -------------------- STEP 4: Roles -------------------- */
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
    }
}

/**
 * Handles plain text messages for manual Mongo URI entry.
 */
export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session) return;

    if (session.step === 'await_mongo_uri') {
        session.choices.mongoUri = message.content.trim();
        await askRoles(message, session);
    }
}

/* ------------------------ Sub-Step Functions ------------------------ */

async function askDatabaseSetup(interaction, session) {
    const dockerBtn = new ButtonBuilder().setCustomId('setup_db_docker').setLabel('🐳 Use Docker for MongoDB').setStyle(ButtonStyle.Primary);
    const manualBtn = new ButtonBuilder().setCustomId('setup_db_manual').setLabel('🔗 Provide Existing URI').setStyle(ButtonStyle.Secondary);

    await interaction.update({
        embeds: [new EmbedBuilder().setTitle('Step 3️⃣ - Database Setup').setDescription('Choose how to configure MongoDB.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(dockerBtn, manualBtn)]
    });
    session.step = 4;
}

/**
 * Deploys a MongoDB container attached to shared Docker network.
 */
async function startMongoDocker(session) {
    try {
        const password = Math.random().toString(36).slice(-10);
        const containerName = 'ecbot-mongo';

        await ensureNetwork();

        // Remove old container
        await session.dm.send('🔄 Removing any old MongoDB container...');
        try {
            await docker.getContainer(containerName).remove({force: true});
        } catch (_) {
        }

        // Pull image if needed
        await session.dm.send('📦 Pulling `mongo:latest` image (if needed)...');
        await new Promise((resolve, reject) => {
            docker.pull('mongo:latest', (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, () => resolve());
            });
        });

        // Create new container
        await session.dm.send('🚀 Creating MongoDB container...');
        const container = await docker.createContainer({
            Image: 'mongo:latest',
            name: containerName,
            Env: [
                `MONGO_INITDB_ROOT_USERNAME=ecbot`,
                `MONGO_INITDB_ROOT_PASSWORD=${password}`
            ],
            ExposedPorts: {'27017/tcp': {}},
            HostConfig: {
                PortBindings: {'27017/tcp': [{HostPort: '27017'}]},
                RestartPolicy: {Name: 'unless-stopped'}
            },
            NetworkingConfig: {EndpointsConfig: {[DOCKER_NETWORK_NAME]: {}}},
            Cmd: ["mongod", "--bind_ip_all", "--auth"]
        });
        await container.start();

        const uri = `mongodb://ecbot:${password}@ecbot-mongo:27017/${DEFAULT_DB_NAME}?authSource=admin`;
        session.choices.mongoUri = uri;
        session.choices.mongoUser = 'ecbot';
        session.choices.mongoPass = password;

        // Write to .env and live process vars
        updateEnvVars(uri, 'ecbot', password, DEFAULT_DB_NAME);

        // ✅ Force immediate DB connection test
        await DatabaseHandler.ensureConnection();

        return true;
    } catch (err) {
        logger.error('Failed to start Mongo Docker container:', err);
        return false;
    }
}

async function askRoles(interactionOrMsg, session) {
    const replyFunc = interactionOrMsg.update ? interactionOrMsg.update.bind(interactionOrMsg) : interactionOrMsg.reply.bind(interactionOrMsg);
    const autoBtn = new ButtonBuilder().setCustomId('setup_roles_autocreate').setLabel('✨ Auto-create Roles').setStyle(ButtonStyle.Primary);

    await replyFunc({
        embeds: [new EmbedBuilder().setTitle('Step 4️⃣ - Role Setup').setDescription('Eclipse-Bot needs **Moderator** and **Player** roles.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(autoBtn)]
    });
    session.step = 5;
}

/**
 * Saves final guild configuration to DB and completes setup.
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

    await interaction.update({
        embeds: [new EmbedBuilder().setTitle('✅ Setup Complete').setDescription(`Eclipse-Bot is ready!\n\n**Mongo URI:** \`${config.mongoUri}\``).setColor(0x57F287)],
        components: []
    });
    setupSessions.delete(interaction.user.id);

    logger.info(`✅ Setup completed for guild ${config.guildId}`);
}
