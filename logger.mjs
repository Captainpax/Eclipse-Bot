/*
 * logger.mjs
 *
 * A lightweight logging utility for the Eclipse Discord bot. This module
 * wraps the standard console methods with colourful output using the
 * Chalk library. Log entries are timestamped in ISO‑8601 format and
 * prefixed with a log level to make console output easy to scan.
 *
 * Chalk provides an expressive API for terminal string styling and
 * supports 16‑million‑colour TrueColor output by default【372610093081640†L45-L51】.  Because
 * Chalk 5 is an ESM‑only package, this file uses ECMAScript module
 * syntax. To enable or disable debug logging, set the `DEBUG`
 * environment variable in your `.env` file. You can load environment
 * variables with the `dotenv` package【319443188897145†L35-L38】.
 */

import chalk from 'chalk';
import path from 'node:path';

/**
 * Extract call site information (file, function and line number) from a stack trace.
 * This helper inspects the current stack and returns the first frame outside
 * of the logger module. It supports frames of the form "at fn (file:line:col)"
 * and "at file:line:col". The file name is stripped down to its basename.
 *
 * @returns {{fileName?: string, functionName?: string, lineNumber?: string}} Object containing call site details.
 */
function getCallSiteDetails() {
  const obj = {};
  // Capture a stack trace, skipping this helper to avoid including it in the trace
  Error.captureStackTrace(obj, getCallSiteDetails);
  const stack = obj.stack?.split('\n') || [];
  for (const line of stack) {
    const trimmed = line.trim();
    // Skip frames that are inside this logger file
    if (trimmed.includes('logger.mjs')) continue;
    // Try to match "at function (file:line:col)"
    let match = trimmed.match(/^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/);
    if (match) {
      const [, functionName, filePath, lineNumber] = match;
      return {
        functionName,
        fileName: path.basename(filePath),
        lineNumber,
      };
    }
    // Try to match "at file:line:col"
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

/**
 * Format call site details into a human‑readable string.
 * Example output: "[initmain.mjs main 42]". Parts are omitted if unknown.
 *
 * @returns {string}
 */
function formatSourceInfo() {
  const { fileName, functionName, lineNumber } = getCallSiteDetails();
  if (!fileName) return '';
  const parts = [];
  if (fileName) parts.push(fileName);
  if (functionName) parts.push(functionName);
  if (lineNumber) parts.push(lineNumber);
  return `[${parts.join(' ')}]`;
}

/**
 * Generate an ISO‑8601 timestamp for log messages.
 *
 * @returns {string} The current timestamp.
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format a log message with a coloured level and timestamp.
 *
 * @param {string} level - The log level label (e.g. INFO, WARN).
 * @param {Function} colorFn - The Chalk function used to colour the label.
 * @returns {string} Formatted prefix for log messages.
 */
function formatPrefix(level, colorFn) {
  const timestamp = getTimestamp();
  return `${colorFn(`[${level}]`)} ${chalk.gray(timestamp)}`;
}

/**
 * Core logging function. Delegates to console methods based on
 * severity and colours the level indicator. Additional arguments are
 * passed straight through to the console.*
 *
 * @param {string} level - The log level name.
 * @param {Function} colorFn - The Chalk function used to colour the prefix.
 * @param {Function} consoleFn - The console method to invoke.
 * @param {Array<*>} args - Arguments to log.
 */
function log(level, colorFn, consoleFn, ...args) {
  const prefix = formatPrefix(level, colorFn);
  const sourceInfo = formatSourceInfo();
  if (sourceInfo) {
    consoleFn(prefix, chalk.white(sourceInfo), ...args);
  } else {
    consoleFn(prefix, ...args);
  }
}

/**
 * Log an informational message. Intended for regular runtime events.
 *
 * @param {...*} args - The message and optional substitution values.
 */
function info(...args) {
  log('INFO', chalk.cyan, console.log, ...args);
}

/**
 * Log a warning message. Use for recoverable issues or potential problems.
 *
 * @param {...*} args - The message and optional substitution values.
 */
function warn(...args) {
  log('WARN', chalk.yellow, console.warn, ...args);
}

/**
 * Log an error message. Use for unexpected exceptions or critical failures.
 *
 * @param {...*} args - The message and optional substitution values.
 */
function error(...args) {
  log('ERROR', chalk.red, console.error, ...args);
}

/**
 * Log a success message. Use after completing a task successfully.
 *
 * @param {...*} args - The message and optional substitution values.
 */
function success(...args) {
  log('SUCCESS', chalk.green, console.log, ...args);
}

/**
 * Log a debug message. Only outputs when the DEBUG environment variable is
 * set to a truthy value (e.g. "true", "1"). Debug messages are coloured
 * magenta. Adjust DEBUG in your `.env` to see verbose output without
 * modifying your code.
 *
 * @param {...*} args - The message and optional substitution values.
 */
function debug(...args) {
  const debugEnabled = process.env.DEBUG?.toLowerCase() === 'true' || process.env.DEBUG === '1';
  if (debugEnabled) {
    log('DEBUG', chalk.magenta, console.debug, ...args);
  }
}

// Export individual functions as named exports and a default logger object
export { info, warn, error, success, debug };
export default {
  info,
  warn,
  error,
  success,
  debug,
};