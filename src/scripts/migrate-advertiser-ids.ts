/**
 * Migration Script: Legacy to Enhanced Advertiser ID Fields
 * 
 * This script migrates existing store configurations from legacy advertiser ID fields
 * to the new enhanced fields for better consistency and standardization.
 */

import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq, isNotNull, or } from 'drizzle-orm';
import { convertLegacyToEnhanced, isUsingLegacyFieldsOnly, logAdvertiserIdResolution } from '@/lib/advertiserIdResolver';

interface MigrationStats {
  totalRecords: number;
  legacyOnlyRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  errors: Array<{ id: string; email: string; error: string }>;
}

/**
 * Main migration function
 */
export async function migrateAdvertiserIds(dryRun: boolean = true): Promise<MigrationStats> {
  console.log(`🔄 Starting advertiser ID migration (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...`);
  
  const stats: MigrationStats = {
    totalRecords: 0,
    legacyOnlyRecords: 0,
    migratedRecords: 0,
    skippedRecords: 0,
    errorRecords: 0,
    errors: []
  };

  try {
    // Get all store configs that have any advertiser ID fields
    const storeConfigs = await db
      .select()
      .from(storeConfig)
      .where(
        or(
          isNotNull(storeConfig.primaryAdvertisementId),
          isNotNull(storeConfig.advertisementIds),
          isNotNull(storeConfig.advertisementId),
          isNotNull(storeConfig.additionalAdvertisementIds)
        )
      );

    stats.totalRecords = storeConfigs.length;
    console.log(`📊 Found ${stats.totalRecords} store configurations with advertiser ID fields`);

    for (const config of storeConfigs) {
      try {
        console.log(`\n🔍 Processing store config: ${config.email} (ID: ${config.id})`);
        
        // Log current state
        logAdvertiserIdResolution(config, `migration-${config.email}`);
        
        // Check if this config is using legacy fields only
        if (isUsingLegacyFieldsOnly(config)) {
          stats.legacyOnlyRecords++;
          console.log(`📋 Legacy-only configuration detected for: ${config.email}`);
          
          // Convert legacy fields to enhanced format
          const enhancedFields = convertLegacyToEnhanced(config);
          
          console.log(`🔄 Conversion result:`, {
            advertisementId: enhancedFields.advertisementId,
            additionalAdvertisementIds: enhancedFields.additionalAdvertisementIds
          });
          
          if (enhancedFields.advertisementId) {
            if (!dryRun) {
              // Perform actual migration
              await db
                .update(storeConfig)
                .set({
                  advertisementId: enhancedFields.advertisementId,
                  additionalAdvertisementIds: enhancedFields.additionalAdvertisementIds,
                  updatedAt: new Date()
                })
                .where(eq(storeConfig.id, config.id));
              
              console.log(`✅ Successfully migrated: ${config.email}`);
            } else {
              console.log(`✅ Would migrate: ${config.email} (DRY RUN)`);
            }
            
            stats.migratedRecords++;
          } else {
            console.log(`⚠️ No valid advertiser ID found for: ${config.email}`);
            stats.skippedRecords++;
          }
        } else {
          console.log(`✅ Already using enhanced fields or mixed configuration: ${config.email}`);
          stats.skippedRecords++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${config.email}:`, error);
        stats.errorRecords++;
        stats.errors.push({
          id: config.id.toString(),
          email: config.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Print summary
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total Records: ${stats.totalRecords}`);
    console.log(`   Legacy-Only Records: ${stats.legacyOnlyRecords}`);
    console.log(`   ${dryRun ? 'Would Migrate' : 'Migrated'}: ${stats.migratedRecords}`);
    console.log(`   Skipped: ${stats.skippedRecords}`);
    console.log(`   Errors: ${stats.errorRecords}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      stats.errors.forEach(error => {
        console.log(`   - ${error.email}: ${error.error}`);
      });
    }

    if (dryRun) {
      console.log(`\n💡 This was a DRY RUN. To perform the actual migration, run with dryRun=false`);
    } else {
      console.log(`\n✅ Migration completed successfully!`);
    }

  } catch (error) {
    console.error(`❌ Fatal error during migration:`, error);
    throw error;
  }

  return stats;
}

/**
 * Validation function to check migration results
 */
export async function validateMigration(): Promise<void> {
  console.log(`🔍 Validating migration results...`);
  
  const storeConfigs = await db
    .select()
    .from(storeConfig)
    .where(
      or(
        isNotNull(storeConfig.primaryAdvertisementId),
        isNotNull(storeConfig.advertisementIds),
        isNotNull(storeConfig.advertisementId),
        isNotNull(storeConfig.additionalAdvertisementIds)
      )
    );

  let legacyOnlyCount = 0;
  let enhancedCount = 0;
  let mixedCount = 0;

  for (const config of storeConfigs) {
    const hasEnhanced = !!(config.advertisementId || config.additionalAdvertisementIds);
    const hasLegacy = !!(config.primaryAdvertisementId || config.advertisementIds);
    
    if (hasEnhanced && hasLegacy) {
      mixedCount++;
    } else if (hasEnhanced) {
      enhancedCount++;
    } else if (hasLegacy) {
      legacyOnlyCount++;
    }
  }

  console.log(`📊 Validation Results:`);
  console.log(`   Enhanced-only: ${enhancedCount}`);
  console.log(`   Mixed (Enhanced + Legacy): ${mixedCount}`);
  console.log(`   Legacy-only: ${legacyOnlyCount}`);
  console.log(`   Total: ${storeConfigs.length}`);
  
  if (legacyOnlyCount > 0) {
    console.log(`⚠️ ${legacyOnlyCount} configurations still using legacy fields only`);
  } else {
    console.log(`✅ All configurations have enhanced fields available`);
  }
}

/**
 * CLI interface for running the migration
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const dryRun = !args.includes('--live');
  
  switch (command) {
    case 'migrate':
      migrateAdvertiserIds(dryRun)
        .then(stats => {
          console.log(`\n🎉 Migration completed with stats:`, stats);
          process.exit(0);
        })
        .catch(error => {
          console.error(`💥 Migration failed:`, error);
          process.exit(1);
        });
      break;
      
    case 'validate':
      validateMigration()
        .then(() => {
          console.log(`\n✅ Validation completed`);
          process.exit(0);
        })
        .catch(error => {
          console.error(`💥 Validation failed:`, error);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
📋 Advertiser ID Migration Tool

Usage:
  npm run migrate-advertiser-ids migrate [--live]  # Migrate legacy fields (default: dry run)
  npm run migrate-advertiser-ids validate          # Validate migration results

Options:
  --live    Perform actual migration (default is dry run)

Examples:
  npm run migrate-advertiser-ids migrate           # Dry run migration
  npm run migrate-advertiser-ids migrate --live    # Live migration
  npm run migrate-advertiser-ids validate          # Validate results
      `);
      process.exit(0);
  }
}
