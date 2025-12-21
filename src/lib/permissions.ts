'use client'

import { useSession } from 'next-auth/react'
import { useSettings } from '@/lib/settings-context'

export interface Permission {
  module: 'leads' | 'contacts' | 'accounts' | 'opportunities' | 'events' | 'invoices' | 'contracts' | 'users' | 'settings'
  action: 'view' | 'create' | 'edit' | 'delete'
}

export interface RolePermissions {
  leads: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  contacts: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  accounts: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  opportunities: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  events: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  invoices: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  contracts: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  users: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  projects?: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  settings: { view: boolean; edit: boolean }
}

// Default permissions for system roles
const defaultRolePermissions: Record<string, RolePermissions> = {
  admin: {
    leads: { view: true, create: true, edit: true, delete: true },
    contacts: { view: true, create: true, edit: true, delete: true },
    accounts: { view: true, create: true, edit: true, delete: true },
    opportunities: { view: true, create: true, edit: true, delete: true },
    events: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    contracts: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, edit: true }
  },
  tenant_admin: {
    leads: { view: true, create: true, edit: true, delete: true },
    contacts: { view: true, create: true, edit: true, delete: true },
    accounts: { view: true, create: true, edit: true, delete: true },
    opportunities: { view: true, create: true, edit: true, delete: true },
    events: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    contracts: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, edit: true }
  },
  sales_rep: {
    leads: { view: true, create: true, edit: true, delete: false },
    contacts: { view: true, create: true, edit: true, delete: false },
    accounts: { view: true, create: true, edit: true, delete: false },
    opportunities: { view: true, create: true, edit: true, delete: false },
    events: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: false, edit: false, delete: false },
    contracts: { view: true, create: true, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, edit: false }
  },
  operations_manager: {
    leads: { view: true, create: false, edit: false, delete: false },
    contacts: { view: true, create: false, edit: false, delete: false },
    accounts: { view: true, create: false, edit: false, delete: false },
    opportunities: { view: true, create: false, edit: false, delete: false },
    events: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: false },
    contracts: { view: true, create: true, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, edit: false }
  },
  user: {
    leads: { view: false, create: false, edit: false, delete: false },
    contacts: { view: false, create: false, edit: false, delete: false },
    accounts: { view: false, create: false, edit: false, delete: false },
    opportunities: { view: false, create: false, edit: false, delete: false },
    events: { view: false, create: false, edit: false, delete: false },
    invoices: { view: false, create: false, edit: false, delete: false },
    contracts: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, edit: false }
  },
  staff: {
    leads: { view: false, create: false, edit: false, delete: false },
    contacts: { view: false, create: false, edit: false, delete: false },
    accounts: { view: false, create: false, edit: false, delete: false },
    opportunities: { view: false, create: false, edit: false, delete: false },
    events: { view: false, create: false, edit: false, delete: false },
    invoices: { view: false, create: false, edit: false, delete: false },
    contracts: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, edit: false }
  }
}

// Get user permissions based on their role
export function getUserPermissions(userRole: string, customRoles: any[] = []): RolePermissions {
  // Check if it's a default system role
  if (defaultRolePermissions[userRole]) {
    return defaultRolePermissions[userRole]
  }

  // Check custom roles from settings
  const customRole = customRoles.find(role => role.id === userRole)
  if (customRole && customRole.permissions) {
    return customRole.permissions
  }

  // Default to 'user' permissions if role not found
  return defaultRolePermissions.user
}

// Check if user has specific permission
export function hasPermission(
  userRole: string, 
  module: Permission['module'], 
  action: Permission['action'],
  customRoles: any[] = []
): boolean {
  const permissions = getUserPermissions(userRole, customRoles)
  const modulePermissions = permissions[module]
  
  if (!modulePermissions) return false
  
  // For settings, only check view and edit
  if (module === 'settings') {
    return action === 'view' ? modulePermissions.view : modulePermissions.edit
  }

  // For other modules, check if action exists and is true
  return action in modulePermissions && (modulePermissions as any)[action] === true
}

