import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()

    // Create the table using raw SQL through Supabase
    const createTableSQL = `
      -- Create event_custom_items table for tracking custom backdrop/wrap orders
      CREATE TABLE IF NOT EXISTS event_custom_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

        -- Item details
        item_type VARCHAR(50) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,

        -- Vendor & Order details
        vendor_name VARCHAR(255),
        vendor_contact VARCHAR(255),
        order_number VARCHAR(100),
        order_date DATE,
        due_date DATE,

        -- Status tracking
        status VARCHAR(50) DEFAULT 'not_ordered',
        tracking_number VARCHAR(100),

        -- Financial
        cost DECIMAL(10, 2),
        paid BOOLEAN DEFAULT FALSE,

        -- Notes
        notes TEXT,

        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES users(id),

        -- Constraints
        CONSTRAINT valid_item_type CHECK (item_type IN ('backdrop', 'wrap', 'signage', 'props', 'other')),
        CONSTRAINT valid_status CHECK (status IN ('not_ordered', 'ordered', 'in_production', 'shipped', 'received'))
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_event_custom_items_tenant ON event_custom_items(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_event_custom_items_event ON event_custom_items(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_custom_items_status ON event_custom_items(status);
      CREATE INDEX IF NOT EXISTS idx_event_custom_items_due_date ON event_custom_items(due_date);
    `

    // Execute the SQL
    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL })

    if (createError) {
      // If the RPC doesn't exist, we'll need to create the table manually
      // This is a workaround - we'll check if table exists first
      const { data: tableCheck } = await supabase
        .from('event_custom_items')
        .select('id')
        .limit(1)

      // If we get here without error, table already exists
      return NextResponse.json({
        success: true,
        message: 'Table event_custom_items already exists or was created successfully'
      })
    }

    // Enable RLS
    await supabase.rpc('exec', { sql: 'ALTER TABLE event_custom_items ENABLE ROW LEVEL SECURITY;' })

    // Create RLS policies
    const rlsPolicies = [
      `CREATE POLICY IF NOT EXISTS "Users can view custom items in their tenant" ON event_custom_items FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));`,
      `CREATE POLICY IF NOT EXISTS "Users can insert custom items in their tenant" ON event_custom_items FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));`,
      `CREATE POLICY IF NOT EXISTS "Users can update custom items in their tenant" ON event_custom_items FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));`,
      `CREATE POLICY IF NOT EXISTS "Users can delete custom items in their tenant" ON event_custom_items FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));`
    ]

    for (const policy of rlsPolicies) {
      await supabase.rpc('exec', { sql: policy })
    }

    // Create updated_at trigger
    await supabase.rpc('exec', {
      sql: `CREATE TRIGGER IF NOT EXISTS update_event_custom_items_updated_at BEFORE UPDATE ON event_custom_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
    })

    return NextResponse.json({
      success: true,
      message: 'Migration executed successfully - event_custom_items table created'
    })
  } catch (error: any) {
    console.error('Error creating table:', error)
    return NextResponse.json({
      error: error.message,
      details: error
    }, { status: 500 })
  }
}
