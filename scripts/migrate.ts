#!/usr/bin/env tsx

// Load environment variables from .env.local FIRST
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local explicitly before any other imports
config({ path: join(process.cwd(), '.env.local') });

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, client } from '@/lib/db'

async function main() {
  console.log('🚀 Starting database migration...')
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

main() 