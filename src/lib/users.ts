/**
 * User lookup utilities for owner assignment and user selection
 */

export interface TenantUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  full_name: string
  role: string | null
}

/**
 * Fetch all users for the current tenant
 * Used for owner assignment dropdowns
 */
export async function fetchTenantUsers(): Promise<TenantUser[]> {
  try {
    const response = await fetch('/api/users')

    if (!response.ok) {
      console.error('Failed to fetch tenant users')
      return []
    }

    const users = await response.json()

    // Transform and add full_name
    return users.map((user: any) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: getFullName(user.first_name, user.last_name, user.email),
      role: user.role
    }))
  } catch (error) {
    console.error('Error fetching tenant users:', error)
    return []
  }
}

/**
 * Get formatted full name from user fields
 * Falls back to email if no name is available
 */
export function getFullName(
  firstName: string | null,
  lastName: string | null,
  email?: string
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  return name || email || 'Unknown User'
}

/**
 * Get user initials for avatar badges
 */
export function getUserInitials(
  firstName: string | null,
  lastName: string | null,
  email?: string
): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return '??'
}

/**
 * Get owner display name for a given owner_id
 * Requires the users list to be passed in (from cache or state)
 */
export function getOwnerDisplayName(
  ownerId: string | null,
  users: TenantUser[]
): string {
  if (!ownerId) return 'Unassigned'

  const owner = users.find(u => u.id === ownerId)
  return owner?.full_name || 'Unknown'
}

/**
 * Get owner initials for badge display
 */
export function getOwnerInitials(
  ownerId: string | null,
  users: TenantUser[]
): string {
  if (!ownerId) return '?'

  const owner = users.find(u => u.id === ownerId)
  if (!owner) return '?'

  return getUserInitials(owner.first_name, owner.last_name, owner.email)
}
