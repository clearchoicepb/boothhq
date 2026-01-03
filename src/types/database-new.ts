// Photo Booth Rental Management Platform - Database Types
// Generated from the new multi-tenant schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // =====================================================
      // CORE TENANT & USER MANAGEMENT
      // =====================================================
      
      tenants: {
        Row: {
          id: string
          name: string
          subdomain: string
          domain: string | null
          plan: 'starter' | 'professional' | 'enterprise'
          status: 'active' | 'suspended' | 'cancelled'
          settings: Json
          subscription_id: string | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          domain?: string | null
          plan?: 'starter' | 'professional' | 'enterprise'
          status?: 'active' | 'suspended' | 'cancelled'
          settings?: Json
          subscription_id?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          domain?: string | null
          plan?: 'starter' | 'professional' | 'enterprise'
          status?: 'active' | 'suspended' | 'cancelled'
          settings?: Json
          subscription_id?: string | null
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      users: {
        Row: {
          id: string
          tenant_id: string
          email: string
          password_hash: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'super_admin' | 'tenant_admin' | 'manager' | 'user' | 'staff'
          permissions: Json
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
          // Home address fields
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          // Home address coordinates for mileage calculations
          home_latitude: number | null
          home_longitude: number | null
          // Employment fields
          job_title: string | null
          employee_type: 'W2' | '1099' | 'International' | null
          pay_rate: number | null
          hire_date: string | null
          termination_date: string | null
          // Emergency contact
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          // Department fields
          department: string | null // Legacy single department (deprecated)
          department_role: string | null // member, supervisor, manager
          departments: string[] | null // Array of department IDs
          manager_of_departments: string[] | null // Departments where user is manager
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          password_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'super_admin' | 'tenant_admin' | 'manager' | 'user' | 'staff'
          permissions?: Json
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          // Home address fields
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          // Home address coordinates for mileage calculations
          home_latitude?: number | null
          home_longitude?: number | null
          // Employment fields
          job_title?: string | null
          employee_type?: 'W2' | '1099' | 'International' | null
          pay_rate?: number | null
          hire_date?: string | null
          termination_date?: string | null
          // Emergency contact
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          // Department fields
          department?: string | null
          department_role?: string | null
          departments?: string[] | null
          manager_of_departments?: string[] | null
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          password_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'super_admin' | 'tenant_admin' | 'manager' | 'user' | 'staff'
          permissions?: Json
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          // Home address fields
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          // Home address coordinates for mileage calculations
          home_latitude?: number | null
          home_longitude?: number | null
          // Employment fields
          job_title?: string | null
          employee_type?: 'W2' | '1099' | 'International' | null
          pay_rate?: number | null
          hire_date?: string | null
          termination_date?: string | null
          // Emergency contact
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          // Department fields
          department?: string | null
          department_role?: string | null
          departments?: string[] | null
          manager_of_departments?: string[] | null
        }
      }

      // =====================================================
      // CRM MODULE
      // =====================================================

      leads: {
        Row: {
          id: string
          tenant_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          company: string | null
          source: string | null
          status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
          assigned_to: string | null
          notes: string | null
          estimated_value: number | null
          expected_event_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          source?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
          assigned_to?: string | null
          notes?: string | null
          estimated_value?: number | null
          expected_event_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          source?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
          assigned_to?: string | null
          notes?: string | null
          estimated_value?: number | null
          expected_event_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      accounts: {
        Row: {
          id: string
          tenant_id: string
          name: string
          account_type: 'individual' | 'company'
          industry: string | null
          website: string | null
          business_url: string | null
          photo_url: string | null
          billing_address: Json | null
          shipping_address: Json | null
          phone: string | null
          email: string | null
          tax_id: string | null
          payment_terms: string
          credit_limit: number | null
          status: 'active' | 'inactive' | 'suspended'
          assigned_to: string | null
          annual_revenue: number | null
          employee_count: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          account_type?: 'individual' | 'company'
          industry?: string | null
          website?: string | null
          business_url?: string | null
          photo_url?: string | null
          billing_address?: Json | null
          shipping_address?: Json | null
          phone?: string | null
          email?: string | null
          tax_id?: string | null
          payment_terms?: string
          credit_limit?: number | null
          status?: 'active' | 'inactive' | 'suspended'
          assigned_to?: string | null
          annual_revenue?: number | null
          employee_count?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          account_type?: 'individual' | 'company'
          industry?: string | null
          website?: string | null
          business_url?: string | null
          photo_url?: string | null
          billing_address?: Json | null
          shipping_address?: Json | null
          phone?: string | null
          email?: string | null
          tax_id?: string | null
          payment_terms?: string
          credit_limit?: number | null
          status?: 'active' | 'inactive' | 'suspended'
          assigned_to?: string | null
          annual_revenue?: number | null
          employee_count?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      contacts: {
        Row: {
          id: string
          tenant_id: string
          account_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          job_title: string | null
          department: string | null
          relationship_to_account: string | null
          address: Json | null
          avatar_url: string | null
          status: 'active' | 'inactive'
          assigned_to: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          department?: string | null
          relationship_to_account?: string | null
          address?: Json | null
          avatar_url?: string | null
          status?: 'active' | 'inactive'
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          department?: string | null
          relationship_to_account?: string | null
          address?: Json | null
          avatar_url?: string | null
          status?: 'active' | 'inactive'
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      opportunities: {
        Row: {
          id: string
          tenant_id: string
          account_id: string | null
          contact_id: string | null
          name: string
          description: string | null
          stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability: number
          estimated_value: number | null
          actual_value: number | null
          expected_close_date: string | null
          actual_close_date: string | null
          source: string | null
          assigned_to: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id?: string | null
          contact_id?: string | null
          name: string
          description?: string | null
          stage?: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability?: number
          estimated_value?: number | null
          actual_value?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          source?: string | null
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string | null
          contact_id?: string | null
          name?: string
          description?: string | null
          stage?: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability?: number
          estimated_value?: number | null
          actual_value?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          source?: string | null
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // EVENTS MODULE
      // =====================================================

      events: {
        Row: {
          id: string
          tenant_id: string
          account_id: string | null
          contact_id: string | null
          opportunity_id: string | null
          name: string
          event_type: 'photo_booth' | 'photography' | 'videography' | 'other'
          event_date: string
          start_time: string | null
          end_time: string | null
          duration_hours: number | null
          venue_name: string | null
          venue_address: Json | null
          guest_count: number | null
          setup_notes: string | null
          special_requirements: string | null
          assigned_staff: string[]
          equipment_needed: Json
          total_cost: number | null
          deposit_amount: number | null
          balance_amount: number | null
          invoice_id: string | null
          contract_url: string | null
          photos_urls: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          name: string
          event_type?: 'photo_booth' | 'photography' | 'videography' | 'other'
          event_date: string
          start_time?: string | null
          end_time?: string | null
          duration_hours?: number | null
          venue_name?: string | null
          venue_address?: Json | null
          guest_count?: number | null
          setup_notes?: string | null
          special_requirements?: string | null
          assigned_staff?: string[]
          equipment_needed?: Json
          total_cost?: number | null
          deposit_amount?: number | null
          balance_amount?: number | null
          invoice_id?: string | null
          contract_url?: string | null
          photos_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          name?: string
          event_type?: 'photo_booth' | 'photography' | 'videography' | 'other'
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          duration_hours?: number | null
          venue_name?: string | null
          venue_address?: Json | null
          guest_count?: number | null
          setup_notes?: string | null
          special_requirements?: string | null
          assigned_staff?: string[]
          equipment_needed?: Json
          total_cost?: number | null
          deposit_amount?: number | null
          balance_amount?: number | null
          invoice_id?: string | null
          contract_url?: string | null
          photos_urls?: string[]
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // INVENTORY MODULE
      // =====================================================

      equipment_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }

      equipment: {
        Row: {
          id: string
          tenant_id: string
          category_id: string | null
          name: string
          description: string | null
          model: string | null
          serial_number: string | null
          purchase_date: string | null
          purchase_price: number | null
          current_value: number | null
          status: 'available' | 'in_use' | 'maintenance' | 'retired'
          condition: 'excellent' | 'good' | 'fair' | 'poor'
          location: string | null
          maintenance_notes: string | null
          last_maintenance_date: string | null
          next_maintenance_date: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          category_id?: string | null
          name: string
          description?: string | null
          model?: string | null
          serial_number?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          current_value?: number | null
          status?: 'available' | 'in_use' | 'maintenance' | 'retired'
          condition?: 'excellent' | 'good' | 'fair' | 'poor'
          location?: string | null
          maintenance_notes?: string | null
          last_maintenance_date?: string | null
          next_maintenance_date?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          model?: string | null
          serial_number?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          current_value?: number | null
          status?: 'available' | 'in_use' | 'maintenance' | 'retired'
          condition?: 'excellent' | 'good' | 'fair' | 'poor'
          location?: string | null
          maintenance_notes?: string | null
          last_maintenance_date?: string | null
          next_maintenance_date?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // STAFF MODULE
      // =====================================================

      staff_profiles: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          employee_id: string | null
          hire_date: string | null
          termination_date: string | null
          position: string | null
          hourly_rate: number | null
          skills: string[]
          certifications: string[]
          emergency_contact: Json | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          employee_id?: string | null
          hire_date?: string | null
          termination_date?: string | null
          position?: string | null
          hourly_rate?: number | null
          skills?: string[]
          certifications?: string[]
          emergency_contact?: Json | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          employee_id?: string | null
          hire_date?: string | null
          termination_date?: string | null
          position?: string | null
          hourly_rate?: number | null
          skills?: string[]
          certifications?: string[]
          emergency_contact?: Json | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // FINANCIAL MODULE
      // =====================================================

      invoices: {
        Row: {
          id: string
          tenant_id: string
          invoice_number: string
          account_id: string | null
          contact_id: string | null
          event_id: string | null
          issue_date: string
          due_date: string
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal: number
          tax_rate: number
          tax_amount: number
          total_amount: number
          paid_amount: number
          balance_amount: number
          payment_terms: string | null
          notes: string | null
          quickbooks_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          invoice_number: string
          account_id?: string | null
          contact_id?: string | null
          event_id?: string | null
          issue_date: string
          due_date: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal: number
          tax_rate?: number
          tax_amount?: number
          total_amount: number
          paid_amount?: number
          balance_amount: number
          payment_terms?: string | null
          notes?: string | null
          quickbooks_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          invoice_number?: string
          account_id?: string | null
          contact_id?: string | null
          event_id?: string | null
          issue_date?: string
          due_date?: string
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total_amount?: number
          paid_amount?: number
          balance_amount?: number
          payment_terms?: string | null
          notes?: string | null
          quickbooks_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================================
      // SYSTEM TABLES
      // =====================================================

      audit_log: {
        Row: {
          id: string
          tenant_id: string | null
          user_id: string | null
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Opportunity = Database['public']['Tables']['opportunities']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Equipment = Database['public']['Tables']['equipment']['Row']
export type EquipmentCategory = Database['public']['Tables']['equipment_categories']['Row']
export type StaffProfile = Database['public']['Tables']['staff_profiles']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']

// Insert types
export type TenantInsert = Database['public']['Tables']['tenants']['Insert']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EquipmentInsert = Database['public']['Tables']['equipment']['Insert']
export type EquipmentCategoryInsert = Database['public']['Tables']['equipment_categories']['Insert']
export type StaffProfileInsert = Database['public']['Tables']['staff_profiles']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']

// Update types
export type TenantUpdate = Database['public']['Tables']['tenants']['Update']
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type EquipmentUpdate = Database['public']['Tables']['equipment']['Update']
export type EquipmentCategoryUpdate = Database['public']['Tables']['equipment_categories']['Update']
export type StaffProfileUpdate = Database['public']['Tables']['staff_profiles']['Update']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

// User roles enum
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  MANAGER = 'manager',
  USER = 'user',
  STAFF = 'staff'
}

// Permission types
export interface UserPermissions {
  can_view_all_accounts: boolean
  can_edit_all_accounts: boolean
  can_delete_accounts: boolean
  can_view_financials: boolean
  can_edit_financials: boolean
  can_manage_users: boolean
  can_manage_equipment: boolean
  can_manage_events: boolean
  can_view_reports: boolean
  can_manage_settings: boolean
}




