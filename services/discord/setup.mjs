/**
 * @fileoverview
 * Eclipse-Bot Setup Wizard (Dynamic Env + Network Join + Debug + Confirm Step)
 *
 * Handles first-time setup:
 *  ✅ Ensures both bot & Mongo run on `ecbot-net`
 *  ✅ Deploys MongoDB container dynamically
 *  ✅ Writes credentials to .env and updates runtime
 *  ✅ Verifies DB connection before finalizing
 *  ✅ Creates roles and essential channels
 *  ✅ Saves structured config with arrays
 *  ✅ Optionally restarts bot container
 */

import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import Docker from 'dockerode';
import net from 'net';
import {exec} from 'child_process';

import logger from '../../system/log/logHandler.mjs';
import {saveGuildConfig} from './users/usersHandler.mjs';
import {connectDatabase} from '../../system/database/databaseHandler.mjs';

dotenv.config({override: true});

const docker = new Docker({socketPath: '/var/run/docker.sock'});
const setupSessions = new Map();
const DOCKER_NETWORK_NAME = 'ecbot-net';
const DEFAULT_DB_NAME = 'ecbot';
const BOT_CONTAINER_NAME = 'eclipse-bot';

/* ----------------------- Helper Functions ----------------------- */

function reloadEnv() {
    dotenv.config({override: true});
    logger.debug('🔄 .env reloaded');
}

function updateEnvVars(uri, user, pass, dbName = DEFAULT_DB_NAME) {
    const envPath = './.env';
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    content = content
        .replace(/MONGO_URI=.*/g, '')
        .replace(/MONGO_USER=.*/g, '')
        .replace(/MONGO_PASS=.*/g, '')
        .replace(/MONGO_DB_NAME=.*/g, '');

    content += `\nMONGO_URI=${uri}\nMONGO_USER=${user}\nMONGO_PASS=${pass}\nMONGO_DB_NAME=${dbName}\n`;
    fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');

    reloadEnv();
    process.env.MONGO_URI = uri;
    process.env.MONGO_USER = user;
    process.env.MONGO_PASS = pass;
    process.env.MONGO_DB_NAME = dbName;

    logger.info('✅ Mongo credentials updated');
}

async function ensureNetwork() {
    const networks = await docker.listNetworks();
    if (!networks.some(net => net.Name === DOCKER_NETWORK_NAME)) {
        logger.info(`🔧 Creating network: ${DOCKER_NETWORK_NAME}`);
        await docker.createNetwork({Name: DOCKER_NETWORK_NAME, Driver: 'bridge'});
    }
    try {
        const containerId = os.hostname();
        const network = docker.getNetwork(DOCKER_NETWORK_NAME);
        const info = await network.inspect();
        const connected = Object.values(info.Containers ?? {}).some(c => c.Name === BOT_CONTAINER_NAME);

        if (!connected) {
            logger.warn('🔗 Connecting bot to network...');
            await network.connect({Container: containerId});
            logger.info('✅ Bot joined ecbot-net');
        }
    } catch (err) {
        logger.warn(`⚠️ Network attach failed: ${err.message}`);
    }
}

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

/* ----------------------- Setup Wizard ----------------------- */

export async function runFirstTimeSetup(client) {
    const superUserId = process.env.SUPER_USER_ID;
    if (!superUserId) return logger.error('❌ SUPER_USER_ID not set');

    const user = await client.users.fetch(superUserId).catch(() => null);
    if (!user) return logger.error('❌ SuperUser not found');

    const dm = await user.createDM();
    setupSessions.set(user.id, {step: 1, choices: {}, dm});

    const embed = new EmbedBuilder()
        .setTitle('🔧 Eclipse-Bot Setup Wizard')
        .setDescription('Press **Start Setup** to begin.')
        .setColor(0x5865F2);

    const button = new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary);

    await dm.send({embeds: [embed], components: [new ActionRowBuilder().addComponents(button)]});
    logger.info('📩 Setup wizard DM sent to SuperUser.');
}

export async function handleSetupInteraction(interaction, client) {
    const session = setupSessions.get(interaction.user.id);
    if (!session) return;

    try {
        switch (interaction.customId) {
            case 'setup_start':
                return handleServerSelection(interaction, client, session);
            case 'setup_select_guild':
                return handleCategorySelection(interaction, client, session);
            case 'setup_select_category':
            case 'setup_create_category':
                return handleCategoryChoice(interaction, client, session);
            case 'setup_db_docker':
                return handleDockerMongo(interaction, session);
            case 'setup_db_manual':
                return askMongoUri(interaction, session);
            case 'setup_roles_autocreate':
                return autoCreateRoles(interaction, session, client);
            case 'setup_confirm_config':
                return finalizeConfig(interaction, session, client);
        }
    } catch (err) {
        logger.error(`❌ Setup step failed: ${err.message}`);
        if (!interaction.deferred) interaction.reply({content: '❌ Setup error.', flags: 64}).catch(() => {
        });
    }
}

