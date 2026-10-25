/**
 * Application configuration loaded from environment variables.
 * All process.env access is centralised here so the rest of the app
 * never touches process.env directly.
 */

import { config as loadDotenv } from 'dotenv';
loadDotenv();

/** @type {string} */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/** @type {boolean} */
export const IS_PRODUCTION = NODE_ENV === 'production';

/** @type {number} */
export const PORT = parseInt(process.env.PORT || '5000', 10);

/** @type {string} */
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swan_lms';

/** @type {string} */
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

/** @type {string} */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** @type {boolean} */
export const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

/** @type {string} */
export const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';

/** @type {number} */
export const COOKIE_MAX_AGE_MS = parseInt(process.env.COOKIE_MAX_AGE_MS || '604800000', 10);

/** @type {string[]} */
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

/** @type {number} */
export const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000',
  10
);

/** @type {number} */
export const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10);

/** @type {string} */
export const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'swan_admin_secret_key_2026';

// Validate production configuration
if (IS_PRODUCTION) {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1')) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[WARNING] NODE_ENV is set to "production", but MONGODB_URI appears to be using a local database. For production, supply a valid MongoDB Atlas connection string.'
    );
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('fallback') || process.env.JWT_SECRET.length < 32) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[WARNING] JWT_SECRET is using a default or short key. In production, set a strong, random 64+ char secret in .env.'
    );
  }
}
