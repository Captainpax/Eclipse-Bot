import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Docker from 'dockerode';
import logger from '../../../system/log/logHandler.mjs';

dotenv.config({override: true});

/**
 * Prompt user to choose how MongoDB will be configured.
 * @param {import('discord.js').Interaction} interaction
 * @param {Object} session
 */
export async function askDatabaseSetup(interaction, session) {
    const embed = new EmbedBuilder()
        .setTitle('📦 Database Setup')
        .setDescription('Choose how you want to configure MongoDB.\n\n🔧 **Docker**: Let me deploy Mongo automatically.\n📝 **Manual**: You enter your own Mongo URI.')
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

    await interaction.reply({embeds: [embed], components: [row], ephemeral: true});
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

    await interaction.reply({embeds: [embed], ephemeral: true});
    await session.dm.send({embeds: [embed]});
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
    await interaction.reply({content: '📥 Pulling MongoDB image...', ephemeral: true});
    await docker.pull('mongo:6', {}, (err, stream) => {
        if (err) return logger.error(`❌ Failed to pull image: ${err.message}`);
        docker.modem.followProgress(stream, () => {
            logger.log('✅ Mongo image pulled.');
        });
    });

    // Step 2: Remove old container if exists
    try {
        const old = docker.getContainer(containerName);
        await old.remove({force: true});
        logger.log('♻️ Removed existing Mongo container');
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
            PortBindings: {
                "27017/tcp": [{HostPort: `${mongoPort}`}]
            },
            RestartPolicy: {Name: 'always'},
            NetworkMode: 'bridge'
        }
    });
    await container.start();
    logger.log('🚀 Mongo container started.');

    // Step 4: Inject .env
    const newUri = `mongodb://${mongoUser}:${mongoPass}@localhost:${mongoPort}/${mongoDb}?authSource=admin`;
    // Update the .env and process.env values via helper
    try {
        injectMongoUri(newUri);
        session.choices.mongoUri = newUri;
        logger.log('✅ Mongo URI written to .env');
    } catch (e) {
        logger.error(`❌ Failed to write Mongo URI to .env: ${e.message}`);
    }
    await interaction.followUp({content: '✅ Mongo container deployed and connected.', ephemeral: true});
}

/**
 * Injects the given Mongo URI into the runtime environment and .env file.
 *
 * This helper ensures that the MONGO_URI key exists in the project's
 * `.env` file and updates its value accordingly. It also assigns the
 * same URI to `process.env.MONGO_URI` so subsequent code that relies
 * on environment variables can immediately read it.
 *
 * @param {string} uri The Mongo connection string
 * @returns {string} The URI that was written
 */
export function injectMongoUri(uri) {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (!envContents.includes('MONGO_URI=')) {
        envContents += `\nMONGO_URI=${uri}`;
    } else {
        envContents = envContents.replace(/MONGO_URI=.*/g, `MONGO_URI=${uri}`);
    }
    fs.writeFileSync(envPath, envContents);
    process.env.MONGO_URI = uri;
    return uri;
}
