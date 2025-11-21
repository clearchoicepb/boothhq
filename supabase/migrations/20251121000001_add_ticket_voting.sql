-- Add voting system to tickets
-- Allows users to "like" tickets to help prioritize features and bugs

-- Ticket votes table (tracks who voted for what)
CREATE TABLE IF NOT EXISTS ticket_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one vote per user per ticket
  UNIQUE(ticket_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_ticket_votes_ticket ON ticket_votes(ticket_id);
CREATE INDEX idx_ticket_votes_user ON ticket_votes(user_id);
CREATE INDEX idx_ticket_votes_tenant ON ticket_votes(tenant_id);

-- Enable RLS
ALTER TABLE ticket_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all access (tenant isolation handled at app layer)
CREATE POLICY "Allow all access to ticket_votes" 
  ON ticket_votes FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON ticket_votes TO PUBLIC;

-- Add comment for documentation
COMMENT ON TABLE ticket_votes IS 'User votes/likes for tickets to help prioritize features and bugs';
COMMENT ON COLUMN ticket_votes.ticket_id IS 'The ticket being voted for';
COMMENT ON COLUMN ticket_votes.user_id IS 'The user who voted';

