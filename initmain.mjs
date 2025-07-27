// initmain.mjs

import 'dotenv/config';
import logger from './logger.mjs';
import DiscordBot from './discord.mjs';
import ArchipelagoBot from './archipelago.mjs';

// Trim and normalize environment variables
const env = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value?.trim()])
);

const {
  DISCORD_TOKEN,
  DISCORD_CHANNEL_ID,
  ARCHIPELAGO_SERVER,
  ARCHIPELAGO_SLOT,
  ARCHIPELAGO_PASSWORD,
  DEBUG,
} = env;

async function main() {
  logger.debug('Loading environment configuration');

  if (DEBUG?.toLowerCase() === 'true' || DEBUG === '1') {
    logger.debug('Resolved environment:', env);
  }

  if (!DISCORD_TOKEN) {
    logger.error('Missing DISCORD_TOKEN in environment');
    return;
  }
  if (!DISCORD_CHANNEL_ID) {
    logger.error('Missing DISCORD_CHANNEL_ID in environment');
    return;
  }
  if (!ARCHIPELAGO_SERVER || !ARCHIPELAGO_SLOT) {
    logger.error('Missing ARCHIPELAGO_SERVER or ARCHIPELAGO_SLOT in environment');
    return;
  }

  const discordBot = new DiscordBot();
  const apBot = new ArchipelagoBot();

  try {
    logger.info('Connecting to Archipelago server...');
    await apBot.connect(ARCHIPELAGO_SERVER, ARCHIPELAGO_SLOT, ARCHIPELAGO_PASSWORD);
  } catch (err) {
    logger.error('Unable to continue without Archipelago connection');
    if (DEBUG) logger.debug(err.stack || err);
    return;
  }

  try {
    logger.info('Connecting to Discord...');
    await discordBot.start(DISCORD_TOKEN);
  } catch (err) {
    logger.error('Unable to continue without Discord connection');
    if (DEBUG) logger.debug(err.stack || err);
    return;
  }

  apBot.onMessage(async (content) => {
    const message = `[AP] ${content}`;
    try {
      await discordBot.sendMessage(DISCORD_CHANNEL_ID, message);
    } catch (err) {
      logger.warn('Failed to relay message to Discord:', err.message || err);
    }
  });

  discordBot.onMessage(async (message) => {
    try {
      if (message.author.bot) return;
      if (message.channelId !== DISCORD_CHANNEL_ID) return;
      await apBot.sendChat(`${message.author.username}: ${message.content}`);
    } catch (err) {
      logger.error('Error relaying Discord message to Archipelago:', err);
    }
  });

  logger.success('Eclipse bot is up and running');
}

main().catch((err) => {
  logger.error('Fatal error in main execution:', err);
});
