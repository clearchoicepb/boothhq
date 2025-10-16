export interface EntityConfig {
  table: string
  requiredFields: string[]
  searchFields: string[]
  relations?: string[]
  permissions: {
    view: string
    create: string
    edit: string
    delete: string
  }
  validation?: Record<string, ValidationRule>
  defaultOrder?: {
    field: string
    direction: 'asc' | 'desc'
  }
  transformResponse?: (data: any, searchParams?: URLSearchParams) => any
  transformRequest?: (data: any) => any
}

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'url' | 'date'
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface FilterOptions {
  search?: string
  status?: string
  type?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// Entity configurations for all your entities
export const entityConfigs: Record<string, EntityConfig> = {
  contacts: {
    table: 'contacts',
    requiredFields: ['first_name', 'last_name'],
    searchFields: ['first_name', 'last_name', 'email', 'phone'],
    relations: ['accounts'],
    permissions: {
      view: 'contacts.view',
      create: 'contacts.create',
      edit: 'contacts.edit',
      delete: 'contacts.delete'
    },
    validation: {
      email: {
        type: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      phone: {
        pattern: /^[\+]?[1-9][\d]{0,15}$/
      },
      status: {
        custom: (value) => {
          const validStatuses = ['active', 'inactive', 'suspended']
          if (value && !validStatuses.includes(value)) {
            return `Status must be one of: ${validStatuses.join(', ')}`
          }
          return null
        }
      }
    },
    defaultOrder: {
      field: 'created_at',
      direction: 'desc'
    },
    transformRequest: (data) => {
      // Transform request data to match database constraints
      const transformed = { ...data }
      
      // Ensure required fields have defaults
      if (!transformed.status) {
        transformed.status = 'active'
      }
      
      return transformed
    },
    transformResponse: (data) => {
      // Add computed fields or transform data
      return data.map((contact: any) => ({
        ...contact,
        full_name: `${contact.first_name} ${contact.last_name}`.trim(),
        account_name: contact.accounts?.name || null
      }))
    }
  },

  accounts: {
    table: 'accounts',
    requiredFields: ['name'],
    searchFields: ['name', 'industry', 'email', 'phone'],
    relations: ['contacts'],
    permissions: {
      view: 'accounts.view',
      create: 'accounts.create',
      edit: 'accounts.edit',
      delete: 'accounts.delete'
    },
    validation: {
      email: {
        type: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      website: {
        type: 'url',
        pattern: /^https?:\/\/.+/
      },
      annual_revenue: {
        type: 'number',
        min: 0
      },
      employee_count: {
        type: 'number',
        min: 0
      },
      account_type: {
        custom: (value) => {
          const validTypes = ['individual', 'company']
          if (value && !validTypes.includes(value)) {
            return `Account type must be one of: ${validTypes.join(', ')}`
          }
          return null
        }
      },
      status: {
        custom: (value) => {
          const validStatuses = ['active', 'inactive', 'suspended']
          if (value && !validStatuses.includes(value)) {
            return `Status must be one of: ${validStatuses.join(', ')}`
          }
          return null
        }
      }
    },
    defaultOrder: {
      field: 'created_at',
      direction: 'desc'
    },
    transformRequest: (data) => {
      // Transform request data to match database constraints
      const transformed = { ...data }
      
      // Ensure required fields have defaults
      if (!transformed.account_type) {
        transformed.account_type = 'company'
      }
      if (!transformed.status) {
        transformed.status = 'active'
      }
      
      return transformed
    }
  },

  events: {
    table: 'events',
    requiredFields: ['title', 'event_type'],
    searchFields: ['title', 'description', 'location'],
    relations: ['accounts', 'contacts'],
    permissions: {
      view: 'events.view',
      create: 'events.create',
      edit: 'events.edit',
      delete: 'events.delete'
    },
    validation: {
      start_date: {
        type: 'date',
        custom: (value) => {
          if (new Date(value) < new Date()) {
            return 'Start date cannot be in the past'
          }
          return null
        }
      },
      status: {
        custom: (value) => {
          const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']
          if (value && !validStatuses.includes(value)) {
            return `Status must be one of: ${validStatuses.join(', ')}`
          }
          return null
        }
      }
    },
    defaultOrder: {
      field: 'start_date',
      direction: 'asc'
    },
    transformRequest: (data) => {
      // Transform request data to match database constraints
      const transformed = { ...data }
      
      // Convert invalid status values to valid ones
      if (transformed.status === 'upcoming') {
        transformed.status = 'scheduled'
      }
      
      // Ensure required fields have defaults
      if (!transformed.status) {
        transformed.status = 'scheduled'
      }
      
      // Convert empty date strings to null
      if (transformed.start_date === '') transformed.start_date = null
      if (transformed.end_date === '') transformed.end_date = null
      
      return transformed
    },
    transformResponse: (data) => {
      return data.map((event: any) => ({
        ...event,
        account_name: event.accounts?.name || null,
        contact_name: event.contacts ? 
          `${event.contacts.first_name} ${event.contacts.last_name}`.trim() : null
      }))
    }
  },

  opportunities: {
    table: 'opportunities',
    requiredFields: ['name', 'stage'],
    searchFields: ['name', 'description'],
    relations: ['accounts', 'contacts'],
    permissions: {
      view: 'opportunities.view',
      create: 'opportunities.create',
      edit: 'opportunities.edit',
      delete: 'opportunities.delete'
    },
    validation: {
      amount: {
        type: 'number',
        min: 0
      },
      probability: {
        type: 'number',
        min: 0,
        max: 100
      },
      stage: {
        custom: (value) => {
          const validStages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
          if (value && !validStages.includes(value)) {
            return `Stage must be one of: ${validStages.join(', ')}`
          }
          return null
        }
      }
    },
    defaultOrder: {
      field: 'created_at',
      direction: 'desc'
    },
    transformRequest: (data) => {
      // Transform request data to match database constraints
      const transformed = { ...data }

      // Remove status field if present (opportunities use stage instead)
      if (transformed.status) {
        delete transformed.status
      }

      // Remove fields that don't exist in the current database schema
      delete transformed.mailing_address_line1
      delete transformed.mailing_address_line2
      delete transformed.mailing_city
      delete transformed.mailing_state
      delete transformed.mailing_postal_code
      delete transformed.mailing_country
      delete transformed.event_dates  // event_dates belongs to events table, not opportunities

      // Convert empty date strings to null
      if (transformed.expected_close_date === '') transformed.expected_close_date = null
      if (transformed.actual_close_date === '') transformed.actual_close_date = null
      if (transformed.event_date === '') transformed.event_date = null
      if (transformed.initial_date === '') transformed.initial_date = null
      if (transformed.final_date === '') transformed.final_date = null

      // Fix date_type values to match database constraints
      if (transformed.date_type === 'single_day') {
        transformed.date_type = 'single'
      } else if (transformed.date_type === 'same_location_sequential' ||
                 transformed.date_type === 'same_location_non_sequential' ||
                 transformed.date_type === 'multiple_locations') {
        transformed.date_type = 'multiple'
      }

      return transformed
    },
    transformResponse: (data, searchParams) => {
      // Check if we should include converted opportunities
      const includeConverted = searchParams?.get('include_converted') === 'true'
      
      // Filter out converted opportunities unless explicitly requested
      const filteredData = includeConverted 
        ? data 
        : data.filter((opportunity: any) => !opportunity.is_converted)
      
      return filteredData.map((opportunity: any) => ({
        ...opportunity,
        account_name: opportunity.accounts?.name || null,
        contact_name: opportunity.contacts ?
          `${opportunity.contacts.first_name} ${opportunity.contacts.last_name}`.trim() : null
      }))
    }
  },

  invoices: {
    table: 'invoices',
    requiredFields: ['invoice_number', 'issue_date', 'due_date'],
    searchFields: ['invoice_number', 'notes'],
    relations: ['accounts', 'contacts', 'opportunities'],
    permissions: {
      view: 'invoices.view',
      create: 'invoices.create',
      edit: 'invoices.edit',
      delete: 'invoices.delete'
    },
    validation: {
      subtotal: {
        type: 'number',
        min: 0
      },
      tax_amount: {
        type: 'number',
        min: 0
      },
      total_amount: {
        type: 'number',
        min: 0
      },
      status: {
        custom: (value) => {
          const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled']
          if (value && !validStatuses.includes(value)) {
            return `Status must be one of: ${validStatuses.join(', ')}`
          }
          return null
        }
      }
    },
    defaultOrder: {
      field: 'created_at',
      direction: 'desc'
    },
    transformRequest: (data) => {
      // Transform request data to match database constraints
      const transformed = { ...data }
      
      // Convert empty date strings to null
      if (transformed.issue_date === '') transformed.issue_date = null
      if (transformed.due_date === '') transformed.due_date = null
      
      // Ensure status has a default value
      if (!transformed.status) {
        transformed.status = 'draft'
      }
      
      return transformed
    },
    transformResponse: (data) => {
      return data.map((invoice: any) => ({
        ...invoice,
        account_name: invoice.accounts?.name || null,
        contact_name: invoice.contacts ? 
          `${invoice.contacts.first_name} ${invoice.contacts.last_name}`.trim() : null,
        opportunity_name: invoice.opportunities?.name || null
      }))
    }
  },

  leads: {
    table: 'leads',
    requiredFields: ['first_name', 'last_name'],
    searchFields: ['first_name', 'last_name', 'email', 'phone', 'company'],
    relations: ['accounts', 'contacts'],
    permissions: {
      view: 'leads.view',
      create: 'leads.create',
      edit: 'leads.edit',
      delete: 'leads.delete'
    },
    validation: {
      email: {
        type: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      phone: {
        pattern: /^[\+]?[1-9][\d]{0,15}$/
      },
      lead_type: {
        custom: (value) => {
          const validTypes = ['personal', 'company']
          if (value && !validTypes.includes(value)) {
            return `Lead type must be one of: ${validTypes.join(', ')}`
          }
          return null
        }
      },
      status: {
        custom: (value) => {
          const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost']
          if (value && !validStatuses.includes(value)) {
            return `Status must be one of: ${validStatuses.join(', ')}`
          }
          return null
        }
      }
    },
    defaultOrder: {
      field: 'created_at',
      direction: 'desc'
    },
    transformRequest: (data) => {
      // Transform request data to match database constraints
      const transformed = { ...data }
      
      // Ensure required fields have defaults
      if (!transformed.lead_type) {
        transformed.lead_type = 'personal'
      }
      if (!transformed.status) {
        transformed.status = 'new'
      }
      
      return transformed
    }
  }
}

export function getEntityConfig(entity: string): EntityConfig {
  const config = entityConfigs[entity]
  if (!config) {
    throw new Error(`No configuration found for entity: ${entity}`)
  }
  return config
}

export function getAllEntityTypes(): string[] {
  return Object.keys(entityConfigs)
}

export function validateEntityData(entity: string, data: any, isUpdate: boolean = false): { isValid: boolean; errors: Record<string, string> } {
  const config = getEntityConfig(entity)
  const errors: Record<string, string> = {}

  // Check required fields only for new records, not updates
  if (!isUpdate) {
    for (const field of config.requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors[field] = `${field} is required`
      }
    }
  }

  // Check validation rules
  if (config.validation) {
    for (const [field, rule] of Object.entries(config.validation)) {
      const value = data[field]
      if (!value) continue

      // Type validation
      if (rule.type === 'number' && typeof value !== 'number') {
        errors[field] = `${field} must be a number`
      }
      if (rule.type === 'email' && typeof value !== 'string') {
        errors[field] = `${field} must be a string`
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors[field] = `${field} format is invalid`
      }

      // Min/Max validation
      if (rule.min && typeof value === 'number' && value < rule.min) {
        errors[field] = `${field} must be at least ${rule.min}`
      }
      if (rule.max && typeof value === 'number' && value > rule.max) {
        errors[field] = `${field} must be at most ${rule.max}`
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value)
        if (customError) {
          errors[field] = customError
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