export async function handleSetupMessage(message) {
    const session = setupSessions.get(message.author.id);
    if (!session || session.step !== 'await_mongo_uri') return;

    session.choices.mongoUri = message.content.trim();
    await askRoles(message, session);
}

/* ----------------------- Steps ----------------------- */

async function handleServerSelection(interaction, client, session) {
    await interaction.deferReply({flags: 64});

    const guildChoices = client.guilds.cache
        .filter(g => g.ownerId === interaction.user.id)
        .map(g => ({label: g.name, description: `ID: ${g.id}`, value: g.id}));

    if (!guildChoices.length)
        return interaction.editReply({content: '❌ No owned servers found.'});

    const menu = new StringSelectMenuBuilder()
        .setCustomId('setup_select_guild')
        .setPlaceholder('Select your server')
        .addOptions(guildChoices);

    session.step = 2;
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 1️⃣ - Server').setDescription('Choose a server.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(menu)]
    });
}

async function handleCategorySelection(interaction, client, session) {
    await interaction.deferUpdate();
    session.choices.guildId = interaction.values[0];

    const guild = await client.guilds.fetch(session.choices.guildId);
    const categories = guild.channels.cache.filter(ch => ch.type === 4);
    const catChoices = categories.map(c => ({label: c.name, value: c.id}));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('setup_select_category')
        .setPlaceholder('Choose or create category')
        .addOptions(catChoices.length ? catChoices : [{label: 'None found', value: 'none'}]);

    const createBtn = new ButtonBuilder()
        .setCustomId('setup_create_category')
        .setLabel('➕ Create New Category')
        .setStyle(ButtonStyle.Secondary);

    session.step = 3;
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 2️⃣ - Category').setDescription('Choose a text category.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(menu), new ActionRowBuilder().addComponents(createBtn)]
    });
}

async function handleCategoryChoice(interaction, client, session) {
    await interaction.deferUpdate();
    const guild = await client.guilds.fetch(session.choices.guildId);

    if (interaction.customId === 'setup_create_category') {
        const cat = await guild.channels.create({name: 'Eclipse-Bot', type: 4});
        session.choices.categoryId = cat.id;
    } else {
        session.choices.categoryId = interaction.values[0];
    }

    return askDatabaseSetup(interaction, session);
}

async function handleDockerMongo(interaction, session) {
    await interaction.deferReply({flags: 64});
    await session.dm.send('🐳 Starting Mongo container...');

    const success = await startMongoDocker(session);
    if (!success) return session.dm.send('❌ Mongo container failed.');

    await session.dm.send('✅ Mongo running! Connecting...');
    await connectDatabase();

    await session.dm.send('✅ Database connection established.');
    await askRoles(interaction, session);

    if (process.env.AUTO_RESTART === 'true') {
        logger.info('♻️ Restarting bot...');
        exec(`docker restart ${BOT_CONTAINER_NAME}`);
    }
}

async function startMongoDocker(session) {
    try {
        const password = Math.random().toString(36).slice(-10);
        const containerName = 'ecbot-mongo';

        await ensureNetwork();
        try {
            await docker.getContainer(containerName).remove({force: true});
        } catch (_) {
        }

        await session.dm.send('📦 Pulling Mongo...');
        await new Promise((resolve, reject) => docker.pull('mongo:latest', (err, stream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, () => resolve());
        }));

        const container = await docker.createContainer({
            Image: 'mongo:latest',
            name: containerName,
            Env: [`MONGO_INITDB_ROOT_USERNAME=ecbot`, `MONGO_INITDB_ROOT_PASSWORD=${password}`],
            ExposedPorts: {'27017/tcp': {}},
            HostConfig: {NetworkMode: DOCKER_NETWORK_NAME, RestartPolicy: {Name: 'unless-stopped'}},
            NetworkingConfig: {EndpointsConfig: {[DOCKER_NETWORK_NAME]: {}}},
            Cmd: ["mongod", "--bind_ip_all", "--auth"]
        });
        await container.start();

        let ready = false;
        for (let i = 0; i < 10; i++) {
            if (await checkMongoReady('ecbot-mongo', 27017)) {
                ready = true;
                break;
            }
            await new Promise(r => setTimeout(r, 3000));
        }
        if (!ready) throw new Error("MongoDB didn't start in time");

        const uri = `mongodb://ecbot:${password}@ecbot-mongo:27017/${DEFAULT_DB_NAME}?authSource=admin`;
        session.choices.mongoUri = uri;
        session.choices.mongoUser = 'ecbot';
        session.choices.mongoPass = password;

        updateEnvVars(uri, 'ecbot', password);
        return true;
    } catch (err) {
        logger.error('Mongo container error:', err);
        return false;
    }
}

