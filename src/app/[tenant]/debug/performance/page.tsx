'use client'

/**
 * Performance Monitoring Dashboard
 *
 * Real-time system performance metrics including:
 * - Cache hit rates and efficiency
 * - Connection pool utilization
 * - Memory usage
 * - System health scores
 * - Performance recommendations
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AppLayout } from '@/components/layout/app-layout'
import { Activity, Database, TrendingUp, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('performance')

interface PerformanceData {
  timestamp: string
  health: {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    issues: string[]
    recommendations: string[]
  }
  performance: {
    scores: {
      caching: { score: number; grade: string; description: string }
      pooling: { score: number; grade: string; description: string }
      memory: { score: number; grade: string; description: string }
      overall: { score: number; grade: string; description: string }
    }
  }
  dataSourceManager: {
    cache: {
      config: { size: number }
      clients: { size: number }
      hits: { count: number }
      misses: { count: number }
      hitRate: { percent: number; formatted: string }
      efficiency: string
    }
    connectionPool: {
      active: number
      max: number
      utilization: { percent: number; formatted: string }
      available: number
      totalCreated: number
      exhaustedCount: number
      status: 'healthy' | 'warning' | 'critical'
    }
    configuration: any
  }
  system: {
    memory: any
    uptime: { formatted: string; since: string }
    node: any
    environment: string
  }
  metrics: {
    summary: any
    alerts: string[]
    recommendations: string[]
  }
}

export default function PerformanceDashboard() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds

  const fetchPerformanceData = async () => {
    try {
      setError(null)
      const response = await fetch('/api/debug/performance')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      log.error({ err }, 'Failed to fetch performance data')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPerformanceData()
    }
  }, [status])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPerformanceData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance metrics...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to view performance metrics.</p>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-red-900">Error Loading Metrics</h2>
            </div>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => fetchPerformanceData()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!data) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />
      case 'warning': return <AlertTriangle className="h-5 w-5" />
      case 'critical': return <AlertCircle className="h-5 w-5" />
      default: return <Activity className="h-5 w-5" />
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100'
      case 'B': return 'text-blue-600 bg-blue-100'
      case 'C': return 'text-yellow-600 bg-yellow-100'
      case 'D': return 'text-orange-600 bg-orange-100'
      case 'F': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Activity className="h-6 w-6 mr-2 text-blue-600" />
                Performance Monitoring
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time system metrics • Last updated: {new Date(data.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2 rounded border-gray-300"
                />
                Auto-refresh
              </label>
              <button
                onClick={() => fetchPerformanceData()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Health Status Banner */}
        <div className={`border rounded-lg p-6 mb-8 ${getStatusColor(data.health.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIcon(data.health.status)}
              <div className="ml-3">
                <h2 className="text-lg font-semibold">
                  System Status: {data.health.status.charAt(0).toUpperCase() + data.health.status.slice(1)}
                </h2>
                <p className="text-sm mt-1">
                  Health Score: {data.health.score}/100
                </p>
              </div>
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getGradeColor(data.performance.scores.overall.grade)}`}>
              {data.performance.scores.overall.grade}
            </div>
          </div>
        </div>

        {/* Performance Scores */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(data.performance.scores).map(([key, score]: [string, any]) => (
            <div key={key} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2 capitalize">{key}</h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{score.score}</div>
                  <div className="text-sm text-gray-500">{score.description}</div>
                </div>
                <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${getGradeColor(score.grade)}`}>
                  {score.grade}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cache Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Cache Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Hit Rate</div>
              <div className="text-2xl font-bold text-gray-900">{data.dataSourceManager.cache.hitRate.formatted}</div>
              <div className="text-sm text-gray-500 capitalize">{data.dataSourceManager.cache.efficiency}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Cache Hits</div>
              <div className="text-2xl font-bold text-green-600">{data.dataSourceManager.cache.hits.count}</div>
              <div className="text-sm text-gray-500">Served from cache</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Cache Misses</div>
              <div className="text-2xl font-bold text-orange-600">{data.dataSourceManager.cache.misses.count}</div>
              <div className="text-sm text-gray-500">Fetched from database</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Config Cache Size:</span>
                <span className="ml-2 font-medium">{data.dataSourceManager.cache.config.size}</span>
              </div>
              <div>
                <span className="text-gray-600">Client Cache Size:</span>
                <span className="ml-2 font-medium">{data.dataSourceManager.cache.clients.size}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Pool */}
        <div className={`border rounded-lg p-6 mb-8 ${getStatusColor(data.dataSourceManager.connectionPool.status)}`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Connection Pool
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm mb-1">Utilization</div>
              <div className="text-2xl font-bold">{data.dataSourceManager.connectionPool.utilization.formatted}</div>
              <div className="text-sm">{data.dataSourceManager.connectionPool.active}/{data.dataSourceManager.connectionPool.max} active</div>
            </div>
            <div>
              <div className="text-sm mb-1">Available</div>
              <div className="text-2xl font-bold text-green-600">{data.dataSourceManager.connectionPool.available}</div>
              <div className="text-sm">connections</div>
            </div>
            <div>
              <div className="text-sm mb-1">Total Created</div>
              <div className="text-2xl font-bold text-blue-600">{data.dataSourceManager.connectionPool.totalCreated}</div>
              <div className="text-sm">lifetime</div>
            </div>
            <div>
              <div className="text-sm mb-1">Exhausted Count</div>
              <div className="text-2xl font-bold text-red-600">{data.dataSourceManager.connectionPool.exhaustedCount}</div>
              <div className="text-sm">times</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Memory Usage</div>
              <div className="text-2xl font-bold text-gray-900">{data.system.memory.heapUsagePercent}%</div>
              <div className="text-sm text-gray-500">{data.system.memory.heapUsed.mb} MB / {data.system.memory.heapTotal.mb} MB</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Uptime</div>
              <div className="text-2xl font-bold text-gray-900">{data.system.uptime.formatted}</div>
              <div className="text-sm text-gray-500">Since {new Date(data.system.uptime.since).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Environment</div>
              <div className="text-2xl font-bold text-gray-900 capitalize">{data.system.environment}</div>
              <div className="text-sm text-gray-500">{data.system.node.version}</div>
            </div>
          </div>
        </div>

        {/* Alerts & Recommendations */}
        {(data.metrics.alerts.length > 0 || data.metrics.recommendations.length > 0) && (
          <div className="space-y-6">
            {/* Alerts */}
            {data.metrics.alerts.length > 0 && data.metrics.alerts[0] !== 'No issues detected' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Alerts
                </h2>
                <ul className="space-y-2">
                  {data.metrics.alerts.map((alert, i) => (
                    <li key={i} className="text-yellow-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {data.metrics.recommendations.length > 0 && data.metrics.recommendations[0] !== 'System performing optimally' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recommendations
                </h2>
                <ul className="space-y-2">
                  {data.metrics.recommendations.map((rec, i) => (
                    <li key={i} className="text-blue-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
