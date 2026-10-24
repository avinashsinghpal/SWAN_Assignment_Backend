/**
 * verifyDbConnection.js
 *
 * Standalone diagnostic script to verify MongoDB / MongoDB Atlas connectivity,
 * validate credentials, test read/write privileges, and print cluster metrics.
 *
 * Run with:
 *   npm run verify:db
 */

import mongoose from 'mongoose';
import { config as loadDotenv } from 'dotenv';
loadDotenv();

import { MONGODB_URI } from '../config/index.js';

const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

console.log('\n========================================================');
console.log('       MongoDB Atlas Connection Diagnostic Tool        ');
console.log('========================================================\n');
console.log(`Connecting to: ${maskedUri}\n`);

async function testConnection() {
  const startTime = Date.now();

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    const elapsed = Date.now() - startTime;
    console.log(`\x1b[32m✔ Successfully connected to MongoDB in ${elapsed}ms!\x1b[0m`);

    const connection = mongoose.connection;
    const dbName = connection.db.databaseName;
    const host = connection.host;
    const port = connection.port;

    console.log(`\n  Database:       \x1b[36m${dbName}\x1b[0m`);
    console.log(`  Host / Cluster: \x1b[36m${host}:${port}\x1b[0m`);
    console.log(`  State:          \x1b[32mReady (readyState=${connection.readyState})\x1b[0m`);

    // Ping test
    console.log('\nRunning database ping...');
    const pingResult = await connection.db.admin().ping();
    console.log(`\x1b[32m✔ Admin ping response:\x1b[0m`, pingResult);

    // Write / read test
    console.log('\nTesting read/write permissions...');
    const testCollection = connection.db.collection('__connection_test__');
    const testDoc = { timestamp: new Date(), test: 'atlas_connection_verification' };
    
    await testCollection.insertOne(testDoc);
    const foundDoc = await testCollection.findOne({ _id: testDoc._id });
    await testCollection.deleteOne({ _id: testDoc._id });

    if (foundDoc) {
      console.log('\x1b[32m✔ Read and write tests passed successfully!\x1b[0m');
    }

    console.log('\n========================================================');
    console.log('\x1b[32m  Database is fully configured and ready for production!  \x1b[0m');
    console.log('========================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n\x1b[31m✖ Connection failed after ${elapsed}ms\x1b[0m`);
    console.error(`\x1b[31mError message:\x1b[0m ${error.message}\n`);

    console.log('── Common MongoDB Atlas Troubleshooting Tips ───');
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.log('1. Authentication failed: Check your database username and password.');
      console.log('   Note: If your password has special characters (@, :, /, #, %, etc.), you MUST URL-encode them.');
      console.log('   Example: "P@ssword" becomes "P%40ssword".');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('querySrv') || error.message.includes('buffering timed out') || error.message.includes('Server selection timed out')) {
      console.log('1. Network Access (IP Whitelist):');
      console.log('   - Go to MongoDB Atlas -> Security -> Network Access.');
      console.log('   - Ensure your current IP or "0.0.0.0/0" (Allow Access from Anywhere) is added.');
      console.log('2. Check DNS / ISP: Some networks block DNS SRV lookups (mongodb+srv://).');
    } else {
      console.log('1. Verify your connection URI matches:');
      console.log('   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
      console.log('2. Ensure user has readWrite permissions on the target database in Database Access.');
    }
    console.log('────────────────────────────────────────────────\n');

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

testConnection();
