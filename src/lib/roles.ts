/**
 * Centralized role system for the entire application
 * 
 * This file defines all valid roles and should be imported everywhere
 * roles are used instead of hardcoding strings.
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  SALES: 'sales_rep',
  OPERATIONS: 'operations_manager',
  STAFF: 'event_staff',
  USER: 'user'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 100,
  [ROLES.MANAGER]: 80,
  [ROLES.OPERATIONS]: 60,
  [ROLES.SALES]: 40,
  [ROLES.STAFF]: 20,
  [ROLES.USER]: 10
} as const;

// Helper functions
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isAdmin(userRole: UserRole): boolean {
  return userRole === ROLES.ADMIN;
}

export function isManagerOrAbove(userRole: UserRole): boolean {
  return hasRolePermission(userRole, ROLES.MANAGER);
}

export function canManageUsers(userRole: UserRole): boolean {
  return hasRolePermission(userRole, ROLES.ADMIN);
}

// Role display names for UI
export const ROLE_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.SALES]: 'Sales Representative',
  [ROLES.OPERATIONS]: 'Operations Manager',
  [ROLES.STAFF]: 'Event Staff',
  [ROLES.USER]: 'User'
} as const;

// Get all roles as array for dropdowns
export const ALL_ROLES = Object.values(ROLES);

// Get roles with display names for UI components
export const ROLES_WITH_LABELS = Object.entries(ROLE_DISPLAY_NAMES).map(([value, label]) => ({
  value,
  label
}));
