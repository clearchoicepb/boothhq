import type { Account, Contact, Opportunity } from '@/lib/supabase-client'

export const sampleAccounts: Account[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    industry: 'Technology',
    website: 'https://acme.com',
    phone: '+1-555-0123',
    email: 'contact@acme.com',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    postal_code: '94105',
    annual_revenue: 5000000,
    employee_count: 250,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Global Industries',
    industry: 'Manufacturing',
    website: 'https://global.com',
    phone: '+1-555-0456',
    email: 'info@global.com',
    address: '456 Oak Ave',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    postal_code: '60601',
    annual_revenue: 15000000,
    employee_count: 500,
    status: 'active',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
]

export const sampleContacts: Contact[] = [
  {
    id: '1',
    account_id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@acme.com',
    phone: '+1-555-0001',
    job_title: 'CEO',
    department: 'Executive',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    postal_code: '94105',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    account_id: '1',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@acme.com',
    phone: '+1-555-0002',
    job_title: 'CTO',
    department: 'Technology',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    postal_code: '94105',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    account_id: '2',
    first_name: 'Bob',
    last_name: 'Johnson',
    email: 'bob.johnson@global.com',
    phone: '+1-555-0003',
    job_title: 'VP Sales',
    department: 'Sales',
    address: '456 Oak Ave',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    postal_code: '60601',
    status: 'active',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
]

export const sampleOpportunities: Opportunity[] = [
  {
    id: '1',
    account_id: '1',
    contact_id: '1',
    name: 'Enterprise Software License',
    description: 'Large enterprise software license deal',
    amount: 500000,
    stage: 'proposal',
    probability: 75,
    expected_close_date: '2024-03-01',
    actual_close_date: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    account_id: '2',
    contact_id: '3',
    name: 'Manufacturing Equipment',
    description: 'New manufacturing equipment purchase',
    amount: 250000,
    stage: 'negotiation',
    probability: 60,
    expected_close_date: '2024-02-15',
    actual_close_date: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
]
