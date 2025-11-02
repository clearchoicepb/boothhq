/**
 * Department Configuration System
 *
 * Single source of truth for all department-related business logic.
 * This file defines departments, their properties, and department-specific task types.
 *
 * Design principles:
 * - Type-safe with const assertions
 * - Extensible for future departments
 * - Co-locates department business rules
 * - No hardcoded strings elsewhere in the codebase
 */

import type { LucideIcon } from 'lucide-react'

// Department IDs - used as database values
export type DepartmentId =
  | 'sales'
  | 'design'
  | 'operations'
  | 'customer_success'
  | 'accounting'
  | 'admin'
  | 'event_staff' // Special category for event-only staff (not shown in task dashboards)

// Department role levels
export type DepartmentRole = 'member' | 'supervisor' | 'manager'

// Department configuration interface
export interface Department {
  readonly id: DepartmentId
  readonly name: string
  readonly icon: string // Lucide icon name
  readonly color: string // Hex color
  readonly description: string
  readonly abbreviation: string // For compact displays
}

// Task type for a department
export interface DepartmentTaskType {
  readonly id: string
  readonly name: string
  readonly defaultPriority: 'low' | 'medium' | 'high' | 'urgent'
  readonly defaultDueInDays?: number // Auto-calculate due date
  readonly requiresAssignment?: boolean // Must be assigned to someone
}

/**
 * Department Definitions
 *
 * Each department has:
 * - Unique ID (matches database enum)
 * - Display name
 * - Icon (Lucide icon name)
 * - Brand color
 * - Description
 * - Abbreviation for compact UI
 */
export const DEPARTMENTS: Record<DepartmentId, Department> = {
  sales: {
    id: 'sales',
    name: 'Sales',
    icon: 'TrendingUp',
    color: '#10b981', // green-500
    description: 'Lead generation, opportunities, quotes, and deal closing',
    abbreviation: 'SLS',
  },
  design: {
    id: 'design',
    name: 'Design & Creative',
    icon: 'Palette',
    color: '#8b5cf6', // purple-500
    description: 'Design items, proofs, templates, and creative assets',
    abbreviation: 'DSN',
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    icon: 'Briefcase',
    color: '#f59e0b', // amber-500
    description: 'Event execution, logistics, equipment, and booth setup',
    abbreviation: 'OPS',
  },
  customer_success: {
    id: 'customer_success',
    name: 'Customer Success',
    icon: 'Users',
    color: '#3b82f6', // blue-500
    description: 'Client communication, satisfaction, and relationship management',
    abbreviation: 'CS',
  },
  accounting: {
    id: 'accounting',
    name: 'Accounting',
    icon: 'DollarSign',
    color: '#ef4444', // red-500
    description: 'Invoicing, payments, collections, and financial reconciliation',
    abbreviation: 'ACC',
  },
  admin: {
    id: 'admin',
    name: 'Administration',
    icon: 'Settings',
    color: '#6b7280', // gray-500
    description: 'System management, settings, and user administration',
    abbreviation: 'ADM',
  },
  event_staff: {
    id: 'event_staff',
    name: 'Event Staff',
    icon: 'Users',
    color: '#14b8a6', // teal-500
    description: 'On-site event staff and brand ambassadors',
    abbreviation: 'EVT',
  },
} as const

/**
 * Department-Specific Task Types
 *
 * Each department has predefined task types with sensible defaults.
 * These can be used for:
 * - Task creation templates
 * - Auto-task generation
 * - Quick-add buttons in dashboards
 */
