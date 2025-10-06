#!/usr/bin/env tsx

/**
 * Utility script to clean up existing custom checklist questions
 * WARNING: This will remove ALL existing custom checklist questions from ALL dealers
 * Use with caution - this action cannot be undone!
 */

import { db } from '../src/lib/db';
import { dealers } from '../src/db/schema';
import { eq } from 'drizzle-orm';

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

async function cleanupQuestions() {
  try {
    console.log('⚠️  DANGER: CHECKLIST QUESTIONS CLEANUP');
    console.log('========================================\n');
    
    // First, show what will be deleted
    const allDealers = await db
      .select({
        id: dealers.id,
        name: dealers.name,
        email: dealers.email,
        metadata: dealers.metadata
      })
      .from(dealers);

    let dealersWithQuestions = 0;
    let totalQuestions = 0;
    const dealersToUpdate: Array<{ id: string; name: string; questionCount: number }> = [];

    console.log('📋 Questions that will be DELETED:');
    console.log('==================================\n');

    for (const dealer of allDealers) {
      const metadata = (dealer.metadata as DealerMetadata) || {};
      const questions = metadata.customChecklistQuestions || [];

      if (questions.length > 0) {
        dealersWithQuestions++;
        totalQuestions += questions.length;
        dealersToUpdate.push({
          id: dealer.id,
          name: dealer.name,
          questionCount: questions.length
        });

        console.log(`🏢 ${dealer.name} (${dealer.email})`);
        questions.forEach((q, index) => {
          console.log(`   ${index + 1}. "${q.question}" (${q.type})`);
        });
        console.log('');
      }
    }

    if (dealersWithQuestions === 0) {
      console.log('✅ No questions found to delete. Database is already clean!');
      return;
    }

    console.log(`⚠️  SUMMARY: ${totalQuestions} questions from ${dealersWithQuestions} dealers will be PERMANENTLY DELETED!`);
    console.log('\n❌ THIS ACTION CANNOT BE UNDONE!');
    console.log('\n💡 To proceed with cleanup, uncomment the cleanup code in this script.');
    console.log('   For safety, the actual cleanup is commented out by default.');
    
    // SAFETY: Actual cleanup code is commented out
    // Uncomment the code below ONLY if you're sure you want to delete all questions
    
    /*
    console.log('\n🧹 Starting cleanup...');
    
    for (const dealerInfo of dealersToUpdate) {
      // Get current metadata
      const dealer = await db
        .select()
        .from(dealers)
        .where(eq(dealers.id, dealerInfo.id))
        .limit(1);

      if (dealer.length > 0) {
        const currentMetadata = (dealer[0].metadata as DealerMetadata) || {};
        
        // Remove checklist questions but keep other metadata
        const cleanedMetadata = {
          ...currentMetadata,
          customChecklistQuestions: [],
          customQuestionsEnabled: false
        };

        // Update dealer record
        await db
          .update(dealers)
          .set({ 
            metadata: cleanedMetadata,
            updatedAt: new Date()
          })
          .where(eq(dealers.id, dealerInfo.id));

        console.log(`✅ Cleaned ${dealerInfo.questionCount} questions from ${dealerInfo.name}`);
      }
    }
    
    console.log(`\n🎉 Cleanup completed! Removed ${totalQuestions} questions from ${dealersWithQuestions} dealers.`);
    */

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupQuestions()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

