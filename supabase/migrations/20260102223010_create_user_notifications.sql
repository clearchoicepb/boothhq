-- ============================================
-- User Notifications System
-- Run in TENANT DATA database
-- ============================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related entity (polymorphic)
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Navigation link
  link_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Actor who triggered notification (for display)
  actor_name VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Primary query: unread notifications for a user, sorted by newest
CREATE INDEX idx_user_notifications_user_unread
  ON user_notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- All notifications for a user (for list view)
CREATE INDEX idx_user_notifications_tenant_user
  ON user_notifications(tenant_id, user_id, created_at DESC);

-- Lookup by entity (for clearing related notifications)
CREATE INDEX idx_user_notifications_entity
  ON user_notifications(entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (RLS handled at app layer via service role)
-- Following the pattern used by other tenant tables in this codebase
CREATE POLICY "Allow all access to user_notifications"
  ON user_notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON user_notifications TO PUBLIC;

-- ============================================
-- TRIGGER FOR CLEANUP (optional)
-- ============================================

-- Auto-delete read notifications older than 30 days
-- Can be run via cron job instead if preferred
-- CREATE OR REPLACE FUNCTION cleanup_old_notifications()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM user_notifications
--   WHERE is_read = TRUE
--     AND read_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE user_notifications IS 'In-app notifications for users';
COMMENT ON COLUMN user_notifications.type IS 'Notification type: form_completed, proof_approved, proof_rejected, subtask_completed, ticket_resolved';
COMMENT ON COLUMN user_notifications.entity_type IS 'Related entity type: event, task, ticket, design_proof, event_form';
COMMENT ON COLUMN user_notifications.entity_id IS 'ID of the related entity for navigation';
COMMENT ON COLUMN user_notifications.link_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN user_notifications.actor_name IS 'Name of person/client who triggered the notification';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
