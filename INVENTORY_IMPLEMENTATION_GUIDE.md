# Inventory System Implementation Guide

Following the refactored modal configuration pattern used in the codebase.

## Overview

The inventory system needs:
1. Inventory list page with CRUD operations
2. Create/Edit inventory modals using the form configuration system
3. Data management hooks with React Query
4. API routes for backend operations
5. Database schema (already exists: `equipment_items` table)

---

## Step 1: Review Existing Form Config

**File**: `/home/user/boothhq/src/components/forms/configs/inventoryFormConfig.ts`

This already exists! It defines:
- item_id (user-friendly identifier like C107)
- name (equipment name)
- equipment_type (Camera, iPad, Printer, etc.)
- status (available, assigned_to_booth, deployed, maintenance, retired)
- condition (excellent, good, fair, needs_repair)
- purchase_date
- purchase_price
- serial_number
- location
- model
- image_url
- notes

**Status Options**:
```
- available: Not assigned anywhere
- assigned_to_booth: Assigned to a specific booth
- deployed: Currently in use at an event
- maintenance: Being serviced
- retired: No longer in use
```

**Condition Options**:
```
- excellent: Like new
- good: Normal wear
- fair: Some visible wear
- needs_repair: Broken or malfunctioning
```

---

## Step 2: Create Inventory Form Wrapper

**File**: `/home/user/boothhq/src/components/inventory-form.tsx`

This already exists! It wraps the EntityForm:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { EntityForm } from '@/components/forms/EntityForm'

interface InventoryFormProps {
  equipment?: any | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (equipment: any) => void
}

export function InventoryForm({ equipment, isOpen, onClose, onSubmit }: InventoryFormProps) {
  const handleSubmit = async (data: any) => {
    await onSubmit(data)
  }

  return (
    <EntityForm
      entity="inventory"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={equipment || undefined}
      title={equipment ? 'Edit Equipment' : 'New Equipment'}
      submitLabel={equipment ? 'Update Equipment' : 'Create Equipment'}
    />
  )
}
```

---

## Step 3: Create Data Management Hooks

### A. Create useInventoryData.ts

**File**: `/home/user/boothhq/src/hooks/useInventoryData.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Fetches inventory items for current tenant
 */
async function fetchInventory(): Promise<any[]> {
  const response = await fetch('/api/inventory')
  if (!response.ok) {
    throw new Error('Failed to fetch inventory')
  }
  return response.json()
}

/**
 * Fetches single inventory item
 */