async function askDatabaseSetup(interaction, session) {
    const dockerBtn = new ButtonBuilder().setCustomId('setup_db_docker').setLabel('🐳 Use Docker').setStyle(ButtonStyle.Primary);
    const manualBtn = new ButtonBuilder().setCustomId('setup_db_manual').setLabel('🔗 Enter URI').setStyle(ButtonStyle.Secondary);

    session.step = 4;
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 3️⃣ - Database').setDescription('Choose a Mongo setup method.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(dockerBtn, manualBtn)]
    });
}

async function askMongoUri(interaction, session) {
    await interaction.deferUpdate();
    session.step = 'await_mongo_uri';
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 3️⃣ - Manual Mongo URI').setDescription('Send your MongoDB URI in chat.').setColor(0x5865F2)],
        components: []
    });
}

async function askRoles(interactionOrMsg, session) {
    const replyFunc = interactionOrMsg.editReply
        ? interactionOrMsg.editReply.bind(interactionOrMsg)
        : interactionOrMsg.reply.bind(interactionOrMsg);

    const autoBtn = new ButtonBuilder().setCustomId('setup_roles_autocreate').setLabel('✨ Auto-create Roles').setStyle(ButtonStyle.Primary);

    session.step = 5;
    return replyFunc({
        embeds: [new EmbedBuilder().setTitle('Step 4️⃣ - Roles').setDescription('Bot needs Moderator & Player roles.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(autoBtn)]
    });
}

async function autoCreateRoles(interaction, session, client) {
    await interaction.deferReply({flags: 64});
    try {
        const guild = await client.guilds.fetch(session.choices.guildId);
        const mod = await guild.roles.create({name: 'Eclipse-Mod', color: 'Blue'});
        const player = await guild.roles.create({name: 'Eclipse-Player', color: 'Green'});

        session.choices.modRoleId = mod.id;
        session.choices.playerRoleId = player.id;

        return confirmConfig(interaction, session);
    } catch (err) {
        logger.error(`❌ Failed to create roles: ${err.message}`);
        return interaction.editReply({content: '❌ Role creation failed.', flags: 64});
    }
}

/**
 * Shows config summary before saving
 */
async function confirmConfig(interaction, session) {
    await interaction.editReply({
        embeds: [new EmbedBuilder()
            .setTitle('Step 5️⃣ - Review Config')
            .setDescription(`Please confirm the following:\n
**Guild:** <@${session.choices.guildId}>
**Category:** <#${session.choices.categoryId}>
**Mongo URI:** \`${session.choices.mongoUri}\`
**Mod Role:** <@&${session.choices.modRoleId}>
**Player Role:** <@&${session.choices.playerRoleId}>\n\nPress **Confirm** to save config.`)
            .setColor(0xF1C40F)],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setup_confirm_config').setLabel('✅ Confirm & Save').setStyle(ButtonStyle.Success)
        )]
    });
}

/**
 * Saves config to DB and finalizes setup
 */
async function finalizeConfig(interaction, session, client) {
    await interaction.deferUpdate().catch(() => {
    });
    const guild = await client.guilds.fetch(session.choices.guildId);

    // Auto-create base channels
    const consoleCh = await guild.channels.create({name: 'ap-console', type: 0, parent: session.choices.categoryId});
    const logsCh = await guild.channels.create({name: 'ap-logs', type: 0, parent: session.choices.categoryId});
    const waitingCh = await guild.channels.create({
        name: 'ap-waiting-room',
        type: 0,
        parent: session.choices.categoryId
    });

    const config = {
        guildId: session.choices.guildId,
        adminId: interaction.user.id,
        fqdn: 'not-set',
        portRange: {start: 38200, end: 38300},
        mongoUri: session.choices.mongoUri,
        bootstrapped: true,
        roles: {
            admin: [interaction.user.id],
            mod: [session.choices.modRoleId],
            player: [session.choices.playerRoleId]
        },
        channels: {
            category: [session.choices.categoryId],
            console: [consoleCh.id],
            logs: [logsCh.id],
            waitingRoom: [waitingCh.id]
        }
    };

    await connectDatabase();
    await saveGuildConfig(config);
    setupSessions.delete(interaction.user.id);

    return interaction.editReply({
        embeds: [new EmbedBuilder()
            .setTitle('✅ Setup Complete')
            .setDescription(`Server is ready!\nMongo URI: \`${config.mongoUri}\``)
            .setColor(0x57F287)],
        components: []
    });
}
