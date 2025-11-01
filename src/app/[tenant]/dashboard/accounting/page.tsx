import { AppLayout } from '@/components/layout/app-layout'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'

/**
 * Accounting Dashboard Page
 *
 * Focused view for accounting team tasks:
 * - Invoices to send
 * - Payments overdue
 * - Reconciliations needed
 * - Refunds to process
 */
export default function AccountingDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <UnifiedTaskDashboard
          departmentId="accounting"
          title="Accounting Dashboard"
          subtitle="Invoicing, payments, collections, and financial reconciliation"
        />
      </div>
    </AppLayout>
  )
}
