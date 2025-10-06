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
  type: 'text' | 'boolean' | 'number' | 'select' | 'multiselect' | 'yes_no' | 'dropdown';
  required: boolean;
  options?: string[]; // For select/multiselect/dropdown types
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

// Helper function to check if user is admin
async function isUserAdmin(user: any): Promise<boolean> {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
  const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
  return adminEmails.includes(userEmail);
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
        endpoint: 'admin/checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(user);
    if (!isAdmin) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin access required',
        details: 'Only administrators can access checklist questions management',
        httpStatus: 403,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 403 }
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
        endpoint: 'admin/checklist-questions'
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
        endpoint: 'admin/checklist-questions'
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
      createSuccessResponse(responseData, 'admin/checklist-questions')
    );

  } catch (error) {
    console.error('Error fetching admin custom questions:', error);
    const internalError = createInternalErrorResponse(error, 'admin/checklist-questions');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
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
        endpoint: 'admin/checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(user);
    if (!isAdmin) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin access required',
        details: 'Only administrators can manage checklist questions',
        httpStatus: 403,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dealerId, questions, customQuestionsEnabled } = body;

    console.log('📝 Admin API received data:', { dealerId, questions, customQuestionsEnabled });

    if (!dealerId) {
      console.error('❌ Missing dealer ID');
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID is required',
        details: 'dealerId must be provided in request body',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/checklist-questions'
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
        endpoint: 'admin/checklist-questions'
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
            endpoint: 'admin/checklist-questions'
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
            endpoint: 'admin/checklist-questions'
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
        endpoint: 'admin/checklist-questions'
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

    console.log('💾 Admin updating dealer metadata:', updatedMetadata);

    // Update dealer record
    const updateResult = await db
      .update(dealers)
      .set({ 
        metadata: updatedMetadata,
        updatedAt: new Date()
      })
      .where(eq(dealers.id, dealerId))
      .returning();

    console.log('✅ Admin update result:', updateResult);

    const successMessage = customQuestionsEnabled !== undefined 
      ? 'Custom questions settings updated successfully by admin'
      : 'Custom questions saved successfully by admin';

    return NextResponse.json(
      createSuccessResponse(
        { message: successMessage },
        'admin/checklist-questions'
      )
    );

  } catch (error) {
    console.error('Error saving admin custom questions:', error);
    const internalError = createInternalErrorResponse(error, 'admin/checklist-questions');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// GET all dealers for admin dropdown
export async function PUT(request: NextRequest) {
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
        endpoint: 'admin/checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(user);
    if (!isAdmin) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin access required',
        details: 'Only administrators can access dealer list',
        httpStatus: 403,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/checklist-questions'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 403 }
      );
    }

    // Get all dealers excluding admin emails
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
    
    const allDealers = await db
      .select({
        id: dealers.id,
        name: dealers.name,
        email: dealers.email,
        role: dealers.role
      })
      .from(dealers);

    // Filter out admin emails from the dealer list
    const filteredDealers = allDealers.filter(dealer => !adminEmails.includes(dealer.email));

    return NextResponse.json(
      createSuccessResponse(filteredDealers, 'admin/checklist-questions')
    );

  } catch (error) {
    console.error('Error fetching dealers for admin:', error);
    const internalError = createInternalErrorResponse(error, 'admin/checklist-questions');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
