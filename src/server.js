/**
 * server.js - HTTP server entry point.
 *
 * Responsibilities:
 * 1. Connect to MongoDB (fail fast if unable)
 * 2. Start listening on the configured port
 * 3. Handle graceful shutdown on SIGTERM / SIGINT
 *
 * Kept separate from app.js so that tests can import app.js without starting
 * a real HTTP listener or requiring a live DB connection.
 */

import mongoose from 'mongoose';
import app from './app.js';
import { PORT, MONGODB_URI, NODE_ENV, IS_PRODUCTION } from './config/index.js';
import { logger } from './utils/logger.js';

let server;

/**
 * MongoDB connection options optimized for production and MongoDB Atlas clusters.
 */
const MONGOOSE_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  autoIndex: !IS_PRODUCTION,
};

// Connection event listeners for monitoring cluster health
mongoose.connection.on('connected', () => {
  logger.info('Mongoose default connection open');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Reconnecting...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { message: err.message });
});

/**
 * Connect to MongoDB then start the HTTP server.
 */
async function start() {
  try {
    await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);
    logger.info('MongoDB connected', {
      uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
    });

    server = app.listen(PORT, () => {
      logger.info(`Server started`, { port: PORT, env: NODE_ENV });
    });
  } catch (err) {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler.
 * Closes the HTTP server (stops accepting new connections), then
 * closes the MongoDB connection, then exits.
 *
 * @param {string} signal
 */
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  // Give the server a moment to finish in-flight requests then exit
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

start();
