import { FormConfig } from '../types'

export const leadFormConfig: FormConfig<any> = {
  entity: 'leads',
  fields: [
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
      name: 'company',
      type: 'text',
      label: 'Company',
      gridCols: 1
    },
    {
      name: 'job_title',
      type: 'text',
      label: 'Job Title',
      gridCols: 1
    },
    {
      name: 'lead_source',
      type: 'select',
      label: 'Lead Source',
      options: [
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'Referral' },
        { value: 'cold_call', label: 'Cold Call' },
        { value: 'email_campaign', label: 'Email Campaign' },
        { value: 'social_media', label: 'Social Media' },
        { value: 'trade_show', label: 'Trade Show' },
        { value: 'advertising', label: 'Advertising' },
        { value: 'other', label: 'Other' }
      ],
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'negotiation', label: 'Negotiation' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ],
      gridCols: 1
    },
    {
      name: 'priority',
      type: 'select',
      label: 'Priority',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ],
      gridCols: 1
    },
    {
      name: 'estimated_value',
      type: 'number',
      label: 'Estimated Value',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'assigned_to',
      type: 'select',
      label: 'Assigned To',
      options: 'users',
      gridCols: 1
    },
    // Address Information
    {
      name: 'address_line_1',
      type: 'text',
      label: 'Address Line 1',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'address_line_2',
      type: 'text',
      label: 'Address Line 2',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'city',
      type: 'text',
      label: 'City',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'state',
      type: 'text',
      label: 'State',
      section: 'Address Information',
      gridCols: 1
    },
    {
      name: 'zip_code',
      type: 'text',
      label: 'Zip Code',
      section: 'Address Information',
      gridCols: 1
    },
    // Additional Information
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      section: 'Additional Information',
      gridCols: 2
    }
  ],
  sections: [
    {
      title: 'Address Information',
      fields: [
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'zip_code'
      ]
    },
    {
      title: 'Additional Information',
      fields: ['notes']
    }
  ],
  relatedData: [
    {
      key: 'users',
      endpoint: '/api/users',
      displayField: 'first_name',
      valueField: 'id',
      displayFormat: 'first_name last_name'
    }
  ],
  defaultValues: {
    status: 'new',
    priority: 'medium',
    lead_source: 'website'
  }
}





