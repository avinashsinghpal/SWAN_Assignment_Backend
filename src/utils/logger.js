/**
 * Structured logger utility.
 * Uses console with JSON output so logs are parseable by log aggregators.
 * Sensitive fields (password, token) are never logged.
 */

import { IS_PRODUCTION } from '../config/index.js';

const SENSITIVE_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'cookie']);

/**
 * Recursively strip sensitive keys from an object before logging.
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function sanitise(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) return [k, '[REDACTED]'];
      if (typeof v === 'object') return [k, sanitise(v)];
      return [k, v];
    })
  );
}

/**
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
function log(level, message, meta) {
  if (level === 'debug' && IS_PRODUCTION) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? sanitise(meta) : {}),
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  info: (msg, meta) => log('info', msg, meta),
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  warn: (msg, meta) => log('warn', msg, meta),
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  error: (msg, meta) => log('error', msg, meta),
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  debug: (msg, meta) => log('debug', msg, meta),
};
