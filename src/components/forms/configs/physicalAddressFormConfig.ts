import { FormConfig } from '../types'

export const physicalAddressFormConfig: FormConfig<any> = {
  entity: 'physical_address',
  fields: [
    {
      name: 'location_name',
      type: 'text',
      label: 'Location Name',
      placeholder: 'e.g., Main Warehouse, North Office',
      required: true,
      gridCols: 2
    },
    {
      name: 'street_address',
      type: 'text',
      label: 'Street Address',
      placeholder: '123 Main Street',
      required: true,
      gridCols: 2
    },
    {
      name: 'city',
      type: 'text',
      label: 'City',
      placeholder: 'New York',
      required: true,
      gridCols: 1
    },
    {
      name: 'state_province',
      type: 'text',
      label: 'State/Province',
      placeholder: 'NY',
      required: true,
      gridCols: 1
    },
    {
      name: 'zip_postal_code',
      type: 'text',
      label: 'Zip/Postal Code',
      placeholder: '10001',
      required: true,
      gridCols: 1
    },
    {
      name: 'country',
      type: 'text',
      label: 'Country',
      placeholder: 'United States',
      required: true,
      gridCols: 1
    },
    {
      name: 'location_notes',
      type: 'textarea',
      label: 'Location Notes',
      placeholder: 'Optional notes about this location...',
      gridCols: 2
    }
  ],
  defaultValues: {
    country: 'United States'
  }
}
