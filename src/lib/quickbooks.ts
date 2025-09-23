import { createServerSupabaseClient } from './supabase'

export interface QuickBooksInvoice {
  id?: string
  invoice_number: string
  customer_id: string
  invoice_date: string
  due_date: string
  total_amount: number
  balance: number
  status: string
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    amount: number
  }>
}

export interface QuickBooksCustomer {
  id?: string
  name: string
  email?: string
  phone?: string
  billing_address?: {
    line1: string
    city: string
    state: string
    postal_code: string
    country: string
  }
}

export class QuickBooksService {
  private accessToken: string
  private companyId: string
  private baseUrl: string

  constructor(accessToken: string, companyId: string, sandbox: boolean = false) {
    this.accessToken = accessToken
    this.companyId = companyId
    this.baseUrl = sandbox 
      ? 'https://sandbox-quickbooks.api.intuit.com' 
      : 'https://quickbooks.api.intuit.com'
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.baseUrl}/v3/company/${this.companyId}/${endpoint}`
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('QuickBooks API request failed:', error)
      throw error
    }
  }

  async createCustomer(customer: QuickBooksCustomer): Promise<QuickBooksCustomer> {
    const qbCustomer = {
      Name: customer.name,
      PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
      PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
      BillAddr: customer.billing_address ? {
        Line1: customer.billing_address.line1,
        City: customer.billing_address.city,
        CountrySubDivisionCode: customer.billing_address.state,
        PostalCode: customer.billing_address.postal_code,
        Country: customer.billing_address.country,
      } : undefined,
    }

    const response = await this.makeRequest('customers', 'POST', { Customer: qbCustomer })
    return {
      id: response.QueryResponse.Customer[0].Id,
      name: response.QueryResponse.Customer[0].Name,
      email: response.QueryResponse.Customer[0].PrimaryEmailAddr?.Address,
      phone: response.QueryResponse.Customer[0].PrimaryPhone?.FreeFormNumber,
    }
  }

  async findCustomerByName(name: string): Promise<QuickBooksCustomer | null> {
    try {
      const response = await this.makeRequest(`customers?query=Name='${encodeURIComponent(name)}'`)
      
      if (response.QueryResponse.Customer && response.QueryResponse.Customer.length > 0) {
        const customer = response.QueryResponse.Customer[0]
        return {
          id: customer.Id,
          name: customer.Name,
          email: customer.PrimaryEmailAddr?.Address,
          phone: customer.PrimaryPhone?.FreeFormNumber,
        }
      }
      
      return null
    } catch (error) {
      console.error('Error finding customer:', error)
      return null
    }
  }

  async createInvoice(invoice: QuickBooksInvoice): Promise<QuickBooksInvoice> {
    const qbInvoice = {
      DocNumber: invoice.invoice_number,
      TxnDate: invoice.invoice_date,
      DueDate: invoice.due_date,
      CustomerRef: { value: invoice.customer_id },
      Line: invoice.line_items.map(item => ({
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount,
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.unit_price,
          ItemRef: { value: '1' }, // Default item - you may want to create specific items
        },
      })),
    }

    const response = await this.makeRequest('invoices', 'POST', { Invoice: qbInvoice })
    const createdInvoice = response.QueryResponse.Invoice[0]
    
    return {
      id: createdInvoice.Id,
      invoice_number: createdInvoice.DocNumber,
      customer_id: createdInvoice.CustomerRef.value,
      invoice_date: createdInvoice.TxnDate,
      due_date: createdInvoice.DueDate,
      total_amount: createdInvoice.TotalAmt,
      balance: createdInvoice.Balance,
      status: createdInvoice.Balance > 0 ? 'open' : 'paid',
      line_items: invoice.line_items,
    }
  }

  async syncInvoiceToQuickBooks(invoiceId: string, tenantId: string): Promise<{ success: boolean; quickbooksId?: string; error?: string }> {
    try {
      const supabase = createServerSupabaseClient()
      
      // Get invoice data
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          accounts!invoices_account_id_fkey(name, email, phone, billing_address),
          invoice_line_items(*)
        `)
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .single()

      if (invoiceError || !invoice) {
        return { success: false, error: 'Invoice not found' }
      }

      // Find or create customer in QuickBooks
      let customer = await this.findCustomerByName(invoice.accounts.name)
      
      if (!customer) {
        const billingAddress = invoice.accounts.billing_address
        customer = await this.createCustomer({
          name: invoice.accounts.name,
          email: invoice.accounts.email,
          phone: invoice.accounts.phone,
          billing_address: billingAddress ? {
            line1: billingAddress.street || '',
            city: billingAddress.city || '',
            state: billingAddress.state || '',
            postal_code: billingAddress.postal_code || '',
            country: billingAddress.country || 'US',
          } : undefined,
        })
      }

      // Create invoice in QuickBooks
      const qbInvoice = await this.createInvoice({
        invoice_number: invoice.invoice_number,
        customer_id: customer.id!,
        invoice_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        balance: invoice.balance_amount,
        status: invoice.status,
        line_items: invoice.invoice_line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.total_price,
        })),
      })

      // Update invoice with QuickBooks ID
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ quickbooks_id: qbInvoice.id })
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        console.error('Error updating invoice with QuickBooks ID:', updateError)
      }

      return { success: true, quickbooksId: qbInvoice.id }
    } catch (error) {
      console.error('Error syncing invoice to QuickBooks:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Helper function to get QuickBooks service instance
export const getQuickBooksService = async (tenantId: string): Promise<QuickBooksService | null> => {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get QuickBooks credentials for the tenant
    const { data: settings, error } = await supabase
      .from('settings')
      .select('quickbooks_access_token, quickbooks_company_id, quickbooks_sandbox')
      .eq('tenant_id', tenantId)
      .single()

    if (error || !settings?.quickbooks_access_token || !settings?.quickbooks_company_id) {
      console.log('QuickBooks not configured for tenant:', tenantId)
      return null
    }

    return new QuickBooksService(
      settings.quickbooks_access_token,
      settings.quickbooks_company_id,
      settings.quickbooks_sandbox || false
    )
  } catch (error) {
    console.error('Error getting QuickBooks service:', error)
    return null
  }
}
