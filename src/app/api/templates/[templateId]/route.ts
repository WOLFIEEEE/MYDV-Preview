import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteFileFromStorage } from '@/lib/storage';
import { deleteTemplate, getTemplateById, createOrGetDealer } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const resolvedParams = await params;
    const templateId = resolvedParams.templateId;
    if (!templateId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Template ID is required' 
      }, { status: 400 });
    }

    // Get dealer information
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    
    // Get template details first
    const template = await getTemplateById(templateId, dealer.id);
    if (!template) {
      return NextResponse.json({
        success: false,
        message: 'Template not found or not authorized to delete'
      }, { status: 404 });
    }

    console.log(`🗑️ Deleting template: ${template.name} (${templateId})`);

    // Delete from Supabase Storage
    const storageResult = await deleteFileFromStorage(template.supabaseFileName);
    if (!storageResult.success) {
      console.warn(`⚠️ Failed to delete file from storage: ${storageResult.error}`);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const dbResult = await deleteTemplate(templateId, dealer.id);
    if (!dbResult.success) {
      return NextResponse.json({
        success: false,
        message: dbResult.error || 'Failed to delete template from database'
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted template: ${template.name}`);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      templateId: templateId
    });

  } catch (error) {
    console.error('❌ Template deletion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete template',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
