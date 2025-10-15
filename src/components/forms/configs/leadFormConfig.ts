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
      name: 'source',
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
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      gridCols: 2
    }
  ],
  sections: [],
  relatedData: [],
  defaultValues: {
    status: 'new',
    source: 'website'
  }
}










