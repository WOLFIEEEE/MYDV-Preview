import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Define proper types for checklist questions
export interface CustomChecklistQuestion {
  id: string;
  question: string;
  type: 'text' | 'boolean' | 'number' | 'select' | 'multiselect';
  required: boolean;
  options?: string[]; // For select/multiselect types
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  category?: string;
  order?: number;
}

export interface CustomQuestionsData {
  questions: CustomChecklistQuestion[];
  customQuestionsEnabled: boolean;
}

interface DealerMetadata {
  customChecklistQuestions?: CustomChecklistQuestion[];
  customQuestionsEnabled?: boolean;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    if (!dealerId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID is required',
        details: 'dealerId parameter must be provided in query string',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get dealer's custom questions from metadata
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Dealer not found',
        details: `No dealer found with ID: ${dealerId}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    // Parse custom questions from metadata with proper typing
    const metadata = (dealer[0].metadata as DealerMetadata) || {};
    const customQuestions: CustomChecklistQuestion[] = metadata?.customChecklistQuestions || [];
    const customQuestionsEnabled = metadata?.customQuestionsEnabled !== false; // Default to true if not set

    const responseData: CustomQuestionsData = {
      questions: customQuestions,
      customQuestionsEnabled: customQuestionsEnabled
    };

    return NextResponse.json(
      createSuccessResponse(responseData, 'custom-checklist-questions')
    );

  } catch (error) {
    console.error('Error fetching custom questions:', error);
    const internalError = createInternalErrorResponse(error, 'custom-checklist-questions');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// Helper function to check if user is admin
async function isUserAdmin(user: any): Promise<boolean> {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
  const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
  return adminEmails.includes(userEmail);
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Check if user is admin - only admins can modify checklist questions
    const isAdmin = await isUserAdmin(user);
    if (!isAdmin) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin access required',
        details: 'Only administrators can modify checklist questions. Please contact your administrator.',
        httpStatus: 403,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dealerId, questions, customQuestionsEnabled } = body;

    console.log('📝 API received data:', { dealerId, questions, customQuestionsEnabled });

    if (!dealerId) {
      console.error('❌ Missing dealer ID');
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID is required',
        details: 'dealerId must be provided in request body',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate questions only if provided
    if (questions !== undefined && !Array.isArray(questions)) {
      console.error('❌ Questions is not an array:', questions);
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Questions must be an array',
        details: 'The questions field must be an array of question objects',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate question structure if questions are provided
    if (questions !== undefined) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!question || typeof question !== 'object') {
          const validationError = {
            type: ErrorType.VALIDATION,
            message: `Invalid question at index ${i}`,
            details: 'Each question must be a valid object',
            httpStatus: 400,
            timestamp: new Date().toISOString(),
            endpoint: 'custom-checklist-questions'
          };
          return NextResponse.json(
            createErrorResponse(validationError),
            { status: 400 }
          );
        }
        
        // Validate required fields
        if (!question.id || !question.question || !question.type) {
          const validationError = {
            type: ErrorType.VALIDATION,
            message: `Missing required fields in question at index ${i}`,
            details: 'Each question must have id, question, and type fields',
            httpStatus: 400,
            timestamp: new Date().toISOString(),
            endpoint: 'custom-checklist-questions'
          };
          return NextResponse.json(
            createErrorResponse(validationError),
            { status: 400 }
          );
        }
      }
    }

    // Get current dealer metadata
    console.log('🔍 Looking for dealer with ID:', dealerId);
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    console.log('🏢 Found dealer:', dealer.length > 0 ? 'Yes' : 'No');

    if (dealer.length === 0) {
      console.error('❌ Dealer not found with ID:', dealerId);
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Dealer not found',
        details: `No dealer found with ID: ${dealerId}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'custom-checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    // Update metadata with custom questions and/or custom questions enabled setting
    const currentMetadata = (dealer[0].metadata as DealerMetadata) || {};
    const updatedMetadata: DealerMetadata = {
      ...currentMetadata,
      ...(questions !== undefined && { customChecklistQuestions: questions as CustomChecklistQuestion[] }),
      ...(customQuestionsEnabled !== undefined && { customQuestionsEnabled: customQuestionsEnabled as boolean })
    };

    console.log('💾 Updating dealer metadata:', updatedMetadata);

    // Update dealer record
    const updateResult = await db
      .update(dealers)
      .set({ 
        metadata: updatedMetadata,
        updatedAt: new Date()
      })
      .where(eq(dealers.id, dealerId))
      .returning();

    console.log('✅ Update result:', updateResult);

    const successMessage = customQuestionsEnabled !== undefined 
      ? 'Custom questions settings updated successfully'
      : 'Custom questions saved successfully';

    return NextResponse.json(
      createSuccessResponse(
        { message: successMessage },
        'custom-checklist-questions'
      )
    );

  } catch (error) {
    console.error('Error saving custom questions:', error);
    const internalError = createInternalErrorResponse(error, 'custom-checklist-questions');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
