import { AppLayout } from '@/components/layout/app-layout'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'

/**
 * Operations Dashboard Page
 *
 * Focused view for operations team tasks:
 * - Events this week
 * - Equipment checks needed
 * - Staff assignments missing
 * - Logistics planning
 */
export default function OperationsDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <UnifiedTaskDashboard
          departmentId="operations"
          title="Operations Dashboard"
          subtitle="Event execution, logistics, and equipment management"
        />
      </div>
    </AppLayout>
  )
}
