import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to add DVLA/MOT fields to stock_cache table
 * Run this script to add the new MOT-related columns
 */
async function addDVLAMOTFields() {
  console.log('🚀 Starting DVLA/MOT fields migration...');

  try {
    // Add MOT status column
    await db.execute(sql`
      ALTER TABLE stock_cache 
      ADD COLUMN IF NOT EXISTS mot_status VARCHAR(50)
    `);
    console.log('✅ Added mot_status column');

    // Add MOT expiry date column
    await db.execute(sql`
      ALTER TABLE stock_cache 
      ADD COLUMN IF NOT EXISTS mot_expiry_date TIMESTAMP
    `);
    console.log('✅ Added mot_expiry_date column');

    // Add DVLA last checked timestamp
    await db.execute(sql`
      ALTER TABLE stock_cache 
      ADD COLUMN IF NOT EXISTS dvla_last_checked TIMESTAMP
    `);
    console.log('✅ Added dvla_last_checked column');

    // Add DVLA raw data JSON column
    await db.execute(sql`
      ALTER TABLE stock_cache 
      ADD COLUMN IF NOT EXISTS dvla_data_raw JSONB
    `);
    console.log('✅ Added dvla_data_raw column');

    // Add indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stock_cache_mot_status 
      ON stock_cache(mot_status)
    `);
    console.log('✅ Added mot_status index');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stock_cache_mot_expiry 
      ON stock_cache(mot_expiry_date)
    `);
    console.log('✅ Added mot_expiry_date index');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stock_cache_dvla_last_checked 
      ON stock_cache(dvla_last_checked)
    `);
    console.log('✅ Added dvla_last_checked index');

    console.log('🎉 DVLA/MOT fields migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addDVLAMOTFields()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { addDVLAMOTFields };
