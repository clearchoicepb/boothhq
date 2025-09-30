import { FormConfig } from '../types'
import type { Contact } from '@/lib/supabase-client'

export const contactFormConfig: FormConfig<Contact> = {
  entity: 'contacts',
  fields: [
    {
      name: 'first_name',
      type: 'text',
      label: 'First Name',
      required: true,
      gridCols: 1
    },
    {
      name: 'last_name',
      type: 'text',
      label: 'Last Name',
      required: true,
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
      name: 'job_title',
      type: 'text',
      label: 'Job Title',
      gridCols: 1
    },
    {
      name: 'department',
      type: 'text',
      label: 'Department',
      gridCols: 1
    },
    {
      name: 'account_id',
      type: 'select',
      label: 'Account',
      options: 'accounts',
      gridCols: 2
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      gridCols: 1
    },
    // Address Information
    {
      name: 'address_line_1',
      type: 'text',
      label: 'Address Line 1',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'address_line_2',
      type: 'text',
      label: 'Address Line 2',
      section: 'Address Information',
      gridCols: 1
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
      name: 'zip_code',
      type: 'text',
      label: 'Zip Code',
      section: 'Address Information',
      gridCols: 1
    }
  ],
  sections: [
    {
      title: 'Address Information',
      fields: [
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'zip_code'
      ]
    }
  ],
  relatedData: [
    {
      key: 'accounts',
      endpoint: '/api/accounts',
      displayField: 'name',
      valueField: 'id'
    }
  ],
  defaultValues: {
    status: 'active',
    tenant_id: ''
  }
}
