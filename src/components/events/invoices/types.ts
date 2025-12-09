/**
 * Invoice types for the event invoices components
 */

export interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  subtotal: number
  tax_amount: number
  tax_rate: number
  due_date: string
  issue_date: string
  purchase_order: string | null
  notes: string | null
  terms: string | null
  paid_amount: number
  balance_amount: number
  public_token?: string | null
}

export interface NewInvoiceData {
  tax_rate: string
  due_days: string
  issue_date: string
  purchase_order: string
  notes: string
  terms: string
}
