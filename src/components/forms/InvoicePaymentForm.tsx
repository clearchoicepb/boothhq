'use client'

import React from 'react'
import { BaseForm } from './BaseForm'
import { paymentFormConfig } from './configs/paymentFormConfig'
import { BaseFormProps, FormConfig } from './types'

interface InvoicePaymentFormProps extends Omit<BaseFormProps<any>, 'config'> {
  invoiceId: string
  invoiceNumber?: string
  totalAmount?: number
  remainingBalance?: number
}

/**
 * Specialized form component for adding payments to a specific invoice.
 * This component removes the invoice selection field since the invoice is already known.
 * Follows SOLID principles by extending functionality without modifying base components.
 */
export function InvoicePaymentForm({
  invoiceId,
  invoiceNumber,
  totalAmount,
  remainingBalance,
  ...props
}: InvoicePaymentFormProps) {
  // Create a modified config that excludes the invoice_id field
  // since it's already known from the context
  const invoicePaymentConfig: FormConfig<any> = {
    ...paymentFormConfig,
    fields: paymentFormConfig.fields.filter(field => field.name !== 'invoice_id'),
    defaultValues: {
      ...paymentFormConfig.defaultValues,
      invoice_id: invoiceId,
      payment_date: new Date().toISOString().split('T')[0],
      status: 'completed',
      amount: remainingBalance || totalAmount || undefined
    }
  }

  return (
    <BaseForm
      config={invoicePaymentConfig}
      title={invoiceNumber ? `Add Payment - Invoice ${invoiceNumber}` : 'Add Payment'}
      submitLabel="Record Payment"
      {...props}
    />
  )
}
