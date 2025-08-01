export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          industry: string | null
          website: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          annual_revenue: number | null
          employee_count: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          annual_revenue?: number | null
          employee_count?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          annual_revenue?: number | null
          employee_count?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          account_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          job_title: string | null
          department: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          department?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          department?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          account_id: string | null
          contact_id: string | null
          name: string
          description: string | null
          amount: number | null
          stage: string
          probability: number | null
          expected_close_date: string | null
          actual_close_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id?: string | null
          contact_id?: string | null
          name: string
          description?: string | null
          amount?: number | null
          stage?: string
          probability?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string | null
          contact_id?: string | null
          name?: string
          description?: string | null
          amount?: number | null
          stage?: string
          probability?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          account_id: string | null
          contact_id: string | null
          opportunity_id: string | null
          title: string
          description: string | null
          event_type: string
          start_date: string
          end_date: string | null
          location: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          title: string
          description?: string | null
          event_type: string
          start_date: string
          end_date?: string | null
          location?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          title?: string
          description?: string | null
          event_type?: string
          start_date?: string
          end_date?: string | null
          location?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          account_id: string | null
          contact_id: string | null
          opportunity_id: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          subtotal: number
          tax_amount: number
          total_amount: number
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          invoice_number?: string
          issue_date?: string
          due_date?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method: string | null
          reference_number: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_values: any | null
          new_values: any | null
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_values?: any | null
          new_values?: any | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_values?: any | null
          new_values?: any | null
          user_id?: string | null
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
