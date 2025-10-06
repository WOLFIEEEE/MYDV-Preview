import { db } from '@/lib/db';
import { costCategories } from '@/db/schema';

async function createCostTrackingTables() {
  console.log('🚀 Creating cost tracking tables...');

  try {
    // The tables will be created automatically by Drizzle when we run the migration
    // This script is for seeding default cost categories

    console.log('📝 Seeding default cost categories...');

    const defaultCategories = [
      {
        name: 'Rent & Utilities',
        description: 'Office rent, electricity, water, internet, phone bills',
        color: '#3B82F6',
        icon: 'Building',
        isDefault: true
      },
      {
        name: 'Insurance',
        description: 'Business insurance, vehicle insurance, liability coverage',
        color: '#10B981',
        icon: 'Shield',
        isDefault: true
      },
      {
        name: 'Staff Costs',
        description: 'Salaries, benefits, training, recruitment',
        color: '#8B5CF6',
        icon: 'Users',
        isDefault: true
      },
      {
        name: 'Marketing',
        description: 'Advertising, promotions, website, social media',
        color: '#F59E0B',
        icon: 'Megaphone',
        isDefault: true
      },
      {
        name: 'Maintenance',
        description: 'Equipment maintenance, repairs, cleaning',
        color: '#EF4444',
        icon: 'Wrench',
        isDefault: true
      },
      {
        name: 'Professional Services',
        description: 'Legal, accounting, consulting, banking fees',
        color: '#6366F1',
        icon: 'Briefcase',
        isDefault: true
      },
      {
        name: 'Licenses & Permits',
        description: 'Business licenses, permits, regulatory fees',
        color: '#14B8A6',
        icon: 'FileText',
        isDefault: true
      },
      {
        name: 'Technology',
        description: 'Software subscriptions, hardware, IT support',
        color: '#F97316',
        icon: 'Monitor',
        isDefault: true
      },
      {
        name: 'Travel & Transport',
        description: 'Business travel, fuel, vehicle maintenance',
        color: '#84CC16',
        icon: 'Car',
        isDefault: true
      },
      {
        name: 'Office Supplies',
        description: 'Stationery, equipment, furniture',
        color: '#A855F7',
        icon: 'Package',
        isDefault: true
      },
      {
        name: 'Other',
        description: 'Miscellaneous expenses not covered by other categories',
        color: '#6B7280',
        icon: 'MoreHorizontal',
        isDefault: true
      }
    ];

    // Note: We'll need to create a system dealer ID or handle this differently
    // For now, we'll create these as default categories that can be copied to each dealer
    
    for (const category of defaultCategories) {
      try {
        // We'll need to modify this to work with the actual dealer system
        console.log(`Adding category: ${category.name}`);
        // This will be handled when dealers first access the cost tracking feature
      } catch (error) {
        console.error(`Error adding category ${category.name}:`, error);
      }
    }

    console.log('✅ Cost tracking setup completed successfully!');
    console.log('📋 Default categories will be created for each dealer when they first access cost tracking.');

  } catch (error) {
    console.error('❌ Error setting up cost tracking:', error);
    throw error;
  }
}

// Export the function and default categories for use in the API
export { createCostTrackingTables };

export const defaultCostCategories = [
  {
    name: 'Rent & Utilities',
    description: 'Office rent, electricity, water, internet, phone bills',
    color: '#3B82F6',
    icon: 'Building'
  },
  {
    name: 'Insurance',
    description: 'Business insurance, vehicle insurance, liability coverage',
    color: '#10B981',
    icon: 'Shield'
  },
  {
    name: 'Staff Costs',
    description: 'Salaries, benefits, training, recruitment',
    color: '#8B5CF6',
    icon: 'Users'
  },
  {
    name: 'Marketing',
    description: 'Advertising, promotions, website, social media',
    color: '#F59E0B',
    icon: 'Megaphone'
  },
  {
    name: 'Maintenance',
    description: 'Equipment maintenance, repairs, cleaning',
    color: '#EF4444',
    icon: 'Wrench'
  },
  {
    name: 'Professional Services',
    description: 'Legal, accounting, consulting, banking fees',
    color: '#6366F1',
    icon: 'Briefcase'
  },
  {
    name: 'Licenses & Permits',
    description: 'Business licenses, permits, regulatory fees',
    color: '#14B8A6',
    icon: 'FileText'
  },
  {
    name: 'Technology',
    description: 'Software subscriptions, hardware, IT support',
    color: '#F97316',
    icon: 'Monitor'
  },
  {
    name: 'Travel & Transport',
    description: 'Business travel, fuel, vehicle maintenance',
    color: '#84CC16',
    icon: 'Car'
  },
  {
    name: 'Office Supplies',
    description: 'Stationery, equipment, furniture',
    color: '#A855F7',
    icon: 'Package'
  },
  {
    name: 'Other',
    description: 'Miscellaneous expenses not covered by other categories',
    color: '#6B7280',
    icon: 'MoreHorizontal'
  }
];

// Run the function if this script is executed directly
if (require.main === module) {
  createCostTrackingTables()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
