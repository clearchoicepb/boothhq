'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DollarSign, Plus, Edit2, Trash2, Package, PlusCircle } from 'lucide-react'

interface PackageItem {
  id: string
  name: string
  base_price: number
  description: string | null
}

interface AddOn {
  id: string
  name: string
  price: number
  unit: string
  description: string | null
}

interface LineItem {
  id: string
  item_type: 'package' | 'add_on' | 'custom'
  package_id: string | null
  add_on_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
  sort_order: number
}

interface OpportunityPricingProps {
  opportunityId: string
  currentAmount: number
  onAmountUpdate: () => void
}

export function OpportunityPricing({ opportunityId, currentAmount, onAmountUpdate }: OpportunityPricingProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'package' | 'add_on' | 'custom'>('package')
  const [editingItem, setEditingItem] = useState<LineItem | null>(null)
  const [formData, setFormData] = useState({
    selectedId: '',
    name: '',
    description: '',
    quantity: '1',
    unit_price: '',
  })

  useEffect(() => {
    fetchData()
  }, [opportunityId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [lineItemsRes, packagesRes, addOnsRes] = await Promise.all([
        fetch(`/api/opportunities/${opportunityId}/line-items`),
        fetch('/api/packages?active=true'),
        fetch('/api/add-ons?active=true'),
      ])

      if (lineItemsRes.ok) setLineItems(await lineItemsRes.json())
      if (packagesRes.ok) setPackages(await packagesRes.json())
      if (addOnsRes.ok) setAddOns(await addOnsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (type: 'package' | 'add_on' | 'custom') => {
    setModalType(type)
    setEditingItem(null)
    setFormData({
      selectedId: '',
      name: '',
      description: '',
      quantity: '1',
      unit_price: '',
    })
    setIsModalOpen(true)
  }

  const handleItemSelection = (id: string) => {
    if (modalType === 'package') {
      const pkg = packages.find(p => p.id === id)
      if (pkg) {
        setFormData({
          selectedId: id,
          name: pkg.name,
          description: pkg.description || '',
          quantity: '1',
          unit_price: pkg.base_price.toString(),
        })
      }
    } else if (modalType === 'add_on') {
      const addOn = addOns.find(a => a.id === id)
      if (addOn) {
        setFormData({
          selectedId: id,
          name: addOn.name,
          description: addOn.description || '',
          quantity: '1',
          unit_price: addOn.price.toString(),
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      item_type: modalType,
      package_id: modalType === 'package' ? formData.selectedId : null,
      add_on_id: modalType === 'add_on' ? formData.selectedId : null,
      name: formData.name,
      description: formData.description || null,
      quantity: parseFloat(formData.quantity),
      unit_price: parseFloat(formData.unit_price),
    }

    try {
      const url = editingItem
        ? `/api/opportunities/${opportunityId}/line-items/${editingItem.id}`
        : `/api/opportunities/${opportunityId}/line-items`

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchData()
        onAmountUpdate()
        setIsModalOpen(false)
      }
    } catch (error) {
      console.error('Error saving line item:', error)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/line-items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
        onAmountUpdate()
      }
    } catch (error) {
      console.error('Error deleting line item:', error)
    }
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + Number(item.total), 0)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading pricing...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Items Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => openModal('package')}
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Package className="h-4 w-4 mr-2" />
          Add Package
        </Button>
        <Button
          onClick={() => openModal('add_on')}
          size="sm"
          variant="outline"
          className="text-purple-600 border-purple-600 hover:bg-purple-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Add-on
        </Button>
        <Button
          onClick={() => openModal('custom')}
          size="sm"
          variant="outline"
          className="text-green-600 border-green-600 hover:bg-green-50"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Custom Item
        </Button>
      </div>

      {/* Line Items Table */}
      {lineItems.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">No items added yet</p>
          <p className="text-xs text-gray-500 mt-1">Add packages, add-ons, or custom items to build your quote</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          item.item_type === 'package'
                            ? 'bg-blue-500'
                            : item.item_type === 'add_on'
                            ? 'bg-purple-500'
                            : 'bg-green-500'
                        }`}
                      ></span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    ${item.unit_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    ${item.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  Total:
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                  ${totalAmount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Add {modalType === 'package' ? 'Package' : modalType === 'add_on' ? 'Add-on' : 'Custom Item'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Package/Add-on Selection */}
              {modalType !== 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select {modalType === 'package' ? 'Package' : 'Add-on'} *
                  </label>
                  <select
                    value={formData.selectedId}
                    onChange={(e) => {
                      setFormData({ ...formData, selectedId: e.target.value })
                      handleItemSelection(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="">-- Select --</option>
                    {modalType === 'package'
                      ? packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.base_price.toFixed(2)}
                          </option>
                        ))
                      : addOns.map((addOn) => (
                          <option key={addOn.id} value={addOn.id}>
                            {addOn.name} - ${addOn.price.toFixed(2)} / {addOn.unit}
                          </option>
                        ))}
                  </select>
                </div>
              )}

              {/* Custom Item Name */}
              {modalType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>
              )}

              {/* Description */}
              {formData.selectedId || modalType === 'custom' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Price *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.unit_price}
                          onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {formData.quantity && formData.unit_price && (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-600">Total:</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(parseFloat(formData.quantity) * parseFloat(formData.unit_price)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </>
              ) : null}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!formData.selectedId && modalType !== 'custom'}
                >
                  Add to Quote
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
