import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getUserRoleInfo } from '@/lib/userRoleUtils';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const roleInfo = await getUserRoleInfo(user.id, user.emailAddresses[0]?.emailAddress);
    
    return NextResponse.json({
      success: true,
      data: roleInfo
    });

  } catch (error) {
    console.error('❌ Error fetching user role:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user role'
    }, { status: 500 });
  }
}
