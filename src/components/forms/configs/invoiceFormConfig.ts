import { FormConfig } from '../types'
import type { Invoice } from '@/lib/supabase-client'

export const invoiceFormConfig: FormConfig<Invoice> = {
  entity: 'invoices',
  fields: [
    {
      name: 'invoice_number',
      type: 'text',
      label: 'Invoice Number',
      required: true,
      gridCols: 1
    },
    {
      name: 'issue_date',
      type: 'date',
      label: 'Issue Date',
      required: true,
      gridCols: 1
    },
    {
      name: 'due_date',
      type: 'date',
      label: 'Due Date',
      required: true,
      gridCols: 1
    },
    {
      name: 'subtotal',
      type: 'number',
      label: 'Subtotal',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'tax_amount',
      type: 'number',
      label: 'Tax Amount',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'total_amount',
      type: 'number',
      label: 'Total Amount',
      validation: {
        min: 0
      },
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' },
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
      title: 'Invoice Details',
      fields: ['notes']
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
    status: 'draft',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0
  }
}

// Add additional fields to the config
invoiceFormConfig.fields.push(
  {
    name: 'notes',
    type: 'textarea',
    label: 'Notes',
    section: 'Invoice Details',
    gridCols: 2
  }
)
