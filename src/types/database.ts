export interface AuditValues {
  [key: string]: string | number | boolean | object | null
}

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
          billing_address_line_1: string | null
          billing_address_line_2: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip_code: string | null
          shipping_address_line_1: string | null
          shipping_address_line_2: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_zip_code: string | null
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
          billing_address_line_1?: string | null
          billing_address_line_2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip_code?: string | null
          shipping_address_line_1?: string | null
          shipping_address_line_2?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip_code?: string | null
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
          billing_address_line_1?: string | null
          billing_address_line_2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip_code?: string | null
          shipping_address_line_1?: string | null
          shipping_address_line_2?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip_code?: string | null
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
      leads: {
        Row: {
          id: string
          tenant_id: string
          lead_type: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          company: string | null
          company_url: string | null
          source: string | null
          status: string
          notes: string | null
          photo_url: string | null
          is_converted: boolean
          converted_at: string | null
          converted_account_id: string | null
          converted_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_type: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          company_url?: string | null
          source?: string | null
          status?: string
          notes?: string | null
          photo_url?: string | null
          is_converted?: boolean
          converted_at?: string | null
          converted_account_id?: string | null
          converted_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_type?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          company_url?: string | null
          source?: string | null
          status?: string
          notes?: string | null
          photo_url?: string | null
          is_converted?: boolean
          converted_at?: string | null
          converted_account_id?: string | null
          converted_contact_id?: string | null
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
          lead_id: string | null
          owner_id: string | null
          name: string
          description: string | null
          amount: number | null
          stage: string
          probability: number | null
          expected_close_date: string | null
          actual_close_date: string | null
          close_reason: string | null
          close_notes: string | null
          event_type: string | null
          date_type: string | null
          event_date: string | null
          initial_date: string | null
          final_date: string | null
          mailing_address_line1: string | null
          mailing_address_line2: string | null
          mailing_city: string | null
          mailing_state: string | null
          mailing_postal_code: string | null
          mailing_country: string | null
          is_converted: boolean
          converted_at: string | null
          converted_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id?: string | null
          contact_id?: string | null
          lead_id?: string | null
          owner_id?: string | null
          name: string
          description?: string | null
          amount?: number | null
          stage?: string
          probability?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          close_reason?: string | null
          close_notes?: string | null
          event_type?: string | null
          date_type?: string | null
          event_date?: string | null
          initial_date?: string | null
          final_date?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_postal_code?: string | null
          mailing_country?: string | null
          is_converted?: boolean
          converted_at?: string | null
          converted_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string | null
          contact_id?: string | null
          lead_id?: string | null
          owner_id?: string | null
          name?: string
          description?: string | null
          amount?: number | null
          stage?: string
          probability?: number | null
          expected_close_date?: string | null
          actual_close_date?: string | null
          close_reason?: string | null
          close_notes?: string | null
          event_type?: string | null
          date_type?: string | null
          event_date?: string | null
          initial_date?: string | null
          final_date?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_postal_code?: string | null
          mailing_country?: string | null
          is_converted?: boolean
          converted_at?: string | null
          converted_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          account_id: string | null
          contact_id: string | null
          opportunity_id: string | null
          title: string
          description: string | null
          event_type: string
          start_date: string
          end_date: string | null
          location: string | null
          location_id: string | null
          status: string
          date_type: string | null
          mailing_address_line1: string | null
          mailing_address_line2: string | null
          mailing_city: string | null
          mailing_state: string | null
          mailing_postal_code: string | null
          mailing_country: string | null
          converted_from_opportunity_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          title: string
          description?: string | null
          event_type: string
          start_date: string
          end_date?: string | null
          location?: string | null
          location_id?: string | null
          status?: string
          date_type?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_postal_code?: string | null
          mailing_country?: string | null
          converted_from_opportunity_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string | null
          contact_id?: string | null
          opportunity_id?: string | null
          title?: string
          description?: string | null
          event_type?: string
          start_date?: string
          end_date?: string | null
          location?: string | null
          location_id?: string | null
          status?: string
          date_type?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_postal_code?: string | null
          mailing_country?: string | null
          converted_from_opportunity_id?: string | null
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
          old_values: AuditValues | null
          new_values: AuditValues | null
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
          old_values?: AuditValues | null
          new_values?: AuditValues | null
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
          old_values?: AuditValues | null
          new_values?: AuditValues | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          is_one_time: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          is_one_time?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          is_one_time?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_dates: {
        Row: {
          id: string
          tenant_id: string
          opportunity_id: string | null
          event_id: string | null
          location_id: string | null
          event_date: string
          start_time: string | null
          end_time: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          opportunity_id?: string | null
          event_id?: string | null
          location_id?: string | null
          event_date: string
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          opportunity_id?: string | null
          event_id?: string | null
          location_id?: string | null
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
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
