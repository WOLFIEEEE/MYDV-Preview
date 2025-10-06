// Client-safe utilities for user role management
// This file contains only types and functions that can run in the browser

export interface UserRoleInfo {
  userType: 'dealer' | 'team_member';
  role: string;
  storeOwnerId?: string;
  dealerId?: string;
  isStoreOwnerAdmin?: boolean;
}

/**
 * Check if user has settings access (client-safe)
 */
export function hasSettingsAccess(roleInfo: UserRoleInfo | null): boolean {
  if (!roleInfo) return false;
  
  // Dealers have full access
  if (roleInfo.userType === 'dealer') return true;
  
  // Team members only have access if they're store_owner_admin
  if (roleInfo.userType === 'team_member') {
    return roleInfo.role === 'store_owner_admin';
  }
  
  return false;
}

/**
 * Fetch user role info from API
 */
export async function fetchUserRoleInfo(): Promise<UserRoleInfo | null> {
  try {
    const response = await fetch('/api/user-role');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching user role info:', error);
    return null;
  }
}
