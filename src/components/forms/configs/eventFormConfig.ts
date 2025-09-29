import { FormConfig } from '../types'
import type { Event } from '@/lib/supabase-client'

export const eventFormConfig: FormConfig<Event> = {
  entity: 'events',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Event Title',
      required: true,
      gridCols: 2
    },
    {
      name: 'event_type',
      type: 'select',
      label: 'Event Type',
      required: true,
      options: [
        { value: 'wedding', label: 'Wedding' },
        { value: 'corporate', label: 'Corporate Event' },
        { value: 'birthday', label: 'Birthday Party' },
        { value: 'anniversary', label: 'Anniversary' },
        { value: 'graduation', label: 'Graduation' },
        { value: 'holiday', label: 'Holiday Party' },
        { value: 'other', label: 'Other' }
      ],
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
    },
    {
      name: 'start_date',
      type: 'datetime',
      label: 'Start Date & Time',
      required: true,
      gridCols: 1
    },
    {
      name: 'end_date',
      type: 'datetime',
      label: 'End Date & Time',
      gridCols: 1
    },
    {
      name: 'location',
      type: 'text',
      label: 'Location',
      gridCols: 2
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
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
      name: 'opportunity_id',
      type: 'select',
      label: 'Opportunity',
      options: 'opportunities',
      gridCols: 1
    }
  ],
  sections: [
    {
      title: 'Event Details',
      fields: ['description']
    },
    {
      title: 'Mailing Information',
      fields: [
        'mailing_address_line1',
        'mailing_address_line2',
        'mailing_city',
        'mailing_state',
        'mailing_postal_code',
        'mailing_country'
      ]
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
      key: 'opportunities',
      endpoint: '/api/opportunities',
      displayField: 'name',
      valueField: 'id'
    }
  ],
  defaultValues: {
    status: 'scheduled',
    event_type: 'other',
    tenant_id: ''
  }
}

// Add additional fields to the config
eventFormConfig.fields.push(
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    section: 'Event Details',
    gridCols: 2
  },
  {
    name: 'mailing_address_line1',
    type: 'text',
    label: 'Mailing Address Line 1',
    section: 'Mailing Information'
  },
  {
    name: 'mailing_address_line2',
    type: 'text',
    label: 'Mailing Address Line 2',
    section: 'Mailing Information'
  },
  {
    name: 'mailing_city',
    type: 'text',
    label: 'Mailing City',
    section: 'Mailing Information'
  },
  {
    name: 'mailing_state',
    type: 'text',
    label: 'Mailing State',
    section: 'Mailing Information'
  },
  {
    name: 'mailing_postal_code',
    type: 'text',
    label: 'Mailing Postal Code',
    section: 'Mailing Information'
  },
  {
    name: 'mailing_country',
    type: 'text',
    label: 'Mailing Country',
    section: 'Mailing Information'
  }
)
