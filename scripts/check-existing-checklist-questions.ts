#!/usr/bin/env tsx

/**
 * Utility script to check existing custom checklist questions in the database
 * This helps identify questions that were created by store owners before admin-only access was implemented
 */

import { db } from '../src/lib/db';
import { dealers } from '../src/db/schema';

interface DealerMetadata {
  customChecklistQuestions?: Array<{
    id: string;
    question: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  customQuestionsEnabled?: boolean;
  [key: string]: unknown;
}

async function checkExistingQuestions() {
  try {
    console.log('🔍 Checking existing custom checklist questions...\n');

    // Get all dealers
    const allDealers = await db
      .select({
        id: dealers.id,
        name: dealers.name,
        email: dealers.email,
        metadata: dealers.metadata
      })
      .from(dealers);

    let totalDealers = 0;
    let dealersWithQuestions = 0;
    let totalQuestions = 0;

    console.log('📊 CUSTOM CHECKLIST QUESTIONS REPORT');
    console.log('=====================================\n');

    for (const dealer of allDealers) {
      totalDealers++;
      const metadata = (dealer.metadata as DealerMetadata) || {};
      const questions = metadata.customChecklistQuestions || [];
      const enabled = metadata.customQuestionsEnabled !== false;

      if (questions.length > 0) {
        dealersWithQuestions++;
        totalQuestions += questions.length;

        console.log(`🏢 Dealer: ${dealer.name} (${dealer.email})`);
        console.log(`   ID: ${dealer.id}`);
        console.log(`   Questions Enabled: ${enabled ? '✅ Yes' : '❌ No'}`);
        console.log(`   Number of Questions: ${questions.length}`);
        
        questions.forEach((q, index) => {
          console.log(`   ${index + 1}. "${q.question}" (${q.type}${q.required ? ', required' : ''})`);
          if (q.options && q.options.length > 0) {
            console.log(`      Options: ${q.options.join(', ')}`);
          }
        });
        console.log('');
      }
    }

    console.log('📈 SUMMARY');
    console.log('==========');
    console.log(`Total Dealers: ${totalDealers}`);
    console.log(`Dealers with Questions: ${dealersWithQuestions}`);
    console.log(`Total Questions: ${totalQuestions}`);
    
    if (dealersWithQuestions === 0) {
      console.log('\n✅ No existing custom questions found. The system is clean!');
    } else {
      console.log(`\n📝 Found ${totalQuestions} existing questions across ${dealersWithQuestions} dealers.`);
      console.log('\n💡 NOTE: These questions were created before admin-only access was implemented.');
      console.log('   - Checklist forms will still display these questions');
      console.log('   - Only admins can now modify/delete these questions via /admin/dashboard/settings');
      console.log('   - Store owners can no longer create or modify questions');
    }

  } catch (error) {
    console.error('❌ Error checking questions:', error);
  }
}

// Run the check
checkExistingQuestions()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

