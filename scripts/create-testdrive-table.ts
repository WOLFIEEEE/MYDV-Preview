import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function createTestDriveTable() {
  try {
    console.log('Creating test_drive_entries table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "test_drive_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "dealer_id" uuid NOT NULL,
        "vehicle_registration" varchar(20) NOT NULL,
        "vehicle_make" varchar(100) NOT NULL,
        "vehicle_model" varchar(100) NOT NULL,
        "vehicle_year" varchar(4),
        "test_drive_date" timestamp NOT NULL,
        "test_drive_time" varchar(10) NOT NULL,
        "estimated_duration" integer NOT NULL,
        "customer_name" varchar(255) NOT NULL,
        "customer_email" varchar(255) NOT NULL,
        "customer_phone" varchar(50),
        "address_same_as_id" varchar(10) NOT NULL,
        "address_line_1" varchar(255),
        "address_line_2" varchar(255),
        "city" varchar(100),
        "county" varchar(100),
        "postcode" varchar(20),
        "country" varchar(100) DEFAULT 'United Kingdom',
        "driving_license_file" varchar(500),
        "status" varchar(50) DEFAULT 'scheduled',
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    console.log('Creating indexes...');
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "test_drive_entries_dealer_id_idx" ON "test_drive_entries" USING btree ("dealer_id")
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "test_drive_entries_status_idx" ON "test_drive_entries" USING btree ("status")
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "test_drive_entries_date_idx" ON "test_drive_entries" USING btree ("test_drive_date")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "test_drive_entries_customer_email_idx" ON "test_drive_entries" USING btree ("customer_email")
    `);

    console.log('Test drive entries table created successfully!');
    
  } catch (error) {
    console.error('Error creating test drive entries table:', error);
  }
}

createTestDriveTable();
