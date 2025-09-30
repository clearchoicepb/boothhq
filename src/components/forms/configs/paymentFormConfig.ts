import { FormConfig } from '../types'

export const paymentFormConfig: FormConfig<any> = {
  entity: 'payments',
  fields: [
    {
      name: 'invoice_id',
      type: 'select',
      label: 'Invoice',
      required: true,
      options: 'invoices',
      gridCols: 1
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Payment Amount',
      required: true,
      validation: {
        min: 0.01
      },
      gridCols: 1
    },
    {
      name: 'payment_date',
      type: 'date',
      label: 'Payment Date',
      required: true,
      gridCols: 1
    },
    {
      name: 'payment_method',
      type: 'select',
      label: 'Payment Method',
      required: true,
      options: [
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'check', label: 'Check' },
        { value: 'cash', label: 'Cash' },
        { value: 'paypal', label: 'PayPal' },
        { value: 'stripe', label: 'Stripe' },
        { value: 'other', label: 'Other' }
      ],
      gridCols: 1
    },
    {
      name: 'transaction_id',
      type: 'text',
      label: 'Transaction ID',
      gridCols: 1
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      gridCols: 1
    },
    {
      name: 'reference_number',
      type: 'text',
      label: 'Reference Number',
      gridCols: 1
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      gridCols: 2
    }
  ],
  relatedData: [
    {
      key: 'invoices',
      endpoint: '/api/invoices',
      displayField: 'invoice_number',
      valueField: 'id',
      displayFormat: 'invoice_number - $total_amount'
    }
  ],
  defaultValues: {
    payment_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    payment_method: 'credit_card'
  }
}


