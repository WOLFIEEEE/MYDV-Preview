// Explicitly load environment variables from .env.local
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local explicitly
config({ path: join(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('❌ DATABASE_URL environment variable is not set')
}

// Validate the connection string format
const urlPattern = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^/]+$/;
if (!urlPattern.test(connectionString)) {
  console.error('❌ Invalid DATABASE_URL format. Expected format:');
  console.error('postgresql://username:password@host:port/database');
  console.error('📍 Current value:', connectionString);
  throw new Error('DATABASE_URL is not in the correct format');
}

// Create a postgres client
const client = postgres(connectionString, {
  prepare: false,
});

// Create drizzle instance
export const db = drizzle(client, { schema })

// Export the client for potential direct usage
export { client } 