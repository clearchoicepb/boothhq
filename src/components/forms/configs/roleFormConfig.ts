import { FormConfig } from '../types'

export const roleFormConfig: FormConfig<any> = {
  entity: 'roles',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Role Name',
      required: true,
      gridCols: 1
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      gridCols: 2
    },
    {
      name: 'permissions',
      type: 'multiSelect',
      label: 'Permissions',
      options: [
        { value: 'contacts', label: 'Contacts' },
        { value: 'accounts', label: 'Accounts' },
        { value: 'leads', label: 'Leads' },
        { value: 'opportunities', label: 'Opportunities' },
        { value: 'events', label: 'Events' },
        { value: 'invoices', label: 'Invoices' },
        { value: 'payments', label: 'Payments' },
        { value: 'inventory', label: 'Inventory' },
        { value: 'users', label: 'User Management' },
        { value: 'settings', label: 'Settings' },
        { value: 'reports', label: 'Reports' }
      ],
      gridCols: 2
    },
    {
      name: 'is_active',
      type: 'checkbox',
      label: 'Active',
      gridCols: 1
    }
  ],
  defaultValues: {
    is_active: true,
    permissions: []
  }
}










