import { FormConfig } from '../types'
import type { Opportunity } from '@/lib/supabase-client'

export const opportunityFormConfig: FormConfig<Opportunity> = {
  entity: 'opportunities',
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Opportunity Name',
      required: true,
      gridCols: 2
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Amount',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'probability',
      type: 'number',
      label: 'Probability (%)',
      validation: {
        min: 0,
        max: 100
      },
      gridCols: 1
    },
    {
      name: 'stage',
      type: 'select',
      label: 'Stage',
      required: true,
      options: 'opportunity_stages', // Fetch from tenant's opportunity settings
      gridCols: 1
    },
    {
      name: 'expected_close_date',
      type: 'date',
      label: 'Expected Close Date',
      gridCols: 1
    },
    {
      name: 'actual_close_date',
      type: 'date',
      label: 'Actual Close Date',
      gridCols: 1
    },
    {
      name: 'account_id',
      type: 'select',
      label: 'Account',
      options: 'accounts',
      gridCols: 1
    },
    {
      name: 'contact_id',
      type: 'select',
      label: 'Contact',
      options: 'contacts',
      gridCols: 1
    },
    {
      name: 'event_type',
      type: 'select',
      label: 'Event Type',
      options: 'event_types', // Fetch from tenant's event_types table
      gridCols: 1
    },
    {
      name: 'date_type',
      type: 'select',
      label: 'Event Duration',
      options: [
        { value: 'single_day', label: 'Single Day' },
        { value: 'same_location_sequential', label: 'Same Location - Sequential Dates' },
        { value: 'same_location_non_sequential', label: 'Series of Events - Same Location' },
        { value: 'multiple_locations', label: 'Multiple Events - Multiple Locations' }
      ],
      gridCols: 2
    }
  ],
  sections: [
    {
      title: 'Opportunity Details',
      fields: ['description']
    },
    {
      title: 'Event Information',
      fields: ['event_date', 'initial_date', 'final_date']
    }
  ],
  relatedData: [
    {
      key: 'accounts',
      endpoint: '/api/accounts',
      displayField: 'name',
      valueField: 'id'
    },
    {
      key: 'contacts',
      endpoint: '/api/contacts',
      displayField: 'name',
      valueField: 'id'
    },
    {
      key: 'event_types',
      endpoint: '/api/event-types',
      displayField: 'name',
      valueField: 'slug' // Use slug (e.g. 'wedding', 'corporate') for compatibility with opportunity conversion
    },
    {
      key: 'opportunity_stages',
      endpoint: '/api/settings/opportunity-stages',
      displayField: 'name',
      valueField: 'id' // Stage ID (e.g. 'prospecting', 'qualification', or custom stage IDs)
    }
  ],
  defaultValues: {
    stage: 'prospecting',
    tenant_id: ''
  }
}

// Add additional fields to the config
opportunityFormConfig.fields.push(
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    section: 'Opportunity Details',
    gridCols: 2
  },
  {
    name: 'event_date',
    type: 'date',
    label: 'Event Date',
    section: 'Event Information',
    gridCols: 1
  },
  {
    name: 'initial_date',
    type: 'date',
    label: 'Start Date',
    section: 'Event Information',
    gridCols: 1
  },
  {
    name: 'final_date',
    type: 'date',
    label: 'End Date',
    section: 'Event Information',
    gridCols: 1
  }
)
