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
      options: [
        { value: 'prospecting', label: 'Prospecting' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'negotiation', label: 'Negotiation' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ],
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
      name: 'event_date',
      type: 'date',
      label: 'Event Date',
      gridCols: 1
    }
  ],
  sections: [
    {
      title: 'Opportunity Details',
      fields: ['description']
    },
    {
      title: 'Event Information',
      fields: [
        'date_type',
        'initial_date',
        'final_date'
      ]
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
    name: 'date_type',
    type: 'select',
    label: 'Date Type',
    options: [
      { value: 'single', label: 'Single Date' },
      { value: 'range', label: 'Date Range' }
    ],
    section: 'Event Information'
  },
  {
    name: 'initial_date',
    type: 'date',
    label: 'Initial Date',
    section: 'Event Information'
  },
  {
    name: 'final_date',
    type: 'date',
    label: 'Final Date',
    section: 'Event Information'
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
