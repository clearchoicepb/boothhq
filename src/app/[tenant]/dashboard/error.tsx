'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const log = createLogger('error-boundary')

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    log.error({
      module: 'dashboard',
      errorDigest: error.digest,
      errorName: error.name,
    }, 'Dashboard page error caught by boundary')
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Unable to Load Dashboard
        </h2>

        <p className="text-gray-600 mb-6">
          We had trouble loading your dashboard. This is usually temporary.
          Please try again or refresh the page.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>

          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}
