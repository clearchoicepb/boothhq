# Scripts Directory

Utility and migration scripts for the Supabase CRM application.

---

## 📁 Directory Structure

```
scripts/
├── migrations/          # Migration runner scripts
│   ├── apply-*.js       # Scripts to apply specific migrations
│   └── *.sql           # One-off SQL helper files
├── utils/              # Utility scripts
│   ├── check-*.js      # Diagnostic scripts
│   ├── fix-*.js        # Fix/repair scripts
│   └── refresh-*.js    # Data refresh scripts
└── README.md           # This file
```

---

## 🔧 Migration Scripts (`migrations/`)

These scripts manually apply migrations from `supabase/migrations/` to your database.

**Note:** Supabase automatically applies migrations in `supabase/migrations/`. These scripts are for:
- Manual migration application
- Testing migrations locally
- Applying migrations to production if needed

### Usage:

```bash
# Apply notes migration
node scripts/migrations/apply-notes-migration-pg.js

# Apply contracts migration
node scripts/migrations/apply-contracts-migration-pg.js
```

**Requirements:**
- `DATABASE_URL` must be set in `.env.local`
- Database must be accessible from your machine

### Available Migrations:

1. **apply-notes-migration-pg.js**
   - Applies: `20251023000001_fix_notes_entity_types.sql`
   - Purpose: Allow notes for opportunities, events, invoices
   - Status: Ready to apply

2. **apply-contracts-migration-pg.js**
   - Applies: `20250204000000_create_contracts.sql`
   - Purpose: Create contracts table and features
   - Status: Already applied (legacy)

3. **apply-contracts-migration.js**
   - Legacy version of above
   - Status: Superseded by `-pg.js` version

### SQL Helper Files:

- `add-all-missing-invoice-columns.sql` - Invoice schema updates
- `add-balance-amount-column.sql` - Add balance to invoices
- `add-invoice-columns.sql` - Additional invoice columns
- `add-payment-terms-column.sql` - Payment terms support
- `verify-migration.sql` - Verify migration status

---

## 🛠️ Utility Scripts (`utils/`)

General-purpose utility scripts for maintenance and diagnostics.

### Diagnostic Scripts:

**check-gmail-connection.js**
- Purpose: Test Gmail integration
- Verifies: OAuth tokens, API connectivity
- Usage: `node scripts/utils/check-gmail-connection.js`

### Fix/Repair Scripts:

**fix-demo-login.js**
- Purpose: Reset demo account credentials
- Usage: `node scripts/utils/fix-demo-login.js`
- When: Demo account is locked or needs reset

**reset-admin-password.js**
- Purpose: Reset admin user password
- Usage: `node scripts/utils/reset-admin-password.js`
- When: Admin locked out

### Data Scripts:

**refresh-schema.js**
- Purpose: Refresh database schema cache
- Usage: `node scripts/utils/refresh-schema.js`
- When: After schema changes

**add-event-planner.js**
- Purpose: Add event planner functionality
- Status: Legacy/completed

---

## 📋 Best Practices

### Before Running Any Script:

1. **Backup your database** (if production)
2. **Check DATABASE_URL** in `.env.local`
3. **Test in development** first
4. **Read the script** to understand what it does

### After Running Migration:

1. **Verify** it worked (scripts show verification output)
2. **Test** the affected features in your app
3. **Archive** the runner script if one-time use

### Environment Variables:

All scripts expect these in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- Other vars may be needed depending on the script

---

## 🚨 Important Notes

### Migration Scripts vs Supabase Migrations:

**Supabase Migrations** (`supabase/migrations/*.sql`)
- ✅ Automatically applied by Supabase
- ✅ Version controlled with timestamps
- ✅ Applied in order
- ✅ This is the source of truth

**Migration Runner Scripts** (`scripts/migrations/*.js`)
- 📝 For manual application only
- 📝 Useful for local testing
- 📝 Backup if automatic migration fails
- 📝 One-time use, then archive

**You usually don't need the runner scripts!** Supabase handles migrations automatically.

---

## 🔐 Security Notes

- Never commit `.env.local` (contains DATABASE_URL)
- Be careful with production DATABASE_URL
- Always verify before running on production
- Scripts have error handling but use with caution

---

## 📚 Additional Resources

- **Main Migrations:** `supabase/migrations/`
- **Archive:** `archive/migration-scripts/` (old completed migrations)
- **Documentation:** See `MIGRATION_INSTRUCTIONS.md` in root

---

*Last Updated: October 23, 2025*

