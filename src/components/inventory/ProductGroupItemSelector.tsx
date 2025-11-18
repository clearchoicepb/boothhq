'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'

interface ProductGroupItemSelectorProps {
  availableItems: any[]
  excludeItemIds: string[]
  onAddItem: (itemId: string, quantity?: number) => void
  isAdding: boolean
}

export function ProductGroupItemSelector({
  availableItems,
  excludeItemIds,
  onAddItem,
  isAdding
}: ProductGroupItemSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)

  // Filter items based on search query and exclusions
  const filteredItems = useMemo(() => {
    return availableItems.filter((item: any) => {
      // Exclude items already in the group
      if (excludeItemIds.includes(item.id)) return false

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = item.item_name?.toLowerCase().includes(query)
        const matchesCategory = item.item_category?.toLowerCase().includes(query)
        const matchesSerial = item.serial_number?.toLowerCase().includes(query)
        const matchesModel = item.model?.toLowerCase().includes(query)

        return matchesName || matchesCategory || matchesSerial || matchesModel
      }

      return true
    })
  }, [availableItems, excludeItemIds, searchQuery])

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, any[]>()

    filteredItems.forEach((item: any) => {
      const category = item.item_category || 'Uncategorized'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(item)
    })

    // Sort categories alphabetically
    return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])))
  }, [filteredItems])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleAddClick = () => {
    if (selectedItemId) {
      const selectedItem = availableItems.find(item => item.id === selectedItemId)
      const quantityToAdd = selectedItem?.tracking_type === 'total_quantity' ? quantity : 1
      onAddItem(selectedItemId, quantityToAdd)
      setSelectedItemId('')
      setQuantity(1)  // Reset quantity
    }
  }

  const handleItemClick = (itemId: string) => {
    if (itemId === selectedItemId) {
      // Deselecting
      setSelectedItemId('')
      setQuantity(1)
    } else {
      // Selecting new item
      setSelectedItemId(itemId)
      setQuantity(1)  // Reset to 1 for new selection
    }
  }
  
  // Get the selected item details
  const selectedItem = availableItems.find(item => item.id === selectedItemId)

  return (
    <div className="bg-white rounded-lg p-3 border border-purple-200">
      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by item name, category, serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Collapsible Categories */}
      <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
        {itemsByCategory.size === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500">
            {searchQuery ? 'No items match your search' : 'No items available to add'}
          </div>
        ) : (
          Array.from(itemsByCategory.entries()).map(([category, items]) => {
            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="border border-gray-200 rounded-md overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{category}</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {items.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="bg-white divide-y divide-gray-100">
                    {items.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors ${
                          selectedItemId === item.id ? 'bg-purple-100 border-l-2 border-purple-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                            <div className="flex gap-2 mt-0.5">
                              {item.serial_number && (
                                <span className="text-xs text-gray-500">S/N: {item.serial_number}</span>
                              )}
                              {item.model && (
                                <span className="text-xs text-gray-500">Model: {item.model}</span>
                              )}
                              {item.tracking_type === 'total_quantity' && item.total_quantity && (
                                <span className="text-xs text-gray-500">Qty: {item.total_quantity}</span>
                              )}
                            </div>
                          </div>
                          {selectedItemId === item.id && (
                            <div className="ml-2">
                              <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Quantity Input - Only for quantity-tracked items */}
      {selectedItem && selectedItem.tracking_type === 'total_quantity' && (
        <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-purple-900">
              Quantity to Add
            </label>
            <span className="text-xs text-purple-600">
              Available: {selectedItem.total_quantity || 0}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              min="1"
              max={selectedItem.total_quantity || 1}
              value={quantity}
              onChange={(e) => {
                const newQty = parseInt(e.target.value) || 1
                const maxQty = selectedItem.total_quantity || 1
                setQuantity(Math.min(Math.max(1, newQty), maxQty))
              }}
              className="flex-1 px-3 py-2 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-sm text-purple-700 font-medium">
              / {selectedItem.total_quantity || 0}
            </span>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            Specify how many units of "{selectedItem.item_name}" should be in this group
          </p>
        </div>
      )}

      {/* Serial Item Notice */}
      {selectedItem && selectedItem.tracking_type === 'serial_number' && (
        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-700">
            <span className="font-medium">Serial tracked item:</span> Quantity is always 1
          </p>
        </div>
      )}

      {/* Add Button */}
      <Button
        size="sm"
        onClick={handleAddClick}
        disabled={!selectedItemId || isAdding}
        className="w-full"
      >
        <PlusCircle className="h-4 w-4 mr-1" />
        {isAdding ? 'Adding...' : selectedItem?.tracking_type === 'total_quantity' 
          ? `Add ${quantity} ${selectedItem?.item_name || 'Item'}${quantity > 1 ? 's' : ''}`
          : 'Add Selected Item'}
      </Button>
    </div>
  )
}
