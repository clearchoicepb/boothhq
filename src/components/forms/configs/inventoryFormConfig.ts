import { FormConfig } from '../types'

export const inventoryFormConfig: FormConfig<any> = {
  entity: 'inventory',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Item Name',
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
      name: 'category',
      type: 'select',
      label: 'Category',
      options: [
        { value: 'audio', label: 'Audio Equipment' },
        { value: 'lighting', label: 'Lighting' },
        { value: 'video', label: 'Video Equipment' },
        { value: 'furniture', label: 'Furniture' },
        { value: 'decorations', label: 'Decorations' },
        { value: 'catering', label: 'Catering Equipment' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'other', label: 'Other' }
      ],
      gridCols: 1
    },
    {
      name: 'sku',
      type: 'text',
      label: 'SKU',
      gridCols: 1
    },
    {
      name: 'quantity_available',
      type: 'number',
      label: 'Quantity Available',
      required: true,
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'quantity_total',
      type: 'number',
      label: 'Total Quantity',
      required: true,
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'unit_cost',
      type: 'number',
      label: 'Unit Cost',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'rental_rate_daily',
      type: 'number',
      label: 'Daily Rental Rate',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'rental_rate_weekly',
      type: 'number',
      label: 'Weekly Rental Rate',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'condition',
      type: 'select',
      label: 'Condition',
      options: [
        { value: 'excellent', label: 'Excellent' },
        { value: 'good', label: 'Good' },
        { value: 'fair', label: 'Fair' },
        { value: 'poor', label: 'Poor' },
        { value: 'needs_repair', label: 'Needs Repair' }
      ],
      gridCols: 1
    },
    {
      name: 'location',
      type: 'text',
      label: 'Storage Location',
      gridCols: 1
    },
    {
      name: 'supplier',
      type: 'text',
      label: 'Supplier',
      gridCols: 1
    },
    {
      name: 'purchase_date',
      type: 'date',
      label: 'Purchase Date',
      gridCols: 1
    },
    {
      name: 'warranty_expiry',
      type: 'date',
      label: 'Warranty Expiry',
      gridCols: 1
    },
    {
      name: 'is_active',
      type: 'checkbox',
      label: 'Active',
      gridCols: 1
    },
    // Maintenance Information
    {
      name: 'last_maintenance_date',
      type: 'date',
      label: 'Last Maintenance Date',
      section: 'Maintenance Information',
      gridCols: 1
    },
    {
      name: 'maintenance_notes',
      type: 'textarea',
      label: 'Maintenance Notes',
      section: 'Maintenance Information',
      gridCols: 2
    }
  ],
  sections: [
    {
      title: 'Maintenance Information',
      fields: ['last_maintenance_date', 'maintenance_notes']
    }
  ],
  defaultValues: {
    condition: 'good',
    is_active: true,
    quantity_available: 0,
    quantity_total: 0
  }
}





