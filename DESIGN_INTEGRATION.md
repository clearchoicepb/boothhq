# Product Design Integration - Implementation Guide

This guide shows how to integrate the design system with products when the Products module is created.

## Phase 3 Implementation Status: ✅ COMPLETE

### What's Already Done:

1. **Database Schema** ✅
   - `products` table created with design fields
   - `event_design_items` table has timeline fields
   - Foreign keys and indexes in place

2. **Helper Functions** ✅
   - `createDesignItemForEvent()` - Creates design item for an event
   - `createAutoDesignItems()` - Auto-creates design items on event creation
   - `createDesignItemsForProduct()` - Creates design item when product is added to event

3. **API Endpoints** ✅
   - `POST /api/events/[id]/design-items` - Manually add design item to event
   - Events API auto-creates design items on event creation

4. **React Components** ✅
   - `<ProductDesignRequirements />` - Form section for product design settings
   - `<ProductDesignBadge />` - Badge to show "Design Required" on products

---

## How to Integrate with Products Module

### Step 1: Add to Product Form

When creating the product form (e.g., `src/app/[tenant]/products/[id]/page.tsx`), import and use the component:

```tsx
import { ProductDesignRequirements } from '@/components/products/product-design-requirements'
import { useState } from 'react'

export default function ProductForm() {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    requires_design: false,
    design_item_type_id: null,
    design_lead_time_override: null
  })

  const handleSubmit = async () => {
    // Save product with design fields
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    })
    // ...
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Basic product fields */}
      <input
        value={product.name}
        onChange={(e) => setProduct({ ...product, name: e.target.value })}
        placeholder="Product name"
      />

      {/* ... other fields ... */}

      {/* Design Requirements Section */}
      <ProductDesignRequirements
        requiresDesign={product.requires_design}
        designItemTypeId={product.design_item_type_id}
        designLeadTimeOverride={product.design_lead_time_override}
        onChange={(updates) => setProduct({ ...product, ...updates })}
      />

      <button type="submit">Save Product</button>
    </form>
  )
}
```

### Step 2: Display Design Badge on Product Cards/Lists

```tsx
import { ProductDesignBadge } from '@/components/products/product-design-badge'

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <ProductDesignBadge requiresDesign={product.requires_design} />
    </div>
  )
}
```

### Step 3: Trigger Design Item Creation When Product Added to Event

When a product is added to an event, call the API:

```tsx
const handleAddProductToEvent = async (productId: string, eventId: string, eventDate: string) => {
  // First, add product to event (your existing logic)
  await fetch(\`/api/events/\${eventId}/products\`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId })
  })

  // Then, create design item if product requires design
  const product = await fetchProduct(productId)
  if (product.requires_design && product.design_item_type_id) {
    await fetch(\`/api/events/\${eventId}/design-items\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        event_date: eventDate
      })
    })

    toast.success('Product added and design item created!')
  } else {
    toast.success('Product added to event')
  }
}
```

### Step 4: Create Product API (if not exists)

Create `src/app/api/products/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('name')

    if (error) throw error

    return NextResponse.json({ products: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

Create `src/app/api/products/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('products')
      .update(body)
      .eq('id', params.id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## How It Works

### Automatic Flow:

1. **Admin configures design types** in `/[tenant]/settings/design`
2. **Admin marks design type as "Auto-added"**
3. **New event is created** → Auto-added design items are created automatically
4. **Design items appear in Design Dashboard** at `/[tenant]/dashboard/design`

### Product-Triggered Flow:

1. **Admin creates product** and marks "requires design"
2. **Admin selects design type** for the product
3. **Product is added to event** → Design item is created automatically
4. **Task is created** and linked to design item
5. **Deadlines are calculated** based on event date, working backwards

### Timeline Calculation:

For **Digital** items:
```
Event Date - Design Days = Design Start Date
```

For **Physical** items:
```
Event Date - Shipping Days - Production Days - Design Days = Design Start Date
```

Example: Photo strip for wedding on June 15
- Event: June 15
- Shipping: 2 days
- Production: 3 days
- Design: 7 days
- **Design must start by: June 3**
- **Design deadline: June 10** (before production starts)

---

## API Reference

### POST /api/events/[eventId]/design-items

Create a design item for an event.

**Request Body:**
```json
{
  "design_item_type_id": "uuid",
  "event_date": "2025-06-15",
  "custom_design_days": 10  // optional
}
```

**Or with product:**
```json
{
  "product_id": "uuid",
  "event_date": "2025-06-15"
}
```

**Response:**
```json
{
  "designItem": {
    "id": "uuid",
    "event_id": "uuid",
    "design_item_type_id": "uuid",
    "design_start_date": "2025-06-03",
    "design_deadline": "2025-06-10",
    "status": "pending",
    "task_id": "uuid"
  }
}
```

---

## Database Schema

### products table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant isolation |
| name | VARCHAR | Product name |
| description | TEXT | Product description |
| requires_design | BOOLEAN | Whether product needs design work |
| design_item_type_id | UUID | FK to design_item_types |
| design_lead_time_override | INTEGER | Custom lead time in days |

### event_design_items additions

| Column | Type | Description |
|--------|------|-------------|
| design_start_date | DATE | Calculated start date |
| design_deadline | DATE | Deadline for design completion |
| custom_design_days | INTEGER | Override for design timeline |
| task_id | UUID | FK to tasks table |

---

## Testing Checklist

- [ ] Create design type with "Auto-added" enabled
- [ ] Create new event → Verify design item created automatically
- [ ] Create product with design requirements
- [ ] Add product to event → Verify design item created
- [ ] Verify task is created and linked
- [ ] Check Design Dashboard shows new items
- [ ] Verify deadlines calculated correctly for digital items
- [ ] Verify deadlines calculated correctly for physical items
- [ ] Test custom lead time override
- [ ] Verify "Design Required" badge shows on products

---

## Migration Files

1. `20251011120000_create_design_system.sql` - Core design tables
2. `20251011120002_add_design_timeline_fields.sql` - Timeline fields
3. `20251011120003_add_design_to_event_design_items.sql` - Products table & design item timeline

All migrations have been applied to the remote database.

---

## Future Enhancements

- [ ] Bulk create design items for multiple events
- [ ] Design item templates/presets
- [ ] File upload integration for design files
- [ ] Client approval workflow with notifications
- [ ] Design revision tracking
- [ ] Designer assignment automation
- [ ] Production vendor integration
- [ ] Design cost estimation

---

## Support

For questions or issues with design integration:
1. Check Design Dashboard for existing items
2. Review Settings → Design for configuration
3. Check browser console for API errors
4. Review server logs for helper function errors
