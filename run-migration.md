# 🚀 Run Database Migration: Contact-Account Many-to-Many

## Migration File Created
✅ `supabase/migrations/20251020201358_add_contact_accounts_junction.sql`

---

## 📋 **OPTION 1: Run via Supabase Dashboard (RECOMMENDED)**

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute Migration
1. Click **"New Query"**
2. Open the migration file: `supabase/migrations/20251020201358_add_contact_accounts_junction.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Success
Look for success messages:
- ✅ "Success. No rows returned"
- ✅ Check for any error messages (should be none)

---

## 📋 **OPTION 2: Run via Supabase CLI (if installed)**

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run pending migrations
supabase db push

# Or run specific migration
psql $DATABASE_URL -f supabase/migrations/20251020201358_add_contact_accounts_junction.sql
```

---

## ✅ **VERIFICATION QUERIES**

After running the migration, execute these queries in SQL Editor to verify:

### Query 1: Check junction table was created
```sql
SELECT COUNT(*) as total_relationships FROM contact_accounts;
```
**Expected:** Row count showing migrated relationships

### Query 2: Check existing contacts were migrated
```sql
SELECT 
  c.first_name,
  c.last_name,
  a.name as account_name,
  ca.role,
  ca.is_primary,
  ca.start_date
FROM contact_accounts ca
JOIN contacts c ON ca.contact_id = c.id
JOIN accounts a ON ca.account_id = a.id
ORDER BY ca.created_at DESC
LIMIT 10;
```
**Expected:** List of contacts with their account relationships

### Query 3: Check events table has new columns
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('primary_contact_id', 'event_planner_id', 'contact_id');
```
**Expected:** Shows all three columns (old contact_id + new primary_contact_id + event_planner_id)

### Query 4: Check primary_contact_id was populated
```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(contact_id) as has_contact_id,
  COUNT(primary_contact_id) as has_primary_contact_id,
  COUNT(event_planner_id) as has_event_planner_id
FROM events;
```
**Expected:** primary_contact_id count should match contact_id count

### Query 5: Check helper functions were created
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_contact%';
```
**Expected:** Shows 3 functions (get_contact_active_accounts, get_contact_total_events, get_contact_total_value)

### Query 6: Test helper function
```sql
-- Get a sample contact ID
SELECT id, first_name, last_name FROM contacts LIMIT 1;

-- Then use that ID to test the function (replace with actual ID)
SELECT * FROM get_contact_active_accounts('PASTE_CONTACT_ID_HERE');
```
**Expected:** Shows active accounts for that contact

---

## 🎯 **WHAT THIS MIGRATION DOES**

### ✅ Creates New Tables/Columns:
1. **`contact_accounts` table** - Junction table for many-to-many
2. **`events.primary_contact_id`** - Main decision maker for event
3. **`events.event_planner_id`** - External event coordinator

### ✅ Migrates Existing Data:
1. All `contacts.account_id` → `contact_accounts` (marked as "Primary Contact")
2. All `events.contact_id` → `events.primary_contact_id`

### ✅ Adds Infrastructure:
1. Indexes for performance
2. RLS policies for security
3. Helper functions for queries
4. Constraints to prevent duplicates

### ⚠️ **IMPORTANT: Backward Compatibility**
- **Does NOT drop** `contacts.account_id` column (yet)
- **Does NOT drop** `events.contact_id` column (yet)
- Old columns remain for backward compatibility
- Can be dropped in future migration after UI is updated

---

## 📊 **EXPECTED RESULTS**

After successful migration:
- ✅ `contact_accounts` table exists with migrated data
- ✅ All existing contact-account relationships preserved
- ✅ Events have `primary_contact_id` populated
- ✅ Helper functions available for queries
- ✅ No data loss
- ✅ Backward compatible (old columns still work)

---

## 🚨 **IF ERRORS OCCUR**

### Common Issues:

**Error: "relation contact_accounts already exists"**
- Solution: Table already created, safe to ignore or drop and recreate

**Error: "function update_updated_at_column() does not exist"**
- Solution: Create the trigger function first:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Error: "column tenant_id does not exist in contacts"**
- Solution: Your contacts table might not have tenant_id. Modify migration to use a different tenant tracking method.

**Error: "duplicate key value violates unique constraint"**
- Solution: Some contacts already have relationships in contact_accounts. Safe to ignore (ON CONFLICT DO NOTHING handles this).

---

## 📝 **NEXT STEPS AFTER MIGRATION**

1. ✅ Verify migration success (run verification queries above)
2. 🔄 Update TypeScript types (`src/types/database.ts`)
3. 🔄 Update API endpoints to query `contact_accounts`
4. 🔄 Update UI components to support many-to-many
5. 🔄 Add UI for managing contact-account relationships
6. 🔄 Add UI for event planner selection

---

**Ready to run the migration? Follow Option 1 (Supabase Dashboard) above!**