export const DEPARTMENT_TASK_TYPES: Record<DepartmentId, readonly DepartmentTaskType[]> = {
  sales: [
    {
      id: 'follow_up_lead',
      name: 'Follow Up Lead',
      defaultPriority: 'high',
      defaultDueInDays: 2,
      requiresAssignment: true,
    },
    {
      id: 'send_quote',
      name: 'Send Quote',
      defaultPriority: 'high',
      defaultDueInDays: 1,
      requiresAssignment: true,
    },
    {
      id: 'schedule_call',
      name: 'Schedule Call',
      defaultPriority: 'medium',
      defaultDueInDays: 3,
    },
    {
      id: 'contract_review',
      name: 'Contract Review',
      defaultPriority: 'high',
      defaultDueInDays: 1,
      requiresAssignment: true,
    },
    {
      id: 'proposal_preparation',
      name: 'Proposal Preparation',
      defaultPriority: 'high',
      defaultDueInDays: 2,
    },
  ],
  design: [
    {
      id: 'create_template',
      name: 'Create Template',
      defaultPriority: 'medium',
      defaultDueInDays: 5,
      requiresAssignment: true,
    },
    {
      id: 'design_proof',
      name: 'Design Proof',
      defaultPriority: 'high',
      defaultDueInDays: 3,
      requiresAssignment: true,
    },
    {
      id: 'final_approval',
      name: 'Final Approval',
      defaultPriority: 'urgent',
      defaultDueInDays: 1,
      requiresAssignment: true,
    },
    {
      id: 'physical_item_order',
      name: 'Physical Item Order',
      defaultPriority: 'high',
      defaultDueInDays: 7,
    },
    {
      id: 'artwork_revision',
      name: 'Artwork Revision',
      defaultPriority: 'medium',
      defaultDueInDays: 2,
    },
  ],
  operations: [
    {
      id: 'equipment_check',
      name: 'Equipment Check',
      defaultPriority: 'high',
      defaultDueInDays: 2,
      requiresAssignment: true,
    },
    {
      id: 'booth_setup',
      name: 'Booth Setup',
      defaultPriority: 'urgent',
      defaultDueInDays: 0, // Day of event
      requiresAssignment: true,
    },
    {
      id: 'staff_assignment',
      name: 'Staff Assignment',
      defaultPriority: 'high',
      defaultDueInDays: 7,
      requiresAssignment: true,
    },
    {
      id: 'logistics_planning',
      name: 'Logistics Planning',
      defaultPriority: 'medium',
      defaultDueInDays: 14,
    },
    {
      id: 'equipment_maintenance',
      name: 'Equipment Maintenance',
      defaultPriority: 'medium',
      defaultDueInDays: 30,
    },
  ],
  customer_success: [
    {
      id: 'send_thank_you',
      name: 'Send Thank You',
      defaultPriority: 'low',
      defaultDueInDays: 1,
    },
    {
      id: 'request_feedback',
      name: 'Request Feedback',
      defaultPriority: 'medium',
      defaultDueInDays: 3,
    },
    {
      id: 'handle_complaint',
      name: 'Handle Complaint',
      defaultPriority: 'urgent',
      defaultDueInDays: 0,
      requiresAssignment: true,
    },
    {
      id: 'check_in_call',
      name: 'Check-in Call',
      defaultPriority: 'medium',
      defaultDueInDays: 7,
    },
    {
      id: 'onboarding_call',
      name: 'Onboarding Call',
      defaultPriority: 'high',
      defaultDueInDays: 2,
      requiresAssignment: true,
    },
  ],
  accounting: [
    {
      id: 'send_invoice',
      name: 'Send Invoice',
      defaultPriority: 'high',
      defaultDueInDays: 1,
      requiresAssignment: true,
    },
    {
      id: 'payment_follow_up',
      name: 'Payment Follow-up',
      defaultPriority: 'high',
      defaultDueInDays: 3,
      requiresAssignment: true,
    },
    {
      id: 'reconcile_account',
      name: 'Reconcile Account',
      defaultPriority: 'medium',
      defaultDueInDays: 7,
    },
    {
      id: 'process_refund',
      name: 'Process Refund',
      defaultPriority: 'high',
      defaultDueInDays: 2,
      requiresAssignment: true,
    },
    {
      id: 'deposit_verification',
      name: 'Deposit Verification',
      defaultPriority: 'medium',
      defaultDueInDays: 1,
    },
  ],
  admin: [
    {
      id: 'user_onboarding',
      name: 'User Onboarding',
      defaultPriority: 'medium',
      defaultDueInDays: 2,
    },
    {
      id: 'system_maintenance',
      name: 'System Maintenance',
      defaultPriority: 'low',
      defaultDueInDays: 30,
    },
    {
      id: 'data_backup',
      name: 'Data Backup',
      defaultPriority: 'medium',
      defaultDueInDays: 7,
    },
    {
      id: 'permission_update',
      name: 'Permission Update',
      defaultPriority: 'high',
      defaultDueInDays: 1,
    },
  ],
  event_staff: [
    // Event staff don't have department-based tasks
    // They are assigned to specific events via staff roles
  ],
} as const

