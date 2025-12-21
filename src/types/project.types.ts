/**
 * TypeScript types for Projects module
 * Follows the same pattern as opportunities and events
 */

import type { DepartmentId } from '@/lib/departments'

export type ProjectType = 'design' | 'operations' | 'marketing' | 'development' | 'other'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
export type TeamMemberRole = 'lead' | 'contributor' | 'reviewer' | 'observer'

export interface Project {
  id: string
  tenant_id: string
  
  // Basic Info
  name: string
  description?: string
  project_type?: ProjectType
  priority: ProjectPriority
  
  // Status/Stage
  status: ProjectStatus
  stage?: string
  
  // Ownership
  owner_id?: string
  department?: DepartmentId
  
  // Timeline
  start_date?: string
  target_date?: string
  completed_date?: string
  
  // Progress
  progress_percentage: number
  
  // Optional Relations
  related_account_id?: string
  related_event_id?: string
  parent_project_id?: string
  
  // Metadata
  tags?: string[]
  custom_fields?: Record<string, any>
  
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  
  // Relations (populated by joins)
  owner?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
  team_members?: ProjectTeamMember[]
  related_account?: {
    id: string
    name: string
  }
  related_event?: {
    id: string
    title: string
  }
  parent_project?: {
    id: string
    name: string
  }
}

export interface ProjectTeamMember {
  id: string
  tenant_id: string
  project_id: string
  user_id: string
  role?: TeamMemberRole
  created_at: string
  
  // Relations (populated by joins)
  user?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
}

export interface CreateProjectInput {
  name: string
  description?: string
  project_type?: ProjectType
  priority?: ProjectPriority
  status?: ProjectStatus
  stage?: string
  owner_id?: string
  department?: DepartmentId
  start_date?: string | null
  target_date?: string | null
  progress_percentage?: number
  related_account_id?: string
  related_event_id?: string
  parent_project_id?: string
  tags?: string[]
  custom_fields?: Record<string, any>
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  completed_date?: string | null
}

export interface ProjectWithRelations extends Project {
  owner?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
  team_members?: ProjectTeamMember[]
  related_account?: {
    id: string
    name: string
  }
  related_event?: {
    id: string
    title: string
  }
}

// For filtering and stats
export interface ProjectFilters {
  search?: string
  status?: ProjectStatus | 'all'
  project_type?: ProjectType | 'all'
  priority?: ProjectPriority | 'all'
  owner_id?: string | 'all'
  department?: DepartmentId | 'all'
  date_range?: {
    start?: string
    end?: string
  }
}

export interface ProjectStats {
  total: number
  by_status: Record<ProjectStatus, number>
  by_type: Record<ProjectType, number>
  by_priority: Record<ProjectPriority, number>
  overdue: number
  due_this_week: number
  completed_this_month: number
}

