import { AppLayout } from '@/components/layout/app-layout'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'

/**
 * Main Task Dashboard Page
 *
 * Shows unified view of tasks across all departments
 * Users can:
 * - View all their tasks
 * - Filter by department
 * - See team tasks (if supervisor/manager)
 * - Switch between departments with tabs
 */
export default function TasksDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <UnifiedTaskDashboard
          showDepartmentTabs
          title="Task Management"
          subtitle="Unified task tracking across all departments"
        />
      </div>
    </AppLayout>
  )
}
