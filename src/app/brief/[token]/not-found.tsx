import { AlertCircle } from 'lucide-react'

export default function StaffBriefNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Event Brief Not Found
        </h1>
        <p className="text-gray-600">
          This event brief may have been removed or the link is invalid.
          Please contact your manager for assistance.
        </p>
      </div>
    </div>
  )
}
