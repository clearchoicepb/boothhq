import { AppLayout } from '@/components/layout/app-layout'
import { MyTasksDashboard } from '@/components/dashboards/my-tasks-dashboard'

export default function MyTasksDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <MyTasksDashboard />
      </div>
    </AppLayout>
  )
}