async function fetchInventoryItem(itemId: string): Promise<any> {
  const response = await fetch(`/api/inventory/${itemId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch inventory item')
  }
  return response.json()
}

/**
 * Query hook to fetch all inventory items
 */
export function useInventoryData() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Query hook to fetch single inventory item
 */
export function useInventoryItem(itemId: string) {
  return useQuery({
    queryKey: ['inventory', itemId],
    queryFn: () => fetchInventoryItem(itemId),
    staleTime: 30 * 1000,
    enabled: Boolean(itemId),
  })
}

/**
 * Mutation hook to create inventory item
 */
export function useAddInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })
      if (!response.ok) throw new Error('Failed to add inventory item')
      return response.json()
    },
    onSuccess: () => {
      // Invalidate cache so list refetches
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })
}

/**
 * Mutation hook to update inventory item
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, itemData }: { itemId: string; itemData: any }) => {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })
      if (!response.ok) throw new Error('Failed to update inventory item')
      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate both list and individual item cache
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', data.id] })
    }
  })
}

/**
 * Mutation hook to delete inventory item
 */
export function useDeleteInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete inventory item')
      return true
    },
    onSuccess: () => {
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })
}
```

### B. Create useInventory.ts

**File**: `/home/user/boothhq/src/hooks/useInventory.ts`

```typescript
import { useState, useCallback } from 'react'
import { useInventoryData, useAddInventory, useUpdateInventory, useDeleteInventory } from './useInventoryData'

/**
 * Custom hook for managing inventory
 * Combines data queries and form state
 */
export function useInventory() {
  // Modal/form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  // React Query hooks
  const itemsQuery = useInventoryData()
  const addMutation = useAddInventory()
  const updateMutation = useUpdateInventory()
  const deleteMutation = useDeleteInventory()

  /**
   * Open modal for creating new item
   */
  const openCreateModal = useCallback(() => {
    setEditingItemId(null)
    setSelectedItem(null)
    setIsModalOpen(true)
  }, [])

  /**
   * Open modal for editing existing item
   */
  const openEditModal = useCallback((item: any) => {
    setEditingItemId(item.id)
    setSelectedItem(item)
    setIsModalOpen(true)
  }, [])

  /**
   * Close modal
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingItemId(null)
    setSelectedItem(null)
  }, [])

  /**
   * Save item (create or update)
   */
  const saveItem = useCallback(async (itemData: any) => {
    try {
      if (editingItemId) {
        await updateMutation.mutateAsync({ itemId: editingItemId, itemData })
      } else {
        await addMutation.mutateAsync(itemData)
      }
      closeModal()
      return true
    } catch (error) {
      console.error('Error saving item:', error)
      throw error
    }
  }, [editingItemId, addMutation, updateMutation, closeModal])

  /**
   * Delete item
   */
  const deleteItem = useCallback(async (itemId: string) => {
    try {
      await deleteMutation.mutateAsync(itemId)
      return true
    } catch (error) {
      console.error('Error deleting item:', error)
      throw error
    }
  }, [deleteMutation])

  /**
   * Refresh inventory list
   */
  const refetch = useCallback(() => {
    itemsQuery.refetch()
  }, [itemsQuery])

  return {
    // Data
    items: itemsQuery.data ?? [],
    loading: itemsQuery.isLoading,
    error: itemsQuery.error,

    // Modal state
    isModalOpen,
    setIsModalOpen,
    editingItemId,
    selectedItem,

    // Actions
    openCreateModal,
    openEditModal,
    closeModal,
    saveItem,
    deleteItem,
    refetch,

    // Mutation states (for loading indicators)
    isSaving: addMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
```

---

## Step 4: Create API Routes

### A. GET and POST (route.ts)

**File**: `/home/user/boothhq/src/app/api/inventory/route.ts`

```typescript
import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    
    // Optional filters
    const status = searchParams.get('status')
    const equipmentType = searchParams.get('equipment_type')

    let query = supabase
      .from('equipment_items')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (equipmentType) {
      query = query.eq('equipment_type', equipmentType)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch inventory',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.item_id || !body.name || !body.equipment_type) {
      return NextResponse.json({
        error: 'Missing required fields: item_id, name, equipment_type'
      }, { status: 400 })
    }

    // Auto-inject tenant_id and created_by
    const itemData = {
      ...body,
      tenant_id: dataSourceTenantId,
      created_by: session.user.id
    }

    const { data, error } = await supabase
      .from('equipment_items')
      .insert(itemData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create inventory item',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### B. PUT and DELETE ([id]/route.ts)

**File**: `/home/user/boothhq/src/app/api/inventory/[id]/route.ts`

```typescript
import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const itemId = params.id
    const body = await request.json()

    // Build update data - only include provided fields
    const updateData: any = {}
    
    const allowedFields = ['item_id', 'name', 'equipment_type', 'model', 'serial_number',
                          'status', 'condition', 'location', 'booth_id', 'assigned_to_user_id',
                          'assigned_to_event_id', 'assigned_date', 'purchase_date', 'purchase_price',
                          'image_url', 'notes', 'last_checked_date', 'metadata']
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('equipment_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId) // Ensure tenant isolation
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update inventory item',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const itemId = params.id

    const { error } = await supabase
      .from('equipment_items')
      .delete()
      .eq('id', itemId)
      .eq('tenant_id', dataSourceTenantId) // Ensure tenant isolation

    if (error) {
      return NextResponse.json({
        error: 'Failed to delete inventory item',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Step 5: Create Display Component

**File**: `/home/user/boothhq/src/components/inventory-list.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, Filter } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-utils'
import toast from 'react-hot-toast'

interface InventoryListProps {
  items: any[]
  loading: boolean
  onEdit: (item: any) => void
  onDelete: (itemId: string) => void
  onCreateNew: () => void
  isDeleting: boolean
}

export function InventoryList({
  items,
  loading,
  onEdit,
  onDelete,
  onCreateNew,
  isDeleting
}: InventoryListProps) {
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({})

  const filteredItems = items.filter(item => {
    if (filter.status && item.status !== filter.status) return false
    if (filter.type && item.equipment_type !== filter.type) return false
    return true
  })

  // Get unique values for filters
  const statuses = [...new Set(items.map(item => item.status))]
  const types = [...new Set(items.map(item => item.equipment_type))]

  const handleDelete = async (itemId: string, itemName: string) => {
    if (confirm(`Delete "${itemName}"? This cannot be undone.`)) {
      try {
        await onDelete(itemId)
        toast.success('Item deleted')
      } catch (error) {
        toast.error('Failed to delete item')
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Equipment Inventory</h2>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No equipment found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Condition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.equipment_type}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'available' ? 'bg-green-100 text-green-800' :
                      item.status === 'deployed' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.location || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={isDeleting}
                        className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

---

## Step 6: Create Inventory Page

**File**: `/home/user/boothhq/src/app/[tenant]/inventory/page.tsx`

```typescript
'use client'

import { useInventory } from '@/hooks/useInventory'
import { InventoryForm } from '@/components/inventory-form'
import { InventoryList } from '@/components/inventory-list'
import { AppLayout } from '@/components/layout/app-layout'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const {
    items,
    loading,
    isModalOpen,
    editingItemId,
    selectedItem,
    isSaving,
    isDeleting,
    openCreateModal,
    openEditModal,
    closeModal,
    saveItem,
    deleteItem,
  } = useInventory()

  const handleSave = async (itemData: any) => {
    try {
      await saveItem(itemData)
      toast.success(editingItemId ? 'Equipment updated' : 'Equipment created')
    } catch (error) {
      toast.error('Failed to save equipment')
    }
  }

  const handleDelete = async (itemId: string) => {
    try {
      await deleteItem(itemId)
      toast.success('Equipment deleted')
    } catch (error) {
      toast.error('Failed to delete equipment')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Inventory</h1>
          <p className="mt-2 text-gray-600">
            Manage and track all equipment, cameras, iPads, and booth materials
          </p>
        </div>

        <InventoryList
          items={items}
          loading={loading}
          isDeleting={isDeleting}
          onEdit={openEditModal}
          onDelete={deleteItem}
          onCreateNew={openCreateModal}
        />

        <InventoryForm
          equipment={selectedItem}
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSave}
        />
      </div>
    </AppLayout>
  )
}
```

---

## Step 7: Database Schema (Already Exists!)

**File**: `/home/user/boothhq/supabase/migrations/20250210000001_create_equipment_items.sql`

The schema is already created with all necessary fields and multi-tenancy support:

```sql
CREATE TABLE IF NOT EXISTS equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  item_id VARCHAR(50) NOT NULL, -- C107, HS111, etc.
  equipment_type VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  
  serial_number VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  location VARCHAR(255),
  
  booth_id UUID REFERENCES booths(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  assigned_date TIMESTAMPTZ,
  
  condition VARCHAR(50) DEFAULT 'good',
  notes TEXT,
  last_checked_date TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  image_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(tenant_id, item_id)
);

-- Indexes and RLS policies are already defined
```

---

## Summary of Implementation

1. **Form Config** - DONE (inventoryFormConfig.ts)
2. **Form Wrapper** - DONE (inventory-form.tsx)
3. **Data Hooks** - TODO (create useInventoryData.ts and useInventory.ts)
4. **API Routes** - TODO (create /api/inventory/route.ts and /api/inventory/[id]/route.ts)
5. **Display Component** - TODO (create inventory-list.tsx)
6. **Page** - TODO (create app/[tenant]/inventory/page.tsx)
7. **Database** - DONE (equipment_items table exists)

---

## Key Points

1. **Form Configuration Pattern**
   - Declarative schema in FormConfig
   - Supports validation, grid layout, sections
   - Reusable across create and edit forms

2. **State Management**
   - useInventory() hook combines modal state and data operations
   - React Query handles caching and mutations
   - Automatic cache invalidation after operations

3. **Multi-Tenancy**
   - tenant_id always injected by API
   - RLS policies enforce database-level isolation
   - Queries filtered by dataSourceTenantId

4. **User Experience**
   - Toast notifications for feedback
   - Loading states during operations
   - Confirmation dialogs for destructive actions
   - Filter/search capabilities

5. **Error Handling**
   - Meaningful error messages
   - Validation at form and API levels
   - Try-catch blocks in mutations

This pattern ensures consistency with the existing codebase and makes future features easier to implement!
