import { FormConfig } from '../types'

export const productGroupFormConfig: FormConfig<any> = {
  entity: 'product_group',
  fields: [
    {
      name: 'group_name',
      type: 'text',
      label: 'Group Name',
      placeholder: 'e.g., Photo Booth Package #1, Johns Standard Kit',
      required: true,
      gridCols: 2
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Optional description of this equipment bundle...',
      gridCols: 2
    },
    {
      name: 'assigned_to_type',
      type: 'select',
      label: 'Assigned To Type',
      required: true,
      options: [
        { value: 'user', label: 'User' },
        { value: 'physical_address', label: 'Physical Address' }
      ],
      gridCols: 1
    },
    {
      name: 'assigned_to_id',
      type: 'select',
      label: 'Assigned To',
      required: true,
      options: 'dynamic', // Will be populated dynamically based on assigned_to_type
      gridCols: 1
    }
  ],
  relatedData: [
    {
      key: 'users',
      endpoint: '/api/users',
      displayField: 'first_name',
      valueField: 'id',
      displayFormat: 'first_name last_name'
    },
    {
      key: 'physical_addresses',
      endpoint: '/api/physical-addresses',
      displayField: 'location_name',
      valueField: 'id'
    }
  ],
  defaultValues: {
    assigned_to_type: 'physical_address'
  }
}
