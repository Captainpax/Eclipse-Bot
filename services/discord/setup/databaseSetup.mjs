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
        .setDescription('Choose how you want to configure MongoDB.\n\n🔧 **Docker**: Let me deploy Mongo automatically.\n📝 **Manual**: You enter your own Mongo URI.')
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
        .setDescription('Please paste your MongoDB connection URI below.\nExample: `mongodb://user:pass@host:port/dbname`')
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

function waitForMongoHealthy(container, retries = 3) {
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < retries; i++) {
            try {
                const inspect = await container.inspect();
                const state = inspect.State?.Health?.Status || inspect.State?.Status;
                logger.debug(`⏳ Mongo container state: ${state}`);
                if (state === 'healthy' || state === 'running') return resolve(true);
            } catch (err) {
                logger.warn(`Retry ${i + 1} failed: ${err.message}`);
            }
            await delay(3000);
        }
        reject(new Error('Mongo container did not become healthy in time.'));
    });
}

export async function handleDockerMongo(interaction, session) {
    const docker = new Docker();
    const networkName = 'ecbot-net';
    const containerName = 'ecbot-mongo';
    const mongoPort = 27017;

    const mongoUser = `user_${crypto.randomBytes(3).toString('hex')}`;
    const mongoPass = crypto.randomBytes(12).toString('hex');
    const mongoDb = 'eclipse-bot';

    try {
        const networks = await docker.listNetworks();
        if (!networks.find(n => n.Name === networkName)) {
            await docker.createNetwork({Name: networkName, Driver: 'bridge'});
            logger.info(`🌐 Created Docker network: ${networkName}`);
        }
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
        await old.remove({force: true});
        logger.info('♻️ Removed existing Mongo container');
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
            NetworkMode: networkName
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
    logger.info('🚀 Mongo container started.');

    await waitForMongoHealthy(container).catch(err => {
        logger.error(`❌ Mongo did not become healthy: ${err.message}`);
    });

    const newUri = `mongodb://${mongoUser}:${mongoPass}@${containerName}:${mongoPort}/${mongoDb}?authSource=admin`;
    const envPath = path.resolve(process.cwd(), '.env');
    let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    envContents = envContents.replace(/MONGO_URI=.*/g, '').trim();
    envContents += `\nMONGO_URI=${newUri}\nMONGO_USER=${mongoUser}\nMONGO_PASS=${mongoPass}\n`;
    fs.writeFileSync(envPath, envContents);

    process.env.MONGO_URI = newUri;
    session.choices.mongoUri = newUri;

    logger.info('✅ Mongo URI and credentials written to .env');

    await safeReply(interaction, {content: '✅ Mongo container deployed and connecting...', ephemeral: true});

    // Continue to next setup phase (DM wizard or otherwise)
    session.step = 'await_server_setup';
    session.dbReady = true;
}
