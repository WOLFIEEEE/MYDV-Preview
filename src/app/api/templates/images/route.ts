import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getTemplatesByDealer, createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Template images API endpoint
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized',
        templates: [] 
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');

    // Get dealer information using enhanced resolution (supports team member delegation)
    const dealerResult = await getDealerIdForUser(user);
    let dealer;
    
    if (dealerResult.success && dealerResult.dealerId) {
      const fullDealerResult = await db
        .select()
        .from(dealers)
        .where(eq(dealers.id, dealerResult.dealerId))
        .limit(1);
      
      if (fullDealerResult.length > 0) {
        dealer = fullDealerResult[0];
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Dealer record not found',
          templates: [] 
        }, { status: 400 });
      }
    } else {
      dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
    }
    
    // Get templates from database
    const templates = await getTemplatesByDealer(dealer.id);

    // Filter templates by category if specified
    const filteredTemplates = categoryFilter 
      ? templates.filter(template => template.category === categoryFilter)
      : templates;

    // Transform database records to match expected frontend format
    const formattedTemplates = filteredTemplates.map(template => ({
      id: template.id,
      name: template.name,
      fileName: template.fileName,
      url: template.publicUrl,
      type: template.mimeType.split('/')[1] || 'unknown',
      category: template.category,
      description: template.description || '',
      tags: Array.isArray(template.tags) ? template.tags : [],
      uploadedAt: template.createdAt.toISOString(),
      size: template.fileSize
    }));

    console.log(`📋 Found ${formattedTemplates.length} ${categoryFilter ? `${categoryFilter} ` : ''}templates for dealer: ${dealer.id}`);

    return NextResponse.json({
      success: true,
      message: `Found ${formattedTemplates.length} template images`,
      templates: formattedTemplates,
      totalCount: formattedTemplates.length
    });

  } catch (error) {
    console.error('❌ Error fetching template images:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch template images',
        error: error instanceof Error ? error.message : 'Unknown error',
        templates: [] 
      },
      { status: 500 }
    );
  }
}