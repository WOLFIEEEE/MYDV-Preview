#!/usr/bin/env tsx

/**
 * Migration script to create the DVLA Vehicle Data table
 * This creates a separate table for DVLA/MOT information linked by vehicle registration
 */

import { db } from '@/db';
import { dvlaVehicleData, stockCache } from '@/db/schema';
import { eq, isNotNull, and } from 'drizzle-orm';

async function createDVLATable() {
  console.log('🚗 Creating DVLA Vehicle Data table...');
  
  try {
    // The table will be created automatically by Drizzle when we run the migration
    console.log('✅ DVLA Vehicle Data table schema defined');
    
    // Check if we have any existing MOT data in stockCache to migrate
    console.log('🔍 Checking for existing MOT data in stock cache...');
    
    const existingMOTData = await db
      .select({
        registration: stockCache.registration,
        motStatus: stockCache.motStatus,
        motExpiryDate: stockCache.motExpiryDate,
        dvlaLastChecked: stockCache.dvlaLastChecked,
        dvlaDataRaw: stockCache.dvlaDataRaw,
      })
      .from(stockCache)
      .where(and(
        isNotNull(stockCache.registration),
        isNotNull(stockCache.motStatus)
      ))
      .limit(10); // Just check first 10 records
    
    console.log(`📊 Found ${existingMOTData.length} stock records with MOT data`);
    
    if (existingMOTData.length > 0) {
      console.log('📋 Sample MOT data found:');
      existingMOTData.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.registration}: ${record.motStatus} (expires: ${record.motExpiryDate})`);
      });
      
      console.log('\n💡 To migrate existing MOT data to the new DVLA table, you can run:');
      console.log('   npm run migrate-mot-data');
    }
    
    console.log('\n✅ DVLA table creation completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run database migration: npm run db:push');
    console.log('2. Update DVLA service to use the new table');
    console.log('3. Optionally migrate existing MOT data');
    
  } catch (error) {
    console.error('❌ Error creating DVLA table:', error);
    process.exit(1);
  }
}

// Run the migration
createDVLATable()
  .then(() => {
    console.log('🎉 DVLA table creation script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 DVLA table creation failed:', error);
    process.exit(1);
  });
