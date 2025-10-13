import { AppLayout } from '@/components/layout/app-layout'
import { DesignDashboard } from '@/components/dashboards/design-dashboard'

export default function DesignDashboardPage() {
  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <DesignDashboard />
      </div>
    </AppLayout>
  )
}
