/**
 * Test helper: sets up and tears down an in-memory MongoDB instance
 * for each test file using mongodb-memory-server.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

/**
 * Start the in-memory MongoDB server and connect Mongoose.
 * Call this in beforeAll().
 */
export async function setupDb() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

/**
 * Drop all collections between tests to ensure isolation.
 * Call this in afterEach().
 */
export async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Close the connection and stop the in-memory server.
 * Call this in afterAll().
 */
export async function teardownDb() {
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}
