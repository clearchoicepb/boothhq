-- Prevent Ticket Creators from Voting on Their Own Tickets
-- This adds a CHECK constraint to ensure reported_by != user_id in ticket_votes

-- Add a check constraint to prevent self-voting
-- We need to join with tickets table to check if the voter is the creator
-- Since we can't do joins in CHECK constraints, we'll use a trigger instead

-- Function to prevent self-voting
CREATE OR REPLACE FUNCTION prevent_ticket_self_vote()
RETURNS TRIGGER AS $$
DECLARE
  ticket_creator_id UUID;
BEGIN
  -- Get the ticket creator
  SELECT reported_by INTO ticket_creator_id
  FROM tickets
  WHERE id = NEW.ticket_id;

  -- Check if the voter is the creator
  IF ticket_creator_id = NEW.user_id THEN
    RAISE EXCEPTION 'Ticket creators cannot vote on their own tickets';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on ticket_votes
DROP TRIGGER IF EXISTS trigger_prevent_ticket_self_vote ON ticket_votes;
CREATE TRIGGER trigger_prevent_ticket_self_vote
  BEFORE INSERT ON ticket_votes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ticket_self_vote();

-- Add comment for documentation
COMMENT ON FUNCTION prevent_ticket_self_vote() IS 'Prevents ticket creators from voting on their own tickets';

