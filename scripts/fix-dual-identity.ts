/**
 * Script to fix dual identity issue where users exist as both dealers and team members
 * This script will remove dealer records for users who should only be team members
 */

import { db } from '../src/lib/db';
import { dealers, teamMembers } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function fixDualIdentityIssue() {
  console.log('🔍 Starting dual identity fix...');
  
  try {
    // Find users who exist in both dealers and team_members tables
    const teamMemberEmails = await db
      .select({ email: teamMembers.email })
      .from(teamMembers);
    
    const teamMemberEmailList = teamMemberEmails.map(tm => tm.email);
    
    if (teamMemberEmailList.length === 0) {
      console.log('ℹ️ No team members found');
      return;
    }
    
    const conflictingDealers = await db
      .select()
      .from(dealers)
      .where(inArray(dealers.email, teamMemberEmailList));
    
    console.log(`📋 Found ${conflictingDealers.length} dealers who are also team members:`);
    conflictingDealers.forEach(dealer => {
      console.log(`  - ${dealer.email} (ID: ${dealer.id})`);
    });
    
    if (conflictingDealers.length === 0) {
      console.log('✅ No dual identity issues found');
      return;
    }
    
    // Ask for confirmation (in a real script, you might want interactive confirmation)
    console.log('\n⚠️ This will DELETE the dealer records for users who are team members.');
    console.log('The team member records will be preserved.');
    
    // Remove dealer records for users who are team members
    const emailsToRemove = conflictingDealers.map(d => d.email);
    
    const deletedDealers = await db
      .delete(dealers)
      .where(inArray(dealers.email, emailsToRemove))
      .returning();
    
    console.log(`✅ Successfully removed ${deletedDealers.length} conflicting dealer records:`);
    deletedDealers.forEach(dealer => {
      console.log(`  - Removed dealer record for ${dealer.email}`);
    });
    
    console.log('\n🎉 Dual identity issue fixed!');
    console.log('Users will now be properly recognized as team members only.');
    
  } catch (error) {
    console.error('❌ Error fixing dual identity issue:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixDualIdentityIssue()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixDualIdentityIssue };
