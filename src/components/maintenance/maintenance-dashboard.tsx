'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { maintenanceService } from '@/lib/api/services/maintenanceService'
import { MaintenanceItemCard } from './maintenance-item-card'
import { CompleteMaintenanceModal } from './complete-maintenance-modal'
import { Wrench, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('maintenance')

interface MaintenanceStats {
  total_due: number
  overdue: number
  upcoming: number
  completed_this_month: number
}

export function MaintenanceDashboard() {
  const [stats, setStats] = useState<MaintenanceStats | null>(null)
  const [dueItems, setDueItems] = useState<any[]>([])
  const [overdueItems, setOverdueItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsData, dueData, overdueData] = await Promise.all([
        maintenanceService.getStats(),
        maintenanceService.getItemsDue(),
        maintenanceService.getOverdueItems()
      ])
      setStats(statsData)
      setDueItems(dueData)
      setOverdueItems(overdueData)
    } catch (error) {
      log.error({ error }, 'Failed to load maintenance data')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = (item: any) => {
    setSelectedItem(item)
    setShowCompleteModal(true)
  }

  const handleCompleteSuccess = () => {
    setShowCompleteModal(false)
    setSelectedItem(null)
    loadData() // Reload data
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading maintenance data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Overdue"
          value={stats?.overdue || 0}
          icon={AlertTriangle}
          color="red"
          description="Needs immediate attention"
        />
        <StatCard
          title="Due Soon"
          value={stats?.total_due || 0}
          icon={Clock}
          color="yellow"
          description="Within next 7 days"
        />
        <StatCard
          title="Upcoming"
          value={stats?.upcoming || 0}
          icon={Wrench}
          color="blue"
          description="Scheduled maintenance"
        />
        <StatCard
          title="Completed"
          value={stats?.completed_this_month || 0}
          icon={CheckCircle}
          color="green"
          description="This month"
        />
      </div>

      {/* Overdue Items */}
      {overdueItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Overdue Maintenance ({overdueItems.length})
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overdueItems.map(item => (
              <MaintenanceItemCard
                key={item.id}
                item={item}
                status="overdue"
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Items */}
      {dueItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Due Soon ({dueItems.length})
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dueItems.map(item => (
              <MaintenanceItemCard
                key={item.id}
                item={item}
                status="due"
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {overdueItems.length === 0 && dueItems.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            No maintenance tasks due at this time. Great job keeping equipment maintained!
          </p>
        </div>
      )}

      {/* Complete Maintenance Modal */}
      {selectedItem && (
        <CompleteMaintenanceModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false)
            setSelectedItem(null)
          }}
          item={selectedItem}
          onSuccess={handleCompleteSuccess}
        />
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'red' | 'yellow' | 'blue' | 'green'
  description: string
}

function StatCard({ title, value, icon: Icon, color, description }: StatCardProps) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200'
  }

  const iconClasses = {
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    green: 'text-green-600'
  }

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <Icon className={`h-5 w-5 ${iconClasses[color]}`} />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs opacity-75">{description}</div>
    </div>
  )
}
