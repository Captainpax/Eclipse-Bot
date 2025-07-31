import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Docker from 'dockerode';
import logger from '../../../system/log/logHandler.mjs';

dotenv.config({override: true});

/**
 * Utility function to safely reply or follow up to an interaction
 * to avoid InteractionAlreadyReplied errors.
 */
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (err) {
        logger.error(`❌ Failed to send interaction reply: ${err.message}`);
    }
}

/**
 * Prompt user to choose how MongoDB will be configured.
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
export async function askDatabaseSetup(interaction, session) {
    const embed = new EmbedBuilder()
        .setTitle('📦 Database Setup')
        .setDescription(
            'Choose how you want to configure MongoDB.\n\n' +
            '🔧 **Docker**: Let me deploy Mongo automatically.\n' +
            '📝 **Manual**: You enter your own Mongo URI.'
        )
        .setColor(0x3498db);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('setup_db_docker')
            .setLabel('Use Docker')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('setup_db_manual')
            .setLabel('Enter URI')
            .setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, {embeds: [embed], components: [row], ephemeral: true});
}

/**
 * Prompt user to enter a Mongo URI via DM message.
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
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

/**
 * Handles the Docker MongoDB setup and injects the result into the env.
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
export async function handleDockerMongo(interaction, session) {
    const docker = new Docker();
    const containerName = 'ecbot-mongo';
    const mongoPort = 27017;
    const mongoUser = 'eclipse';
    const mongoPass = 'eclipse123';
    const mongoDb = 'eclipse-bot';

    // Step 1: Pull Mongo image
    await safeReply(interaction, {content: '📥 Pulling MongoDB image...', ephemeral: true});

    try {
        await new Promise((resolve, reject) => {
            docker.pull('mongo:6', (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, (err) => {
                    if (err) return reject(err);
                    logger.info('✅ Mongo image pulled.');
                    resolve();
                });
            });
        });
    } catch (err) {
        logger.error(`❌ Failed to pull image: ${err.message}`);
        return safeReply(interaction, {
            content: '❌ Failed to pull Mongo image. Check Docker permissions.',
            ephemeral: true
        });
    }

    // Step 2: Remove old container if exists
    try {
        const old = docker.getContainer(containerName);
        await old.remove({force: true});
        logger.info('♻️ Removed existing Mongo container');
    } catch (_) {
    }

    // Step 3: Start Mongo container
    const container = await docker.createContainer({
        name: containerName,
        Image: 'mongo:6',
        Env: [
            `MONGO_INITDB_ROOT_USERNAME=${mongoUser}`,
            `MONGO_INITDB_ROOT_PASSWORD=${mongoPass}`
        ],
        HostConfig: {
            PortBindings: {"27017/tcp": [{HostPort: `${mongoPort}`}]},
            RestartPolicy: {Name: 'always'},
            NetworkMode: 'bridge'
        }
    });
    await container.start();
    logger.info('🚀 Mongo container started.');

    // Step 4: Inject .env
    const envPath = path.resolve(process.cwd(), '.env');
    let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const newUri = `mongodb://${mongoUser}:${mongoPass}@localhost:${mongoPort}/${mongoDb}?authSource=admin`;

    if (!envContents.includes('MONGO_URI=')) {
        envContents += `\nMONGO_URI=${newUri}`;
    } else {
        envContents = envContents.replace(/MONGO_URI=.*/g, `MONGO_URI=${newUri}`);
    }
    fs.writeFileSync(envPath, envContents);
    process.env.MONGO_URI = newUri;
    session.choices.mongoUri = newUri;

    logger.info('✅ Mongo URI written to .env');
    await safeReply(interaction, {content: '✅ Mongo container deployed and connected.', ephemeral: true});
}
