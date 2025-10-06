import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local explicitly
config({ path: join(process.cwd(), '.env.local') });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
}); 