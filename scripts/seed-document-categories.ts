#!/usr/bin/env tsx

// Load environment variables from .env.local FIRST
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local explicitly before any other imports
config({ path: join(process.cwd(), '.env.local') });

import { db, client } from '@/lib/db'
import { documentCategories } from '@/db/schema'

async function main() {
  console.log('🌱 Seeding document categories...')
  
  try {
    // Insert default system document categories
    const defaultCategories = [
      {
        categoryName: 'v5c',
        displayName: 'V5C Registration Document',
        description: 'Vehicle registration certificate (log book)',
        isRequired: true,
        hasExpiry: false,
        acceptsMultiple: false,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 1
      },
      {
        categoryName: 'mot',
        displayName: 'MOT Certificate',
        description: 'Ministry of Transport test certificate',
        isRequired: true,
        hasExpiry: true,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 2
      },
      {
        categoryName: 'service_history',
        displayName: 'Service History',
        description: 'Vehicle service records and maintenance history',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 3
      },
      {
        categoryName: 'insurance',
        displayName: 'Insurance Documents',
        description: 'Vehicle insurance certificates and policies',
        isRequired: false,
        hasExpiry: true,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 4
      },
      {
        categoryName: 'warranty',
        displayName: 'Warranty Documents',
        description: 'Vehicle warranty certificates and terms',
        isRequired: false,
        hasExpiry: true,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 5
      },
      {
        categoryName: 'invoice',
        displayName: 'Purchase Invoice',
        description: 'Vehicle purchase invoices and receipts',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 6
      },
      {
        categoryName: 'keys',
        displayName: 'Key Information',
        description: 'Spare keys, key codes, and key-related documents',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 5,
        isSystem: true,
        sortOrder: 7
      },
      {
        categoryName: 'manual',
        displayName: 'Owner\'s Manual',
        description: 'Vehicle owner\'s manual and handbooks',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 20,
        isSystem: true,
        sortOrder: 8
      },
      {
        categoryName: 'inspection',
        displayName: 'Inspection Reports',
        description: 'Vehicle inspection and condition reports',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 9
      },
      {
        categoryName: 'finance',
        displayName: 'Finance Documents',
        description: 'Vehicle finance agreements and settlements',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maxFileSizeMb: 10,
        isSystem: true,
        sortOrder: 10
      },
      {
        categoryName: 'other',
        displayName: 'Other Documents',
        description: 'Miscellaneous vehicle-related documents',
        isRequired: false,
        hasExpiry: false,
        acceptsMultiple: true,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        maxFileSizeMb: 15,
        isSystem: true,
        sortOrder: 99
      }
    ];

    console.log(`📝 Inserting ${defaultCategories.length} document categories...`);

    for (const category of defaultCategories) {
      try {
        await db.insert(documentCategories).values({
          dealerId: null, // System categories
          ...category
        });
        console.log(`✅ Inserted category: ${category.displayName}`);
      } catch (error: any) {
        if (error.message?.includes('duplicate') || error.cause?.message?.includes('duplicate')) {
          console.log(`⚠️  Category ${category.displayName} already exists, skipping`);
        } else {
          console.error(`❌ Failed to insert ${category.displayName}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Document categories seeded successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

main()
