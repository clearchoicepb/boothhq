-- Phase 1: Database Foundation Migration
-- This migration adds the core tables and fields needed for the enhanced workflow

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  is_one_time BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_dates table for handling multiple dates per opportunity/event
CREATE TABLE IF NOT EXISTS event_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either opportunity_id or event_id is set, but not both
  CONSTRAINT check_opportunity_or_event CHECK (
    (opportunity_id IS NOT NULL AND event_id IS NULL) OR 
    (opportunity_id IS NULL AND event_id IS NOT NULL)
  )
);

-- Add new fields to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS mailing_address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailing_address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS mailing_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS mailing_country VARCHAR(100) DEFAULT 'US',
ADD COLUMN IF NOT EXISTS date_type VARCHAR(50) DEFAULT 'single_day',
ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS converted_event_id UUID REFERENCES events(id);

-- Add new fields to events table to match opportunities
ALTER TABLE events
ADD COLUMN IF NOT EXISTS mailing_address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailing_address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS mailing_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS mailing_country VARCHAR(100) DEFAULT 'US',
ADD COLUMN IF NOT EXISTS date_type VARCHAR(50) DEFAULT 'single_day',
ADD COLUMN IF NOT EXISTS converted_from_opportunity_id UUID REFERENCES opportunities(id);

-- Add conversion tracking to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS converted_account_id UUID REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS converted_contact_id UUID REFERENCES contacts(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_is_one_time ON locations(is_one_time);

CREATE INDEX IF NOT EXISTS idx_event_dates_tenant_id ON event_dates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_dates_opportunity_id ON event_dates(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_event_dates_event_id ON event_dates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_dates_location_id ON event_dates(location_id);
CREATE INDEX IF NOT EXISTS idx_event_dates_event_date ON event_dates(event_date);
CREATE INDEX IF NOT EXISTS idx_event_dates_status ON event_dates(status);

CREATE INDEX IF NOT EXISTS idx_opportunities_date_type ON opportunities(date_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_converted ON opportunities(is_converted);
CREATE INDEX IF NOT EXISTS idx_opportunities_converted_event_id ON opportunities(converted_event_id);

CREATE INDEX IF NOT EXISTS idx_events_date_type ON events(date_type);
CREATE INDEX IF NOT EXISTS idx_events_converted_from_opportunity_id ON events(converted_from_opportunity_id);

CREATE INDEX IF NOT EXISTS idx_leads_is_converted ON leads(is_converted);
CREATE INDEX IF NOT EXISTS idx_leads_converted_account_id ON leads(converted_account_id);

-- Add RLS policies for locations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'tenant_isolation_locations') THEN
    CREATE POLICY tenant_isolation_locations ON locations FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- Add RLS policies for event_dates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_dates' AND policyname = 'tenant_isolation_event_dates') THEN
    CREATE POLICY tenant_isolation_event_dates ON event_dates FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dates ENABLE ROW LEVEL SECURITY;

-- Add updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_locations_updated_at') THEN
    CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_event_dates_updated_at') THEN
    CREATE TRIGGER update_event_dates_updated_at BEFORE UPDATE ON event_dates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Sample data removed to avoid foreign key constraint issues

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 1 Database Foundation migration completed successfully!';
    RAISE NOTICE 'Added tables: locations, event_dates';
    RAISE NOTICE 'Enhanced tables: opportunities, events, leads';
    RAISE NOTICE 'Added indexes and RLS policies';
END $$;



