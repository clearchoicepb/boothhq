'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'
import type { Invoice, NewInvoiceData } from '@/components/events/invoices/types'

const log = createLogger('accounts')

interface UseAccountInvoiceHandlersProps {
  accountId: string
  contactId?: string | null
  onRefresh: () => void
}

export function useAccountInvoiceHandlers({
  accountId,
  contactId,
  onRefresh
}: UseAccountInvoiceHandlersProps) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  // State
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [savingField, setSavingField] = useState<string | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState<Invoice | null>(null)
  const [linkCopiedInvoiceId, setLinkCopiedInvoiceId] = useState<string | null>(null)
  const [activatingInvoiceId, setActivatingInvoiceId] = useState<string | null>(null)

  const invalidateInvoiceQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['account-invoices', accountId] })
    await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    await queryClient.invalidateQueries({ queryKey: ['account-summary', accountId] })
  }

  const handleCreateInvoice = async (data: NewInvoiceData) => {
    try {
      setCreatingInvoice(true)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + parseInt(data.due_days))

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          contact_id: contactId || null,
          // No event_id for general invoices
          invoice_type: 'general',
          issue_date: data.issue_date,
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: 0,
          tax_rate: parseFloat(data.tax_rate),
          tax_amount: 0,
          total_amount: 0,
          balance_amount: 0,
          status: 'draft',
          purchase_order: data.purchase_order || null,
          notes: data.notes || null,
          terms: data.terms || null,
        })
      })
      if (!response.ok) throw new Error('Failed to create invoice')
      const invoice = await response.json()
      await invalidateInvoiceQueries()
      await onRefresh()
      setIsCreatingInvoice(false)
      setExpandedInvoiceId(invoice.id)
      toast.success('Invoice created successfully!')
    } catch (error) {
      log.error({ error }, 'Error creating invoice')
      toast.error('Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete invoice')
      if (expandedInvoiceId === invoiceId) setExpandedInvoiceId(null)
      await invalidateInvoiceQueries()
      await onRefresh()
      toast.success('Invoice deleted successfully!')
    } catch (error) {
      log.error({ error }, 'Error deleting invoice')
      toast.error('Failed to delete invoice')
    }
  }

  const handleUpdateInvoiceField = async (invoiceId: string, field: string, value: string) => {
    try {
      setSavingField(`${invoiceId}-${field}`)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (!response.ok) throw new Error(`Failed to update invoice ${field}`)
      await invalidateInvoiceQueries()
      await onRefresh()
      setEditingField(null)
    } catch (error) {
      log.error({ error }, `Error updating invoice ${field}`)
      toast.error(`Failed to update invoice ${field}`)
    } finally {
      setSavingField(null)
    }
  }

  const handleActivateInvoice = async (invoiceId: string) => {
    if (!confirm('Activate this invoice? It will be available for payment via the public link.')) return
    try {
      setActivatingInvoiceId(invoiceId)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_payments_received' })
      })
      if (!response.ok) throw new Error('Failed to activate invoice')
      await invalidateInvoiceQueries()
      await onRefresh()
      toast.success('Invoice activated successfully!')
    } catch (error) {
      log.error({ error }, 'Error activating invoice')
      toast.error('Failed to activate invoice')
    } finally {
      setActivatingInvoiceId(null)
    }
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      log.error({ error }, 'Error downloading PDF')
      toast.error('Failed to download PDF')
    }
  }

  const handleCopyPublicLink = async (invoice: Invoice) => {
    if (!invoice.public_token) { toast('Public link is not available for this invoice'); return }
    if (!session?.user?.tenantId) { toast('Tenant information is not available'); return }
    try {
      const publicUrl = `${window.location.origin}/invoices/public/${session.user.tenantId}/${invoice.public_token}`
      await navigator.clipboard.writeText(publicUrl)
      setLinkCopiedInvoiceId(invoice.id)
      setTimeout(() => setLinkCopiedInvoiceId(null), 2000)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      log.error({ error }, 'Error copying link')
      toast.error('Failed to copy link to clipboard')
    }
  }

  const handleAddPayment = async (payment: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, invoice_id: activeInvoiceForPayment?.id })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment')
      }
      setIsPaymentModalOpen(false)
      setActiveInvoiceForPayment(null)
      await invalidateInvoiceQueries()
      await onRefresh()
      toast.success('Payment added successfully!')
    } catch (error) {
      log.error({ error }, 'Error saving payment')
      toast(error instanceof Error ? error.message : 'Failed to save payment')
    }
  }

  const openPaymentModal = (invoice: Invoice) => {
    setActiveInvoiceForPayment(invoice)
    setIsPaymentModalOpen(true)
  }

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false)
    setActiveInvoiceForPayment(null)
  }

  return {
    // State
    expandedInvoiceId,
    setExpandedInvoiceId,
    isCreatingInvoice,
    setIsCreatingInvoice,
    creatingInvoice,
    editingField,
    setEditingField,
    savingField,
    isPaymentModalOpen,
    activeInvoiceForPayment,
    linkCopiedInvoiceId,
    activatingInvoiceId,
    // Handlers
    handleCreateInvoice,
    handleDeleteInvoice,
    handleUpdateInvoiceField,
    handleActivateInvoice,
    handleDownloadPDF,
    handleCopyPublicLink,
    handleAddPayment,
    openPaymentModal,
    closePaymentModal,
  }
}