// Hook to check permissions
export function usePermissions() {
  const { data: session, status } = useSession()
  const { settings } = useSettings()

  const userRole = session?.user?.role || 'user'
  const customRoles = settings?.roles || []

  // If session is loading, return default permissions to avoid issues
  const isLoading = status === 'loading'
  
  const checkPermission = (module: Permission['module'], action: Permission['action']) => {
    // If session is loading, return false to prevent errors
    if (isLoading) return false
    return hasPermission(userRole, module, action, customRoles)
  }
  
  const getPermissions = () => {
    // If session is loading, return empty permissions
    if (isLoading) {
      return {
        leads: { view: false, create: false, edit: false, delete: false },
        contacts: { view: false, create: false, edit: false, delete: false },
        accounts: { view: false, create: false, edit: false, delete: false },
        opportunities: { view: false, create: false, edit: false, delete: false },
        events: { view: false, create: false, edit: false, delete: false },
        invoices: { view: false, create: false, edit: false, delete: false },
        contracts: { view: false, create: false, edit: false, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, edit: false }
      }
    }
    return getUserPermissions(userRole, customRoles)
  }
  
  return {
    userRole,
    permissions: getPermissions(),
    hasPermission: checkPermission,
    canView: (module: Permission['module']) => checkPermission(module, 'view'),
    canCreate: (module: Permission['module']) => checkPermission(module, 'create'),
    canEdit: (module: Permission['module']) => checkPermission(module, 'edit'),
    canDelete: (module: Permission['module']) => checkPermission(module, 'delete'),
    canAccessSettings: () => checkPermission('settings', 'view'),
    canEditSettings: () => checkPermission('settings', 'edit'),
    canManageUsers: () => checkPermission('users', 'view') || checkPermission('users', 'create'),
    isLoading
  }
}

// Navigation item permission checker
export function getNavigationItems(userRole: string, customRoles: any[] = []) {
  const permissions = getUserPermissions(userRole, customRoles)
  
  return [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'Home',
      permission: true // Always accessible
    },
    {
      label: 'Leads',
      href: '/leads',
      icon: 'TrendingUp',
      permission: permissions.leads.view
    },
    {
      label: 'Contacts',
      href: '/contacts',
      icon: 'Users',
      permission: permissions.contacts.view
    },
    {
      label: 'Accounts',
      href: '/accounts',
      icon: 'Building2',
      permission: permissions.accounts.view
    },
    {
      label: 'Opportunities',
      href: '/opportunities',
      icon: 'DollarSign',
      permission: permissions.opportunities.view
    },
    {
      label: 'Events',
      href: '/events',
      icon: 'Calendar',
      permission: permissions.events.view
    },
    {
      label: 'Inventory',
      href: '/inventory',
      icon: 'Camera',
      permission: permissions.events.view // Using events permission for inventory
    },
    {
      label: 'Invoices',
      href: '/invoices',
      icon: 'FileText',
      permission: permissions.invoices.view
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: 'Settings',
      permission: permissions.settings.view
    }
  ]
}

// Quick actions permission checker
export function getQuickActions(userRole: string, customRoles: any[] = []) {
  const permissions = getUserPermissions(userRole, customRoles)
  
  return [
    {
      label: 'New Lead',
      href: '/leads/new',
      icon: 'TrendingUp',
      permission: permissions.leads.create
    },
    {
      label: 'New Contact',
      href: '/contacts/new',
      icon: 'Users',
      permission: permissions.contacts.create
    },
    {
      label: 'New Account',
      href: '/accounts/new',
      icon: 'Building2',
      permission: permissions.accounts.create
    },
    {
      label: 'New Event',
      href: '/events/new',
      icon: 'Calendar',
      permission: permissions.events.create
    },
    {
      label: 'New Invoice',
      href: '/invoices/new',
      icon: 'FileText',
      permission: permissions.invoices.create
    },
    {
      label: 'Add Equipment',
      href: '/inventory/new',
      icon: 'Camera',
      permission: permissions.events.create // Using events permission for inventory
    }
  ]
}



