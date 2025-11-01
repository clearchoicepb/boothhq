import { AppLayout } from '@/components/layout/app-layout'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'

/**
 * Sales Dashboard Page
 *
 * Focused view for sales team tasks:
 * - Follow-ups needed
 * - Quotes to send
 * - Calls to schedule
 * - Contract reviews
 */
export default function SalesDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <UnifiedTaskDashboard
          departmentId="sales"
          title="Sales Dashboard"
          subtitle="Lead generation, opportunities, and deal closing"
        />
      </div>
    </AppLayout>
  )
}
