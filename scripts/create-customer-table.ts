import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function createCustomerTable() {
  try {
    console.log('Creating customers table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "dealer_id" uuid NOT NULL,
        "first_name" varchar(255) NOT NULL,
        "last_name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(50),
        "date_of_birth" timestamp,
        "address_line_1" varchar(255),
        "address_line_2" varchar(255),
        "city" varchar(100),
        "county" varchar(100),
        "postcode" varchar(20),
        "country" varchar(100) DEFAULT 'United Kingdom',
        "marketing_consent" boolean DEFAULT false,
        "sales_consent" boolean DEFAULT false,
        "gdpr_consent" boolean DEFAULT false,
        "consent_date" timestamp,
        "notes" text,
        "customer_source" varchar(100),
        "preferred_contact_method" varchar(50) DEFAULT 'email',
        "status" varchar(50) DEFAULT 'active',
        "tags" jsonb,
        "custom_fields" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    console.log('Creating indexes...');
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "customers_dealer_id_idx" ON "customers" USING btree ("dealer_id")
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" USING btree ("email")
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "customers_status_idx" ON "customers" USING btree ("status")
    `);

    console.log('Customer table created successfully!');
    
  } catch (error) {
    console.error('Error creating customer table:', error);
  }
}

createCustomerTable();
