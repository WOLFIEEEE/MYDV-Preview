import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function makeEmailOptional() {
  try {
    console.log('Making email column nullable in customers table...');
    
    // Alter the customers table to make email nullable
    await db.execute(sql`
      ALTER TABLE "customers" 
      ALTER COLUMN "email" DROP NOT NULL
    `);

    console.log('✅ Email column is now nullable in customers table');
    
    // Also update the email index to handle null values
    console.log('Updating email index to handle null values...');
    
    // Drop the existing index if it exists
    await db.execute(sql`
      DROP INDEX IF EXISTS "customers_email_idx"
    `);
    
    // Recreate the index with a partial index that excludes null values
    await db.execute(sql`
      CREATE INDEX "customers_email_idx" ON "customers" ("email") 
      WHERE "email" IS NOT NULL
    `);

    console.log('✅ Email index updated to handle null values');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error making email optional:', error);
    process.exit(1);
  }
}

makeEmailOptional();
