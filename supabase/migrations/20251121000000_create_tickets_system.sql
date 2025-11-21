-- Create Tickets System for Bug Reports and Feature Requests
-- Allows staff to report issues and request features directly in the CRM

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ticket_type VARCHAR(50) DEFAULT 'bug' CHECK (ticket_type IN ('bug', 'feature', 'question', 'improvement', 'other')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status & Assignment
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'on_hold')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Reporter Info
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Optional Context
  related_entity_type VARCHAR(50), -- 'event', 'contact', 'opportunity', etc.
  related_entity_id UUID, -- ID of the related record
  page_url TEXT, -- URL where issue was encountered
  browser_info TEXT, -- Browser/device info
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  -- Metadata
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_type ON tickets(ticket_type);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_reported_by ON tickets(reported_by);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all access (tenant isolation handled at app layer)
CREATE POLICY "Allow all access to tickets" 
  ON tickets FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON tickets TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE tickets IS 'Bug reports and feature requests submitted by staff';
COMMENT ON COLUMN tickets.ticket_type IS 'Type of ticket: bug, feature, question, improvement, other';
COMMENT ON COLUMN tickets.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN tickets.status IS 'Current status: new, in_progress, resolved, closed, on_hold';
COMMENT ON COLUMN tickets.related_entity_type IS 'Optional: Type of related CRM record (event, contact, etc)';
COMMENT ON COLUMN tickets.related_entity_id IS 'Optional: ID of related CRM record';
COMMENT ON COLUMN tickets.page_url IS 'URL where the issue was encountered';
COMMENT ON COLUMN tickets.browser_info IS 'Browser and device information for debugging';

