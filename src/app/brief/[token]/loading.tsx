import { Loader2 } from 'lucide-react'

export default function StaffBriefLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#347dc4] mx-auto" />
        <p className="mt-2 text-sm text-gray-500">Loading event brief...</p>
      </div>
    </div>
  )
}
