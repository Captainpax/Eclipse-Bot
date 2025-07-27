import chalk from 'chalk';
import path from 'node:path';
import { fileURLToPath } from 'url';

let discordLogger = null;
let logLevel = 'low';

function setDiscordLogger(logger, level = 'low') {
  discordLogger = logger;
  logLevel = level.toLowerCase();
}

function getCallSiteDetails() {
  const obj = {};
  Error.captureStackTrace(obj, getCallSiteDetails);
  const stack = obj.stack?.split('\n') || [];
  for (const line of stack) {
    const trimmed = line.trim();
    if (trimmed.includes('logger.mjs')) continue;
    let match = trimmed.match(/^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/);
    if (match) {
      const [, functionName, filePath, lineNumber] = match;
      return {
        functionName,
        fileName: path.basename(filePath),
        lineNumber,
      };
    }
    match = trimmed.match(/^at\s+(.*?):(\d+):(\d+)$/);
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

function formatSourceInfo() {
  const { fileName, functionName, lineNumber } = getCallSiteDetails();
  if (!fileName) return '';
  const parts = [];
  if (fileName) parts.push(fileName);
  if (functionName) parts.push(functionName);
  if (lineNumber) parts.push(lineNumber);
  return `[${parts.join(' ')}]`;
}

function getTimestamp() {
  return new Date().toISOString();
}

function formatPrefix(level, colorFn) {
  const timestamp = getTimestamp();
  return `${colorFn(`[${level}]`)} ${chalk.gray(timestamp)}`;
}

function log(level, colorFn, consoleFn, ...args) {
  const prefix = formatPrefix(level, colorFn);
  const sourceInfo = formatSourceInfo();
  const output = sourceInfo ? [prefix, chalk.white(sourceInfo), ...args] : [prefix, ...args];
  consoleFn(...output);

  // Send to Discord log channel if debug or high level logging
  if (discordLogger && ['debug', 'high'].includes(logLevel)) {
    const plainMsg = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    discordLogger.sendToLogChannel(`${level.toUpperCase()} ${plainMsg}`).catch(() => {});
  }
}

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
  const debugEnabled = process.env.DEBUG?.toLowerCase() === 'true' || process.env.DEBUG === '1';
  if (debugEnabled || logLevel === 'debug') {
    log('DEBUG', chalk.magenta, console.debug, ...args);
  }
}

export { info, warn, error, success, debug, setDiscordLogger };
export default {
  info,
  warn,
  error,
  success,
  debug,
  setDiscordLogger
};
