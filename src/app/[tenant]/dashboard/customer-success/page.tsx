import { AppLayout } from '@/components/layout/app-layout'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'

/**
 * Customer Success Dashboard Page
 *
 * Focused view for customer success team tasks:
 * - Thank you emails to send
 * - Feedback requests pending
 * - Complaints to handle
 * - Check-in calls due
 */
export default function CustomerSuccessDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <UnifiedTaskDashboard
          departmentId="customer_success"
          title="Customer Success Dashboard"
          subtitle="Client communication, satisfaction, and relationship management"
        />
      </div>
    </AppLayout>
  )
}
