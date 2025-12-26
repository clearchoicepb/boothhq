import { FormConfig } from '../types'
import { ROLES_WITH_LABELS } from '@/lib/roles'
import { getDepartmentOptions } from '@/lib/departments'

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
      name: 'departments',
      type: 'departmentWithManager',
      label: 'Departments & Manager Roles',
      options: getDepartmentOptions(),
      managerField: 'manager_of_departments',
      gridCols: 2,
      placeholder: 'Select departments and specify manager roles'
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
    // User Type: Staff vs White Label
    {
      name: 'user_type',
      type: 'select',
      label: 'User Type',
      section: 'Pay Configuration',
      options: [
        { value: 'staff', label: 'Staff' },
        { value: 'white_label', label: 'White Label Partner' }
      ],
      gridCols: 1,
      helpText: 'White Label partners are paid flat rate per event'
    },
    // Pay Type: Hourly vs Flat Rate (for Staff only)
    {
      name: 'pay_type',
      type: 'select',
      label: 'Default Pay Type',
      section: 'Pay Configuration',
      options: [
        { value: 'hourly', label: 'Hourly' },
        { value: 'flat_rate', label: 'Flat Rate' }
      ],
      gridCols: 1,
      conditional: {
        field: 'user_type',
        operator: 'equals',
        value: 'staff'
      }
    },
    // Hourly Rate (shown for Staff + Hourly)
    {
      name: 'pay_rate',
      type: 'currency',
      label: 'Hourly Rate',
      section: 'Pay Configuration',
      validation: {
        min: 0
      },
      gridCols: 1,
      conditional: {
        field: 'pay_type',
        operator: 'equals',
        value: 'hourly'
      }
    },
    // Default Flat Rate (shown for Staff + Flat Rate OR White Label)
    // Note: Always visible so it works for white_label users too
    {
      name: 'default_flat_rate',
      type: 'currency',
      label: 'Default Flat Rate',
      section: 'Pay Configuration',
      validation: {
        min: 0
      },
      gridCols: 1,
      helpText: 'Default amount per event. Can be overridden when assigning to events.'
    },
    // Mileage Section (Staff only)
    {
      name: 'mileage_enabled',
      type: 'checkbox',
      label: 'Calculate mileage for this user',
      section: 'Mileage',
      gridCols: 2,
      conditional: {
        field: 'user_type',
        operator: 'equals',
        value: 'staff'
      },
      helpText: 'Mileage is only calculated for hourly events, not flat rate events'
    },
    {
      name: 'mileage_rate',
      type: 'currency',
      label: 'Mileage Rate (per mile)',
      section: 'Mileage',
      validation: {
        min: 0
      },
      gridCols: 1,
      conditional: {
        field: 'mileage_enabled',
        operator: 'equals',
        value: true
      },
      helpText: 'IRS standard rate for 2024 is $0.67/mile'
    },
    {
      name: 'hire_date',
      type: 'date',
      label: 'Hire Date',
      gridCols: 1
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      required: false,
      gridCols: 1,
      placeholder: 'Required for new users, leave blank to keep current password'
    },
    // Address Information - uses Google Places autocomplete with coordinate capture
    {
      name: 'home_address',
      type: 'address',
      label: 'Home Address',
      section: 'Address Information',
      gridCols: 2,
      addressFields: {
        address_line1: 'address_line_1',
        address_line2: 'address_line_2',
        city: 'city',
        state: 'state',
        postal_code: 'zip_code',
        country: 'country',
        latitude: 'home_latitude',
        longitude: 'home_longitude'
        // Note: place_id not stored for users, only for locations
      }
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
      title: 'Pay Configuration',
      fields: [
        'user_type',
        'pay_type',
        'pay_rate',
        'default_flat_rate'
      ]
    },
    {
      title: 'Mileage',
      fields: [
        'mileage_enabled',
        'mileage_rate'
      ]
    },
    {
      title: 'Address Information',
      fields: [
        'home_address'
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
    employee_type: 'W2',
    departments: [],
    manager_of_departments: [],
    user_type: 'staff',
    pay_type: 'hourly',
    mileage_enabled: false,
    mileage_rate: 0.50
  }
}
