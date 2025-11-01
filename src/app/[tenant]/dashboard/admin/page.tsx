import { AppLayout } from '@/components/layout/app-layout'
import { UnifiedTaskDashboard } from '@/components/dashboards/unified-task-dashboard'

/**
 * Administration Dashboard Page
 *
 * Focused view for admin team tasks:
 * - User onboarding
 * - System maintenance
 * - Data backups
 * - Configuration updates
 */
export default function AdminDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <UnifiedTaskDashboard
          departmentId="admin"
          title="Administration Dashboard"
          subtitle="System management, settings, and administrative tasks"
        />
      </div>
    </AppLayout>
  )
}