/**
 * Utility Functions
 */

/**
 * Get all departments as an array
 */
export function getAllDepartments(): Department[] {
  return Object.values(DEPARTMENTS)
}

/**
 * Get departments that should appear in task dashboards
 * (excludes event_staff which is for organizational purposes only)
 */
export function getTaskDepartments(): Department[] {
  return Object.values(DEPARTMENTS).filter(dept => dept.id !== 'event_staff')
}

/**
 * Get all departments as options for form selects
 * Includes all departments including event_staff
 */
export function getDepartmentOptions() {
  return Object.values(DEPARTMENTS).map(dept => ({
    value: dept.id,
    label: dept.name
  }))
}

/**
 * Get department by ID
 */
export function getDepartmentById(id: DepartmentId): Department {
  return DEPARTMENTS[id]
}

/**
 * Get task types for a department
 */
export function getTaskTypesByDepartment(departmentId: DepartmentId): readonly DepartmentTaskType[] {
  return DEPARTMENT_TASK_TYPES[departmentId]
}

/**
 * Check if a department ID is valid
 */
export function isValidDepartmentId(id: string): id is DepartmentId {
  return id in DEPARTMENTS
}

/**
 * Infer department from entity type
 * Used for auto-assigning tasks to departments based on the related entity
 */
export function inferDepartmentFromEntity(entityType: string | null): DepartmentId | null {
  if (!entityType) return null

  const entityToDepartmentMap: Record<string, DepartmentId> = {
    'opportunity': 'sales',
    'lead': 'sales',
    'quote': 'sales',
    'event': 'operations',
    'event_date': 'operations',
    'design_item': 'design',
    'invoice': 'accounting',
    'payment': 'accounting',
    'account': 'customer_success',
    'contact': 'customer_success',
  }

  return entityToDepartmentMap[entityType] || null
}

/**
 * Calculate due date based on task type defaults
 */
export function calculateDefaultDueDate(
  departmentId: DepartmentId,
  taskTypeId: string,
  referenceDate?: Date
): Date | null {
  const taskTypes = DEPARTMENT_TASK_TYPES[departmentId]
  const taskType = taskTypes.find(t => t.id === taskTypeId)

  if (!taskType || taskType.defaultDueInDays === undefined) {
    return null
  }

  const baseDate = referenceDate || new Date()
  const dueDate = new Date(baseDate)
  dueDate.setDate(dueDate.getDate() + taskType.defaultDueInDays)

  return dueDate
}

/**
 * Get department color with opacity
 */
export function getDepartmentColor(departmentId: DepartmentId, opacity: number = 1): string {
  const department = DEPARTMENTS[departmentId]
  if (opacity === 1) return department.color

  // Convert hex to rgba
  const hex = department.color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Check if user has permission to access a department
 *
 * Authorization hierarchy:
 * 1. System roles (admin, tenant_admin) - full access to everything
 * 2. Department roles (manager, supervisor, member) - department-based access
 *
 * @param userDepartment - User's assigned department (e.g., 'sales', 'design')
 * @param userRole - User's department role (member, supervisor, manager)
 * @param targetDepartment - Department being accessed
 * @param systemRole - User's system role (admin, tenant_admin, sales_rep, etc.)
 * @returns true if user can access the target department
 */
export function canAccessDepartment(
  userDepartment: DepartmentId | null,
  userRole: DepartmentRole | null,
  targetDepartment: DepartmentId,
  systemRole?: string | null
): boolean {
  // System admins can access ALL departments
  if (systemRole === 'admin' || systemRole === 'tenant_admin') {
    return true
  }

  // Department managers can access all departments
  if (userRole === 'manager') return true

  // Supervisors can access their own department
  if (userRole === 'supervisor' && userDepartment === targetDepartment) return true

  // Members can only access their own department
  if (userRole === 'member' && userDepartment === targetDepartment) return true

  return false
}
