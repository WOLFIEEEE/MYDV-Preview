import { db } from '@/lib/db';
import { costCategories } from '@/db/schema';

// Default cost categories for new dealers
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

// Initialize default categories for a dealer
export async function initializeDefaultCategories(dealerId: string) {
  try {
    for (const category of defaultCostCategories) {
      await db
        .insert(costCategories)
        .values({
          dealerId,
          ...category,
          isDefault: false
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error('Error initializing default categories:', error);
  }
}
