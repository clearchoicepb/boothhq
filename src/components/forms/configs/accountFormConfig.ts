import { FormConfig } from '../types'
import type { Account } from '@/lib/supabase-client'

export const accountFormConfig: FormConfig<Account> = {
  entity: 'accounts',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Account Name',
      required: true,
      gridCols: 2
    },
    {
      name: 'industry',
      type: 'text',
      label: 'Industry',
      gridCols: 1
    },
    {
      name: 'website',
      type: 'url',
      label: 'Website',
      validation: {
        pattern: /^https?:\/\/.+/
      },
      gridCols: 1
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      gridCols: 1
    },
    {
      name: 'phone',
      type: 'phone',
      label: 'Phone',
      gridCols: 1
    },
    {
      name: 'annual_revenue',
      type: 'number',
      label: 'Annual Revenue',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'employee_count',
      type: 'number',
      label: 'Employee Count',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'prospect', label: 'Prospect' }
      ],
      gridCols: 1
    },
    // Address Information
    {
      name: 'address',
      type: 'text',
      label: 'Address',
      section: 'Address Information',
      gridCols: 2
    },
    {
      name: 'city',
      type: 'text',
      label: 'City',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'state',
      type: 'text',
      label: 'State',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'country',
      type: 'text',
      label: 'Country',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'postal_code',
      type: 'text',
      label: 'Postal Code',
      section: 'Address Information',
      gridCols: 1
    }
  ],
  sections: [
    {
      title: 'Address Information',
      fields: [
        'address',
        'city',
        'state',
        'country',
        'postal_code'
      ]
    }
  ],
  defaultValues: {
    status: 'active'
  }
}
