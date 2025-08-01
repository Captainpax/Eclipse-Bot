/**
 * @fileoverview
 * Handles automatic MongoDB setup for Eclipse-Bot:
 *   - Deploys a MongoDB container via Docker if requested
 *   - Creates `ecbot-net` network if missing and connects Eclipse-Bot to it
 *   - Persists credentials in `.env` to avoid regeneration on restart
 *   - Waits for container to become healthy before proceeding
 *   - Binds port 27017 to host for external debug tools
 *   - Updates process.env with the new Mongo URI
 */

import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Docker from 'dockerode';
import crypto from 'crypto';
import logger from '../../../system/log/logHandler.mjs';

dotenv.config({override: true});

async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) return await interaction.followUp(payload);
        else return await interaction.reply(payload);
    } catch (err) {
        logger.error(`❌ Failed to send interaction reply: ${err.message}`);
    }
}

export async function askDatabaseSetup(interaction, session) {
    const embed = new EmbedBuilder()
        .setTitle('📦 Database Setup')
        .setDescription('Choose how you want to configure MongoDB.\\n\\n🔧 **Docker**: Let me deploy Mongo automatically.\\n📝 **Manual**: You enter your own Mongo URI.')
        .setColor(0x3498db);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('setup_db_docker').setLabel('Use Docker').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('setup_db_manual').setLabel('Enter URI').setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, {embeds: [embed], components: [row], ephemeral: true});
}

export async function askMongoUri(interaction, session) {
    session.step = 'await_mongo_uri';
    const embed = new EmbedBuilder()
        .setTitle('📝 Manual MongoDB Configuration')
        .setDescription('Please paste your MongoDB connection URI below.\\nExample: `mongodb://user:pass@host:port/dbname`')
        .setColor(0xe67e22);

    await safeReply(interaction, {embeds: [embed], ephemeral: true});
    try {
        await session.dm.send({embeds: [embed]});
    } catch (err) {
        logger.error(`❌ Failed to DM user for Mongo URI: ${err.message}`);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForMongoHealthy(container, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const inspect = await container.inspect();
            const state = inspect.State?.Health?.Status || inspect.State?.Status;
            logger.debug(`⏳ Mongo container state: ${state}`);
            if (state === 'healthy' || state === 'running') return true;
        } catch (err) {
            logger.warn(`Retry ${i + 1} failed: ${err.message}`);
        }
        await delay(3000);
    }
    throw new Error('Mongo container did not become healthy in time.');
}

async function ensureBotOnNetwork(docker, networkName) {
    try {
        const containers = await docker.listContainers({all: true});
        const botContainer = containers.find(c => c.Names.some(n => n.includes('eclipse-bot')));
        if (!botContainer) {
            logger.warn(`[DOCKER-NET] Eclipse-Bot container not found, skipping auto-network join.`);
            return;
        }

        const net = docker.getNetwork(networkName);
        const inspect = await net.inspect();

        if (inspect.Containers && Object.values(inspect.Containers).some(c => c.Name.includes('eclipse-bot'))) {
            logger.info(`[DOCKER-NET] Eclipse-Bot already connected to ${networkName}.`);
            return;
        }

        await net.connect({Container: botContainer.Id});
        logger.info(`[DOCKER-NET] Connected Eclipse-Bot container to ${networkName}.`);
    } catch (err) {
        logger.warn(`[DOCKER-NET] Could not attach Eclipse-Bot to ${networkName}: ${err.message}`);
    }
}

export async function handleDockerMongo(interaction, session) {
    const docker = new Docker();
    const networkName = 'ecbot-net';
    const containerName = 'ecbot-mongo';
    const mongoPort = 27017;
    const hostPort = 27017;

    let mongoUser = process.env.MONGO_USER;
    let mongoPass = process.env.MONGO_PASS;

    if (!mongoUser || !mongoPass) {
        mongoUser = `user_${crypto.randomBytes(3).toString('hex')}`;
        mongoPass = crypto.randomBytes(12).toString('hex');
        logger.info('🔑 Generated new Mongo credentials.');
    } else {
        logger.info('🔑 Using existing Mongo credentials from .env');
    }

    const mongoDb = 'eclipse-bot';

    try {
        const networks = await docker.listNetworks();
        if (!networks.find(n => n.Name === networkName)) {
            await docker.createNetwork({Name: networkName, Driver: 'bridge'});
            logger.info(`🌐 Created Docker network: ${networkName}`);
        }
        await ensureBotOnNetwork(docker, networkName);
    } catch (err) {
        logger.error(`❌ Failed to create/check network: ${err.message}`);
    }

    await safeReply(interaction, {content: '📥 Pulling MongoDB image...', ephemeral: true});

    try {
        await new Promise((resolve, reject) => {
            docker.pull('mongo:6', (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, err => (err ? reject(err) : resolve()));
            });
        });
        logger.info('✅ Mongo image pulled.');
    } catch (err) {
        logger.error(`❌ Failed to pull image: ${err.message}`);
        return safeReply(interaction, {content: '❌ Failed to pull Mongo image.', ephemeral: true});
    }

    try {
        const old = docker.getContainer(containerName);
        await old.remove({force: true, v: true});
        logger.info('♻️ Removed existing Mongo container and volumes');
    } catch (_) {
    }

    const container = await docker.createContainer({
        name: containerName,
        Image: 'mongo:6',
        Env: [
            `MONGO_INITDB_ROOT_USERNAME=${mongoUser}`,
            `MONGO_INITDB_ROOT_PASSWORD=${mongoPass}`
        ],
        HostConfig: {
            RestartPolicy: {Name: 'always'},
            NetworkMode: networkName,
            PortBindings: {
                '27017/tcp': [{HostPort: hostPort.toString()}]
            }
        },
        ExposedPorts: {
            '27017/tcp': {}
        },
        NetworkingConfig: {
            EndpointsConfig: {
                [networkName]: {Aliases: [containerName]}
            }
        },
        Healthcheck: {
            Test: ['CMD-SHELL', 'echo "db.stats().ok" | mongosh localhost/test --quiet'],
            Interval: 1000000000,
            Timeout: 3000000000,
            Retries: 5
        }
    });
    await container.start();
    logger.info('🚀 Mongo container started with port binding 27017 -> host 27017.');

    await waitForMongoHealthy(container).catch(err => {
        logger.error(`❌ Mongo did not become healthy: ${err.message}`);
    });

    const newUri = `mongodb://${mongoUser}:${mongoPass}@${containerName}:${mongoPort}/${mongoDb}?authSource=admin`;
    logger.debug(`🔍 Mongo URI generated for session: ${newUri}`);

    const envPath = path.resolve(process.cwd(), '.env');
    let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    envContents = envContents.replace(/MONGO_URI=.*/g, '').trim();
    envContents += `\\nMONGO_URI=${newUri}\\nMONGO_USER=${mongoUser}\\nMONGO_PASS=${mongoPass}\\n`;
    fs.writeFileSync(envPath, envContents);

    process.env.MONGO_URI = newUri;
    process.env.MONGO_USER = mongoUser;
    process.env.MONGO_PASS = mongoPass;
    session.choices.mongoUri = newUri;

    logger.info('✅ Mongo URI and credentials written to .env');

    await safeReply(interaction, {content: '✅ Mongo container deployed and connecting...', ephemeral: true});

    await delay(3000);

    session.step = 'await_server_setup';
    session.dbReady = true;
}