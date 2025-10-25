'use client'

import { useState } from 'react'
import { opportunitiesService, eventsService, contactsService, accountsService } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export default function TestServicesPage() {
  const [output, setOutput] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Test with React Query
  const { data: opportunitiesData, isLoading: oppsLoading } = useQuery({
    queryKey: ['opportunities-test'],
    queryFn: () => opportunitiesService.list({ limit: 5 }),
    enabled: false, // Don't auto-fetch
  })

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true)
    setError(null)
    setOutput(null)

    try {
      const result = await testFn()
      setOutput({ testName, success: true, data: result })
      console.log(`✅ ${testName} Success:`, result)
    } catch (err: any) {
      setError(err.message)
      setOutput({ testName, success: false, error: err.message })
      console.error(`❌ ${testName} Error:`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Service Layer Test Page</h1>
      <p className="text-gray-600 mb-8">
        Test all API services created on Day 1 of SOLID refactoring
      </p>

      {/* Opportunities Service Tests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">OpportunitiesService</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('List Opportunities', () => opportunitiesService.list({ limit: 5 }))}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            List (limit 5)
          </button>
          <button
            onClick={() => runTest('Get Stats', () => opportunitiesService.getStats())}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            Get Stats
          </button>
          <button
            onClick={() => runTest('Count by Stage (prospecting)', () => opportunitiesService.getCountByStage('prospecting'))}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            Count by Stage
          </button>
        </div>
      </div>

      {/* Events Service Tests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">EventsService</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('List Events', () => eventsService.list({ limit: 5 }))}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            List (limit 5)
          </button>
          <button
            onClick={() => runTest('Get Event Stats', () => eventsService.getStats())}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            Get Stats
          </button>
          <button
            onClick={() => runTest('Get Tasks Status', () => eventsService.getTasksStatus())}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            Tasks Status
          </button>
        </div>
      </div>

      {/* Contacts Service Tests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">ContactsService</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('List Contacts', () => contactsService.list({ limit: 5 }))}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            disabled={loading}
          >
            List (limit 5)
          </button>
          <button
            onClick={() => runTest('Search Contacts', () => contactsService.search('', { limit: 3 }))}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            disabled={loading}
          >
            Search (empty query)
          </button>
        </div>
      </div>

      {/* Accounts Service Tests */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">AccountsService</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('List Accounts', () => accountsService.list({ limit: 5 }))}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            disabled={loading}
          >
            List (limit 5)
          </button>
          <button
            onClick={() => runTest('Search Accounts', () => accountsService.search('', { limit: 3 }))}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            disabled={loading}
          >
            Search (empty query)
          </button>
        </div>
      </div>

      {/* Output Display */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Output</h2>

        {loading && (
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-gray-600">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {output && !loading && (
          <div className={`p-4 rounded ${output.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="font-semibold mb-2">
              {output.success ? '✅' : '❌'} {output.testName}
            </h3>
            <pre className="bg-white p-4 rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(output.data || output.error, null, 2)}
            </pre>
          </div>
        )}

        {!output && !loading && !error && (
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-gray-600">Click a button above to test a service</p>
          </div>
        )}
      </div>

      {/* Service Info */}
      <div className="mt-8 bg-blue-50 p-6 rounded">
        <h3 className="font-semibold mb-2">Service Layer Info</h3>
        <ul className="text-sm space-y-1">
          <li>✅ API Client with retry logic (3 attempts, exponential backoff)</li>
          <li>✅ React Query for caching and state management</li>
          <li>✅ TypeScript type safety</li>
          <li>✅ Centralized error handling</li>
          <li>✅ 4 services: Opportunities, Events, Contacts, Accounts</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600">
          Open browser console (F12) to see detailed logs for each request
        </p>
      </div>

      {/* React Query Devtools Info */}
      <div className="mt-4 bg-purple-50 p-6 rounded">
        <h3 className="font-semibold mb-2">React Query Devtools</h3>
        <p className="text-sm text-gray-600">
          Look for the React Query logo in the bottom-left corner of your screen.
          Click it to see all cached queries, loading states, and refetch behavior.
        </p>
      </div>
    </div>
  )
}
