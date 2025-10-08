import { FormConfig } from '../types'

export const inventoryFormConfig: FormConfig<any> = {
  entity: 'inventory',
  fields: [
    {
      name: 'item_id',
      type: 'text',
      label: 'Item ID',
      placeholder: 'e.g., C107, HS111',
      required: true,
      gridCols: 1
    },
    {
      name: 'name',
      type: 'text',
      label: 'Equipment Name',
      placeholder: 'e.g., Canon Camera, Hot Spot Verizon',
      required: true,
      gridCols: 1
    },
    {
      name: 'equipment_type',
      type: 'select',
      label: 'Equipment Type',
      required: true,
      options: [
        { value: 'Camera', label: 'Camera' },
        { value: 'iPad', label: 'iPad' },
        { value: 'Printer', label: 'Printer' },
        { value: 'Hot Spot', label: 'Hot Spot' },
        { value: 'Backdrop', label: 'Backdrop' },
        { value: 'Battery Pack', label: 'Battery Pack' },
        { value: 'Server', label: 'Server' },
        { value: 'Other', label: 'Other' }
      ],
      gridCols: 1
    },
    {
      name: 'model',
      type: 'text',
      label: 'Model',
      placeholder: 'e.g., Canon EOS R5',
      gridCols: 1
    },
    {
      name: 'serial_number',
      type: 'text',
      label: 'Serial Number',
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      options: [
        { value: 'available', label: 'Available' },
        { value: 'assigned_to_booth', label: 'Assigned to Booth' },
        { value: 'deployed', label: 'Deployed' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'retired', label: 'Retired' }
      ],
      gridCols: 1
    },
    {
      name: 'condition',
      type: 'select',
      label: 'Condition',
      required: true,
      options: [
        { value: 'excellent', label: 'Excellent' },
        { value: 'good', label: 'Good' },
        { value: 'fair', label: 'Fair' },
        { value: 'needs_repair', label: 'Needs Repair' }
      ],
      gridCols: 1
    },
    {
      name: 'location',
      type: 'text',
      label: 'Location',
      placeholder: 'Office, person name, etc.',
      gridCols: 1
    },
    {
      name: 'purchase_date',
      type: 'date',
      label: 'Purchase Date',
      gridCols: 1
    },
    {
      name: 'purchase_price',
      type: 'number',
      label: 'Purchase Price',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'image_url',
      type: 'text',
      label: 'Image URL',
      gridCols: 2
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      gridCols: 2
    }
  ],
  defaultValues: {
    status: 'available',
    condition: 'good'
  }
}


