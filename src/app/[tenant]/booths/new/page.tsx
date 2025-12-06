'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/app-layout'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('new')

export default function NewBoothPage() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string

  const [formData, setFormData] = useState({
    booth_name: '',
    booth_type: 'standard',
    description: '',
    notes: '',
    status: 'incomplete',
    is_active: true
  })

  const [requiredItems, setRequiredItems] = useState<Array<{ type: string; quantity: number }>>([
    { type: 'camera', quantity: 1 },
    { type: 'ipad', quantity: 1 }
  ])

  const [saving, setSaving] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const addRequiredItem = () => {
    setRequiredItems([...requiredItems, { type: '', quantity: 1 }])
  }

  const removeRequiredItem = (index: number) => {
    setRequiredItems(requiredItems.filter((_, i) => i !== index))
  }

  const updateRequiredItem = (index: number, field: 'type' | 'quantity', value: string | number) => {
    const updated = [...requiredItems]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setRequiredItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.booth_name.trim()) {
      toast.error('Please enter a booth name')
      return
    }

    // Convert required items array to object
    const requiredItemsObj: Record<string, number> = {}
    requiredItems.forEach(item => {
      if (item.type && item.quantity > 0) {
        requiredItemsObj[item.type] = item.quantity
      }
    })

    try {
      setSaving(true)

      const response = await fetch('/api/booths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          required_items: requiredItemsObj,
          is_complete: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/${tenantSubdomain}/booths/${data.id}/configure`)
      } else {
        const error = await response.json()
        toast.error(`Error: ${error.error || 'Failed to create booth'}`)
      }
    } catch (error) {
      log.error({ error }, 'Error creating booth')
      toast.error('Failed to create booth')
    } finally {
      setSaving(false)
    }
  }

  const equipmentTypes = [
    { value: 'camera', label: 'Camera' },
    { value: 'ipad', label: 'iPad/Tablet' },
    { value: 'printer', label: 'Printer' },
    { value: 'backdrop', label: 'Backdrop' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'props', label: 'Props' },
    { value: 'stand', label: 'Stand/Mount' },
    { value: 'cable', label: 'Cable' },
    { value: 'power', label: 'Power Supply' },
    { value: 'case', label: 'Case/Bag' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href={`/${tenantSubdomain}/booths`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Booths
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Booth</h1>
        <p className="text-gray-600">
          Set up a new booth configuration with required equipment
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Booth Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booth Name */}
            <div>
              <label htmlFor="booth_name" className="block text-sm font-medium text-gray-700 mb-1">
                Booth Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="booth_name"
                name="booth_name"
                value={formData.booth_name}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., Booth A, Premium Setup #1"
                required
              />
            </div>

            {/* Booth Type */}
            <div>
              <label htmlFor="booth_type" className="block text-sm font-medium text-gray-700 mb-1">
                Booth Type
              </label>
              <select
                id="booth_type"
                name="booth_type"
                value={formData.booth_type}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="deluxe">Deluxe</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Brief description of this booth configuration"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Internal notes about this booth"
              />
            </div>

            {/* Is Active */}
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active (available for assignment)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Required Equipment */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">Required Equipment</h2>
              <p className="text-sm text-gray-600 mt-1">
                Define what equipment should be in this booth
              </p>
            </div>
            <Button type="button" onClick={addRequiredItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {requiredItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <select
                    value={item.type}
                    onChange={(e) => updateRequiredItem(index, 'type', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select equipment type...</option>
                    {equipmentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateRequiredItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Qty"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRequiredItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {requiredItems.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No required items defined. Click "Add Item" to add equipment requirements.
              </p>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <Link href={`/${tenantSubdomain}/booths`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Creating...' : 'Create Booth'}
          </Button>
        </div>
      </form>
    </AppLayout>
  )
}
