/**
 * Invoice types for the event invoices components
 */

export type InvoiceType = 'event' | 'general'

export interface Invoice {
  id: string
  invoice_number: string
  invoice_type: InvoiceType
  status: string
  total_amount: number
  subtotal: number
  tax_amount: number
  tax_rate: number
  due_date: string
  issue_date: string
  purchase_order: string | null
  care_of: string | null
  notes: string | null
  terms: string | null
  paid_amount: number
  balance_amount: number
  public_token?: string | null
  event_id?: string | null
  event?: {
    id: string
    title: string
  } | null
  account_id?: string | null
  account?: {
    id: string
    name: string
  } | null
}

export interface NewInvoiceData {
  tax_rate: string
  due_days: string
  issue_date: string
  purchase_order: string
  notes: string
  terms: string
}
