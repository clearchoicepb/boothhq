import { FormConfig } from '../types'

export const inventoryItemFormConfig: FormConfig<any> = {
  entity: 'inventory_item',
  fields: [
    {
      name: 'item_name',
      type: 'text',
      label: 'Item Name',
      placeholder: 'e.g., Canon Camera EOS R5, USB Cable',
      required: true,
      gridCols: 2
    },
    {
      name: 'item_category',
      type: 'select',
      label: 'Item Category',
      required: true,
      options: 'categories', // Will be populated from item_categories table
      gridCols: 1
    },
    {
      name: 'model',
      type: 'text',
      label: 'Model',
      placeholder: 'e.g., T6, DS620, 10.5", Small',
      required: false,
      gridCols: 1
    },
    {
      name: 'tracking_type',
      type: 'select',
      label: 'Tracking Type',
      required: true,
      options: [
        { value: 'serial_number', label: 'Serial Number (Unique Item)' },
        { value: 'total_quantity', label: 'Total Quantity (Bulk Items)' }
      ],
      gridCols: 1
    },
    {
      name: 'serial_number',
      type: 'text',
      label: 'Serial Number',
      placeholder: 'Manufacturers serial number',
      gridCols: 1,
      conditional: {
        field: 'tracking_type',
        operator: 'equals',
        value: 'serial_number'
      }
    },
    {
      name: 'total_quantity',
      type: 'number',
      label: 'Total Quantity',
      placeholder: 'Total count of this item type',
      gridCols: 1,
      validation: {
        min: 1
      },
      conditional: {
        field: 'tracking_type',
        operator: 'equals',
        value: 'total_quantity'
      }
    },
    {
      name: 'purchase_date',
      type: 'date',
      label: 'Purchase Date',
      required: true,
      gridCols: 1
    },
    {
      name: 'item_value',
      type: 'number',
      label: 'Item Value ($)',
      placeholder: 'Purchase or replacement value',
      required: true,
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'product_group_id',
      type: 'select',
      label: 'Product Group (Optional)',
      options: 'product_groups', // Will be populated from product_groups table
      placeholder: 'Add to a product group...',
      required: false,
      gridCols: 2,
      helpText: 'Items in a group automatically inherit the group\'s location'
    },
    {
      name: 'assigned_to_type',
      type: 'select',
      label: 'Direct Assignment',
      options: [
        { value: '', label: 'Not Assigned' },
        { value: 'user', label: 'User' },
        { value: 'physical_address', label: 'Physical Address' }
      ],
      gridCols: 1,
      helpText: 'Leave blank if item is in a product group'
    },
    {
      name: 'assigned_to_id',
      type: 'select',
      label: 'Assigned To',
      options: 'dynamic', // Will be populated dynamically based on assigned_to_type
      gridCols: 1,
      conditional: {
        field: 'assigned_to_type',
        operator: 'not_equals',
        value: ''
      }
    },
    {
      name: 'assignment_type',
      type: 'select',
      label: 'Assignment Type',
      options: [
        { value: '', label: 'Not Specified' },
        { value: 'warehouse', label: 'Warehouse Storage' },
        { value: 'long_term_staff', label: 'Long-term Staff (Months)' },
        { value: 'event_checkout', label: 'Event Checkout (Weekend)' }
      ],
      gridCols: 1,
      conditional: {
        field: 'assigned_to_type',
        operator: 'not_equals',
        value: ''
      }
    },
    {
      name: 'expected_return_date',
      type: 'date',
      label: 'Expected Return Date',
      placeholder: 'When should this item be returned?',
      gridCols: 1,
      conditional: {
        field: 'assignment_type',
        operator: 'equals',
        value: 'event_checkout'
      }
    },
    {
      name: 'item_notes',
      type: 'textarea',
      label: 'Item Notes',
      placeholder: 'Optional notes about this item...',
      gridCols: 2
    }
  ],
  relatedData: [
    {
      key: 'categories',
      endpoint: '/api/item-categories',
      displayField: 'category_name',
      valueField: 'category_name'
    },
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
    },
    {
      key: 'product_groups',
      endpoint: '/api/product-groups',
      displayField: 'group_name',
      valueField: 'id'
    }
  ],
  defaultValues: {
    tracking_type: 'serial_number',
    assigned_to_type: ''
  }
}
