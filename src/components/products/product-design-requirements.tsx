'use client'

import { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'

interface DesignType {
  id: string
  name: string
  type: 'digital' | 'physical'
  description: string
}

interface ProductDesignRequirementsProps {
  requiresDesign: boolean
  designItemTypeId: string | null
  designLeadTimeOverride: number | null
  onChange: (updates: {
    requires_design?: boolean
    design_item_type_id?: string | null
    design_lead_time_override?: number | null
  }) => void
}

export function ProductDesignRequirements({
  requiresDesign,
  designItemTypeId,
  designLeadTimeOverride,
  onChange
}: ProductDesignRequirementsProps) {
  const [designTypes, setDesignTypes] = useState<DesignType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDesignTypes = async () => {
      try {
        const res = await fetch('/api/design/types')
        const data = await res.json()
        setDesignTypes(data.types || [])
      } catch (error) {
        console.error('Error fetching design types:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDesignTypes()
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Palette className="h-5 w-5 mr-2 text-purple-600" />
        Design Requirements
      </h3>

      <div className="space-y-4">
        {/* Requires Design Toggle */}
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={requiresDesign}
              onChange={(e) => onChange({
                requires_design: e.target.checked,
                design_item_type_id: e.target.checked ? designItemTypeId : null
              })}
              className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4] mr-3"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">This product requires design work</span>
              <p className="text-xs text-gray-500">Design items will be automatically added when this product is added to an event</p>
            </div>
          </label>
        </div>

        {/* Design Type Selection */}
        {requiresDesign && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design Item Type *
              </label>
              {loading ? (
                <div className="text-sm text-gray-500">Loading design types...</div>
              ) : (
                <select
                  value={designItemTypeId || ''}
                  onChange={(e) => onChange({ design_item_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                  required={requiresDesign}
                >
                  <option value="">Select design type...</option>
                  {designTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.type === 'physical' ? '📦 Physical' : '💻 Digital'})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This determines the default timeline and requirements
              </p>
            </div>

            {/* Optional: Override Lead Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Design Lead Time (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={designLeadTimeOverride || ''}
                  onChange={(e) => onChange({
                    design_lead_time_override: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                  placeholder="Days"
                />
                <span className="text-sm text-gray-600">days before event</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use the default from the design type
              </p>
            </div>

            {/* Show selected design type info */}
            {designItemTypeId && designTypes.find(t => t.id === designItemTypeId) && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-sm font-medium text-purple-900 mb-1">
                  Selected: {designTypes.find(t => t.id === designItemTypeId)?.name}
                </p>
                <p className="text-xs text-purple-700">
                  {designTypes.find(t => t.id === designItemTypeId)?.description}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
