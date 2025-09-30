import { FormConfig } from '../types'
import { ROLES_WITH_LABELS } from '@/lib/roles'

export const userFormConfig: FormConfig<any> = {
  entity: 'users',
  fields: [
    // Basic Information (shown first)
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
      required: true,
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
      name: 'role',
      type: 'select',
      label: 'Role',
      required: true,
      options: ROLES_WITH_LABELS,
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' }
      ],
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
      name: 'employee_type',
      type: 'select',
      label: 'Employee Type',
      options: [
        { value: 'W2', label: 'W2 Employee' },
        { value: '1099', label: '1099 Contractor' },
        { value: 'International', label: 'International' }
      ],
      gridCols: 1
    },
    {
      name: 'pay_rate',
      type: 'number',
      label: 'Pay Rate',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'hire_date',
      type: 'date',
      label: 'Hire Date',
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
    },
    // Emergency Contact
    {
      name: 'emergency_contact_name',
      type: 'text',
      label: 'Emergency Contact Name',
      section: 'Emergency Contact',
      gridCols: 1
    },
    {
      name: 'emergency_contact_phone',
      type: 'phone',
      label: 'Emergency Contact Phone',
      section: 'Emergency Contact',
      gridCols: 1
    },
    {
      name: 'emergency_contact_relationship',
      type: 'text',
      label: 'Relationship',
      section: 'Emergency Contact',
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
    },
    {
      title: 'Emergency Contact',
      fields: [
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship'
      ]
    }
  ],
  defaultValues: {
    role: 'user',
    status: 'active',
    employee_type: 'W2'
  }
}
