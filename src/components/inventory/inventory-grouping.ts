export interface GroupedInventorySection {
  type: 'product_group' | 'location' | 'warehouse'
  id: string
  title: string
  items: any[]
  isCollapsed?: boolean
}

export function groupAndSortInventoryItems(items: any[]): GroupedInventorySection[] {
  const sections: GroupedInventorySection[] = []

  // 1. Group items by product group (at the top)
  const itemsInGroups = items.filter(item => item.product_group_id && item.product_group_name)
  const productGroupMap = new Map<string, any[]>()

  itemsInGroups.forEach(item => {
    const groupId = item.product_group_id
    if (!productGroupMap.has(groupId)) {
      productGroupMap.set(groupId, [])
    }
    productGroupMap.get(groupId)!.push(item)
  })

  // Add product group sections (sorted by group name)
  const sortedGroups = Array.from(productGroupMap.entries()).sort((a, b) => {
    const nameA = a[1][0]?.product_group_name || ''
    const nameB = b[1][0]?.product_group_name || ''
    return nameA.localeCompare(nameB)
  })

  sortedGroups.forEach(([groupId, groupItems]) => {
    sections.push({
      type: 'product_group',
      id: groupId,
      title: groupItems[0].product_group_name,
      items: groupItems.sort((a, b) => a.item_name.localeCompare(b.item_name)),
      isCollapsed: false
    })
  })

  // 2. Get items NOT in product groups
  const itemsWithoutGroups = items.filter(item => !item.product_group_id)

  // Separate warehouse vs non-warehouse items
  const nonWarehouseItems = itemsWithoutGroups.filter(item => {
    // Not in warehouse if:
    // - assignment_type is not 'warehouse'
    // - OR assigned_to_type is not 'physical_address'
    // - OR item is assigned to a user or something else
    return item.assignment_type !== 'warehouse' &&
           (item.assigned_to_type !== 'physical_address' || !item.assigned_to_id)
  })

  const warehouseItems = itemsWithoutGroups.filter(item => {
    // In warehouse if assignment_type is 'warehouse' OR assigned to physical_address with no other assignment
    return item.assignment_type === 'warehouse' ||
           (item.assigned_to_type === 'physical_address' && item.assignment_type !== 'event_checkout' && item.assignment_type !== 'long_term_staff')
  })

  // 3. Group non-warehouse items by location
  const locationMap = new Map<string, any[]>()

  nonWarehouseItems.forEach(item => {
    let locationKey = 'unassigned'
    let locationName = 'Unassigned'

    if (item.assigned_to_type === 'user' && item.assigned_to_name) {
      locationKey = `user_${item.assigned_to_id}`
      locationName = `${item.assigned_to_name}${item.assignment_type === 'event_checkout' ? ' (Event)' : ''}`
    } else if (item.assigned_to_name) {
      locationKey = `other_${item.assigned_to_id || 'unknown'}`
      locationName = item.assigned_to_name
    }

    if (!locationMap.has(locationKey)) {
      locationMap.set(locationKey, [])
    }
    locationMap.get(locationKey)!.push(item)
  })

  // Add location sections (sorted by location name)
  const sortedLocations = Array.from(locationMap.entries()).sort((a, b) => {
    const nameA = a[1][0]?.assigned_to_name || 'Unassigned'
    const nameB = b[1][0]?.assigned_to_name || 'Unassigned'
    return nameA.localeCompare(nameB)
  })

  sortedLocations.forEach(([locationKey, locationItems]) => {
    const firstItem = locationItems[0]
    let locationTitle = firstItem.assigned_to_name || 'Unassigned'

    if (firstItem.assigned_to_type === 'user' && firstItem.assignment_type === 'event_checkout') {
      locationTitle += ' (Event Checkout)'
    } else if (firstItem.assigned_to_type === 'user' && firstItem.assignment_type === 'long_term_staff') {
      locationTitle += ' (Long-term)'
    }

    sections.push({
      type: 'location',
      id: locationKey,
      title: locationTitle,
      items: locationItems.sort((a, b) => a.item_name.localeCompare(b.item_name)),
      isCollapsed: false
    })
  })

  // 4. Group warehouse items by category (sorted alphabetically)
  const categoryMap = new Map<string, any[]>()

  warehouseItems.forEach(item => {
    const category = item.item_category || 'Uncategorized'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(item)
  })

  // Add warehouse category sections (sorted by category name)
  const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  sortedCategories.forEach(([category, categoryItems]) => {
    sections.push({
      type: 'warehouse',
      id: `warehouse_${category}`,
      title: `Warehouse - ${category}`,
      items: categoryItems.sort((a, b) => a.item_name.localeCompare(b.item_name)),
      isCollapsed: false
    })
  })

  return sections
}
