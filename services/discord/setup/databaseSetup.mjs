import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import Docker from 'dockerode';
import net from 'net';

// Internal logging and database utilities
import logger from '../../../system/log/logHandler.mjs';
import {connectDatabase} from '../../../../../Downloads/updated_eclipse_bot/system/database/databaseHandler.mjs';

// Load environment variables for potential env modifications
dotenv.config({override: true});

// Docker engine and configuration constants
const docker = new Docker({socketPath: '/var/run/docker.sock'});
const DOCKER_NETWORK_NAME = 'ecbot-net';
const DEFAULT_DB_NAME = 'ecbot';
const BOT_CONTAINER_NAME = 'eclipse-bot';

/**
 * Reloads process.env variables from .env file.
 */
function reloadEnv() {
    dotenv.config({override: true});
}

/**
 * Writes Mongo connection details into the .env file and updates the process env.
 *
 * This helper removes any existing Mongo related entries in the .env and appends
 * the provided values. It then reloads the environment so that future
 * requires see updated values and updates process.env.
 *
 * @param {string} uri The MongoDB connection string
 * @param {string} user Username for authentication
 * @param {string} pass Password for authentication
 * @param {string} dbName Optional DB name (defaults to DEFAULT_DB_NAME)
 */
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

/**
 * Ensures a bridge network exists and attaches the current container to it.
 */
async function ensureNetwork() {
    const networks = await docker.listNetworks();
    if (!networks.some(netw => netw.Name === DOCKER_NETWORK_NAME)) {
        logger.info(`🔧 Creating network: ${DOCKER_NETWORK_NAME}`);
        await docker.createNetwork({Name: DOCKER_NETWORK_NAME, Driver: 'bridge'});
    }
    try {
        const containerId = os.hostname();
        const network = docker.getNetwork(DOCKER_NETWORK_NAME);
        const info = await network.inspect();
        const connected = Object.values(info.Containers ?? {}).some(c => c.Name === BOT_CONTAINER_NAME);
        if (!connected) {
            await network.connect({Container: containerId});
            logger.info('✅ Bot joined ecbot-net');
        }
    } catch (err) {
        logger.warn(`⚠️ Network attach failed: ${err.message}`);
    }
}

/**
 * Pings a MongoDB instance to see if it is ready.
 *
 * Uses a plain TCP connection to verify that the port is accepting
 * connections. Resolves true on success, false on error.
 *
 * @param {string} host Hostname of the Mongo container
 * @param {number} port Port number to connect to
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
 * Prompts the user to pick their MongoDB setup method.
 *
 * Sends two buttons – one to use Docker and one to manually enter a URI. The
 * next step is stored in the session.
 *
 * @param {Interaction} interaction The interaction to edit
 * @param {Object} session The active session state
 */
export async function askDatabaseSetup(interaction, session) {
    const dockerBtn = new ButtonBuilder().setCustomId('setup_db_docker').setLabel('🐳 Use Docker').setStyle(ButtonStyle.Primary);
    const manualBtn = new ButtonBuilder().setCustomId('setup_db_manual').setLabel('🔗 Enter URI').setStyle(ButtonStyle.Secondary);
    session.step = 4;
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 3️⃣ - Database').setDescription('Choose a MongoDB setup method.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(dockerBtn, manualBtn)]
    });
}

/**
 * Spins up a MongoDB container via Docker and stores the credentials.
 *
 * This function shows status messages through the interaction, pulls the
 * latest Mongo image, creates and starts the container, waits until the
 * database is reachable, updates the .env, and finally calls connectDatabase().
 * The caller is responsible for moving the flow to the next stage.
 *
 * @param {Interaction} interaction The interaction to update
 * @param {Object} session The active session
 */
export async function handleDockerMongo(interaction, session) {
    await interaction.deferReply({flags: 64});
    await interaction.editReply({embeds: [new EmbedBuilder().setTitle('🐳 Starting Mongo container...').setColor(0x3498DB)]});
    const success = await startMongoDocker(session);
    if (!success) {
        return interaction.editReply({embeds: [new EmbedBuilder().setTitle('❌ Mongo container failed.').setColor(0xE74C3C)]});
    }
    // establish DB connection so that later stages can persist config
    await connectDatabase();

}

/**
 * Internal helper to create and start a Mongo container.
 *
 * Generates a random password, ensures the network exists, pulls the image,
 * cleans up any old instance, starts the container, waits for readiness
 * and writes credentials to the env. It stores connection details in the
 * session for later use.
 *
 * @param {Object} session The session state
 * @returns {Promise<boolean>} Whether the container started successfully
 */
async function startMongoDocker(session) {
    try {
        const password = Math.random().toString(36).slice(-10);
        const containerName = 'ecbot-mongo';
        await ensureNetwork();
        // remove any stale container
        try {
            await docker.getContainer(containerName).remove({force: true});
        } catch (_) {
        }
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
            Cmd: ['mongod', '--bind_ip_all', '--auth']
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

/**
 * Prompts the user to enter their own Mongo URI.
 *
 * Sends a message in the channel asking for the URI and marks the session
 * state so that handleSetupMessage knows to capture the next text message.
 *
 * @param {Interaction} interaction The interaction to reply to
 * @param {Object} session The active session
 */
export async function askMongoUri(interaction, session) {
    await interaction.reply({content: '🔗 Please enter your MongoDB URI:', flags: 64});
    session.step = 'await_mongo_uri';

}