// system/log/logHandler.mjs

import chalk from 'chalk';
import path from 'node:path';

let discordLogger = null;
let logLevel = 'low'; // "low" | "debug" | "high"

/**
 * Sets the Discord logger and optional verbosity level.
 * @param {object} logger - Must have sendToLogChannel(msg)
 * @param {'low'|'debug'|'high'} level
 */
function setDiscordLogger(logger, level = 'low') {
  discordLogger = logger;
  logLevel = level.toLowerCase();
}

/**
 * Retrieves the call site file, function, and line.
 */
function getCallSiteDetails() {
  const obj = {};
  Error.captureStackTrace(obj, getCallSiteDetails);
  const stack = obj.stack?.split('\n') || [];

  for (const line of stack) {
    const trimmed = line.trim();
    if (trimmed.includes('logHandler.mjs')) continue;

    let match = trimmed.match(/^at\s+(.*?)\s+\((.*?):(\d+):\d+\)$/);
    if (match) {
      const [, functionName, filePath, lineNumber] = match;
      return {
        functionName,
        fileName: path.basename(filePath),
        lineNumber,
      };
    }

    match = trimmed.match(/^at\s+(.*?):(\d+):\d+$/);
    if (match) {
      const [, filePath, lineNumber] = match;
      return {
        functionName: undefined,
        fileName: path.basename(filePath),
        lineNumber,
      };
    }
  }

  return {};
}

/**
 * Formats a source string like "[filename function line]"
 */
function formatSourceInfo() {
  const { fileName, functionName, lineNumber } = getCallSiteDetails();
  const parts = [];
  if (fileName) parts.push(fileName);
  if (functionName) parts.push(functionName);
  if (lineNumber) parts.push(lineNumber);
  return parts.length ? `[${parts.join(' ')}]` : '';
}

/**
 * Timestamp in ISO format
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Standard log line prefix with level and timestamp
 */
function formatPrefix(level, colorFn) {
  return `${colorFn(`[${level}]`)} ${chalk.gray(getTimestamp())}`;
}

/**
 * Main logger core
 */
function log(level, colorFn, consoleFn, ...args) {
  const prefix = formatPrefix(level, colorFn);
  const sourceInfo = formatSourceInfo();
  const output = sourceInfo ? [prefix, chalk.white(sourceInfo), ...args] : [prefix, ...args];
  consoleFn(...output);

  const shouldSend = ['debug', 'high'].includes(logLevel);
  if (discordLogger && shouldSend) {
    const plain = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    discordLogger.sendToLogChannel(`${level.toUpperCase()} ${plain}`).catch(() => {
    });
  }
}

// Log level shorthands
function info(...args) {
  log('INFO', chalk.cyan, console.log, ...args);
}

function warn(...args) {
  log('WARN', chalk.yellow, console.warn, ...args);
}

function error(...args) {
  log('ERROR', chalk.red, console.error, ...args);
}

function success(...args) {
  log('SUCCESS', chalk.green, console.log, ...args);
}

function debug(...args) {
  const enabled = process.env.DEBUG?.toLowerCase() === 'true' || process.env.DEBUG === '1' || logLevel === 'debug';
  if (enabled) {
    log('DEBUG', chalk.magenta, console.debug, ...args);
  }
}

export {
  info,
  warn,
  error,
  success,
  debug,
  setDiscordLogger,
};

export default {
  info,
  warn,
  error,
  success,
  debug,
  setDiscordLogger,
};
