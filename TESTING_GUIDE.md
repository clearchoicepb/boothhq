# Inventory Management System - Testing & Validation Guide

This comprehensive guide covers testing and validation for the complete inventory management refactor, including settings, maintenance tracking, consumables, automation, and cron jobs.

## Table of Contents

1. [Database Migration Testing](#database-migration-testing)
2. [Settings Page Testing](#settings-page-testing)
3. [API Routes Testing](#api-routes-testing)
4. [UI Component Testing](#ui-component-testing)
5. [Automation Testing](#automation-testing)
6. [Cron Job Testing](#cron-job-testing)
7. [Integration Testing](#integration-testing)
8. [User Acceptance Testing](#user-acceptance-testing)

---

## Database Migration Testing

### Prerequisites
- Access to Supabase dashboard
- Applied all migrations from `supabase/migrations/202511130000*.sql`

### Test Checklist

#### ✅ Equipment Categories Table
```sql
-- Verify table exists with correct structure
SELECT * FROM equipment_categories LIMIT 1;

-- Test inserting a category
INSERT INTO equipment_categories (tenant_id, name, color, requires_maintenance, maintenance_interval_days, is_consumable)
VALUES ('your-tenant-id', 'Test Camera', '#FF5733', true, 90, false);

-- Verify unique constraint
-- This should fail:
INSERT INTO equipment_categories (tenant_id, name)
VALUES ('your-tenant-id', 'Test Camera');
```

#### ✅ Maintenance History Table
```sql
-- Verify table and trigger
SELECT * FROM maintenance_history LIMIT 1;

-- Test trigger: Insert maintenance record
INSERT INTO maintenance_history (tenant_id, inventory_item_id, maintenance_date, next_maintenance_date, notes)
VALUES ('tenant-id', 'item-id', '2025-11-01', '2026-02-01', 'Test maintenance');

-- Verify inventory_items.last_maintenance_date updated
SELECT last_maintenance_date, next_maintenance_date FROM inventory_items WHERE id = 'item-id';
```

#### ✅ Consumable Inventory Table
```sql
-- Verify table and trigger
SELECT * FROM consumable_inventory LIMIT 1;

-- Test usage trigger: Log usage
INSERT INTO consumable_usage (tenant_id, consumable_id, quantity_used, usage_date)
VALUES ('tenant-id', 'consumable-id', 10, '2025-11-13');

-- Verify quantity auto-deducted
SELECT current_quantity FROM consumable_inventory WHERE id = 'consumable-id';
```

#### ✅ Inventory Notifications Table
```sql
-- Verify polymorphic relationships
SELECT * FROM inventory_notifications WHERE inventory_item_id IS NOT NULL LIMIT 1;
SELECT * FROM inventory_notifications WHERE consumable_id IS NOT NULL LIMIT 1;
```

---

## Settings Page Testing

### Location
Navigate to: `/[tenant]/settings/inventory`

### Test Cases

#### 1. Category Management
- [ ] **Load categories**: Verify categories load from API
- [ ] **Add category**: Click "Add Category" button
  - Verify new category appears
  - Verify color picker works
  - Verify name is editable inline
- [ ] **Edit category**: Click on category name
  - Change name → verify saves to database
  - Change color → verify updates visually and in database
  - Toggle maintenance → verify checkbox updates
  - Change interval → verify number input saves
- [ ] **Delete category**: Click trash icon
  - Verify confirmation dialog appears
  - Confirm → category disappears
  - Test deleting category with assigned items (should fail gracefully)

#### 2. Display Settings
- [ ] **Show Cost**: Toggle on/off
  - Verify setting persists after page reload
- [ ] **Show Location**: Toggle on/off
  - Verify setting persists after page reload
- [ ] **Show Last Maintenance**: Toggle on/off
  - Verify setting persists after page reload

#### 3. Required Fields
- [ ] **Toggle Serial Number**: Mark as required
  - Go to inventory form → verify field shows asterisk
  - Try submitting without serial number → verify validation fails
- [ ] **Toggle Cost**: Mark as optional
  - Go to inventory form → verify field is not required
  - Submit without cost → verify form accepts

#### 4. Maintenance Settings
- [ ] **Default Interval**: Change value
  - Create new category → verify uses default interval
- [ ] **Reminder Days**: Change value
  - Verify saves successfully

#### 5. Automation Settings
- [ ] **Auto Track Usage**: Toggle on/off
- [ ] **Low Stock Alerts**: Toggle on/off
- [ ] **Auto Generate Maintenance Tasks**: Toggle on/off

#### 6. Consumables Display
- [ ] Verify consumables list loads
- [ ] Verify stock levels display correctly
- [ ] Verify low stock warnings show (if applicable)
- [ ] Verify events remaining calculation (if category has consumption rate)

---

## API Routes Testing

### Equipment Categories API

```bash
# GET /api/equipment-categories
curl http://localhost:3000/api/equipment-categories \
  -H "Cookie: your-auth-cookie"

# POST /api/equipment-categories
curl -X POST http://localhost:3000/api/equipment-categories \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Test Category",
    "color": "#FF5733",
    "requires_maintenance": true,
    "maintenance_interval_days": 90
  }'

# PATCH /api/equipment-categories/[id]
curl -X PATCH http://localhost:3000/api/equipment-categories/category-id \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"name": "Updated Category"}'

# DELETE /api/equipment-categories/[id]
curl -X DELETE http://localhost:3000/api/equipment-categories/category-id \
  -H "Cookie: your-auth-cookie"
```

### Maintenance API

```bash
# GET /api/maintenance (list all)
curl http://localhost:3000/api/maintenance

# GET /api/maintenance/due (items due)
curl http://localhost:3000/api/maintenance/due

# GET /api/maintenance/overdue
curl http://localhost:3000/api/maintenance/overdue

# GET /api/maintenance/stats
curl http://localhost:3000/api/maintenance/stats

# POST /api/maintenance/complete
curl -X POST http://localhost:3000/api/maintenance/complete \
  -H "Content-Type: application/json" \
  -d '{
    "inventory_item_id": "item-id",
    "maintenance_date": "2025-11-13",
    "performed_by": "John Smith",
    "notes": "Completed routine maintenance",
    "createTask": true
  }'
```

### Consumables API

```bash
# GET /api/consumables
curl http://localhost:3000/api/consumables

# GET /api/consumables/stats
curl http://localhost:3000/api/consumables/stats

# POST /api/consumables/usage
curl -X POST http://localhost:3000/api/consumables/usage \
  -H "Content-Type: application/json" \
  -d '{
    "consumable_id": "consumable-id",
    "quantity_used": 50,
    "usage_date": "2025-11-13",
    "event_id": "event-id",
    "notes": "Used for weekend event"
  }'

# POST /api/consumables/[id]/reorder
curl -X POST http://localhost:3000/api/consumables/consumable-id/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 500,
    "cost": 150.00,
    "date": "2025-11-13"
  }'
```

### Notifications API

```bash
# GET /api/inventory-notifications
curl http://localhost:3000/api/inventory-notifications

# GET /api/inventory-notifications/stats
curl http://localhost:3000/api/inventory-notifications/stats

# POST /api/inventory-notifications/[id]/dismiss
curl -X POST http://localhost:3000/api/inventory-notifications/notif-id/dismiss

# POST /api/inventory-notifications/[id]/send
curl -X POST http://localhost:3000/api/inventory-notifications/notif-id/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["user@example.com"]
  }'
```

---

## UI Component Testing

### Maintenance Dashboard (`/[tenant]/maintenance`)

#### Dashboard Tab
- [ ] **Stats Cards**: Verify numbers are accurate
  - Overdue count (red)
  - Due soon count (yellow)
  - Upcoming count (blue)
  - Completed this month (green)
- [ ] **Overdue Items**: Verify list displays correctly
  - Items show red badge
  - Days overdue calculated correctly
  - Item details complete (name, model, category, location)
- [ ] **Due Items**: Verify list displays correctly
  - Items show yellow badge
  - Due date shown
  - "Complete Maintenance" button works
- [ ] **Empty State**: Clear all maintenance → verify empty state shows

#### Complete Maintenance Modal
- [ ] Modal opens when clicking "Complete Maintenance"
- [ ] Form validation:
  - Maintenance date required
  - Cannot be future date
- [ ] **Performed By** field accepts text
- [ ] **Notes** textarea accepts input
- [ ] **Interval** number field updates next due date preview
- [ ] **Create Task** checkbox toggles
- [ ] **Submit**:
  - Loading state shows
  - Success → modal closes, list refreshes
  - Error → error message displays
- [ ] **Cancel** closes modal without saving

#### History Tab
- [ ] Records load and display chronologically
- [ ] **Search** filters by item name, person, notes
- [ ] **Date Filters** work:
  - All Time
  - This Month
  - This Quarter
  - This Year
- [ ] **Results counter** updates correctly
- [ ] **Timeline display**:
  - Groups by date
  - Shows "Today" vs actual dates
  - Timeline dots and lines render
  - All details visible (item, performer, next date, notes)

### Inventory List Integration

Navigate to: `/[tenant]/inventory`

- [ ] **Column Visibility**:
  - Settings: Hide "Cost" → verify column disappears
  - Settings: Hide "Location" → verify column disappears
  - Settings: Show "Last Maintenance" → verify column appears
- [ ] **Last Maintenance Column** (when visible):
  - Shows last maintenance date
  - Shows next maintenance date below
  - Shows "No maintenance" for items without history

### Inventory Form Integration

Navigate to: `/[tenant]/inventory/new`

- [ ] **Required Fields Respect Settings**:
  - Settings: Make serial number required → verify asterisk appears, validation fails without it
  - Settings: Make cost optional → verify no asterisk, form submits without it
  - Settings: Make purchase date required → verify validation enforces it

---

## Automation Testing

### Maintenance Automation

```bash
# Manually trigger for one tenant
curl -X POST http://localhost:3000/api/automation/maintenance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{
    "tenantId": "your-tenant-id",
    "action": "all"
  }'
```

**Expected Results:**
- New tasks created for items due within 7 days
- No duplicate tasks if already exist
- Overdue notifications created
- Returns count of created items

**Validation:**
```sql
-- Verify tasks created
SELECT * FROM tasks
WHERE task_type = 'maintenance'
AND metadata->>'autoCreated' = 'true'
ORDER BY created_at DESC;

-- Verify notifications created
SELECT * FROM inventory_notifications
WHERE notification_type = 'maintenance_overdue'
ORDER BY created_at DESC;
```

### Consumable Automation

```bash
# Manually trigger
curl -X POST http://localhost:3000/api/automation/consumables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{
    "tenantId": "your-tenant-id",
    "action": "all"
  }'
```

**Expected Results:**
- Low stock alerts for items <= threshold
- Out of stock alerts for items = 0
- Events remaining calculated
- No duplicates if notifications exist

**Validation:**
```sql
-- Verify low stock notifications
SELECT n.*, c.current_quantity, cat.low_stock_threshold
FROM inventory_notifications n
JOIN consumable_inventory c ON n.consumable_id = c.id
JOIN equipment_categories cat ON c.category_id = cat.id
WHERE n.notification_type = 'low_stock';
```

### Alert Dismissal Automation

**Test Maintenance Completion:**
1. Create overdue maintenance notification manually
2. Complete maintenance via UI or API
3. Verify notification status changed to 'dismissed'

**Test Consumable Restock:**
1. Create low stock notification manually
2. Record reorder via API
3. Verify notification status changed to 'dismissed'

---

## Cron Job Testing

### Setup Environment Variables

```bash
# In Vercel dashboard or .env.local
CRON_SECRET="test-secret-123"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
GMAIL_USER="test@example.com"
GMAIL_APP_PASSWORD="app-password"
```

### Test Maintenance Cron

```bash
# Trigger locally
curl http://localhost:3000/api/cron/maintenance \
  -H "Authorization: Bearer test-secret-123"
```

**Verify:**
- [ ] All active tenants processed
- [ ] Summary includes counts (total tenants, successful, failed)
- [ ] Check logs for any errors
- [ ] Verify tasks created in database
- [ ] Verify notifications created in database

### Test Consumables Cron

```bash
# Trigger locally
curl http://localhost:3000/api/cron/consumables \
  -H "Authorization: Bearer test-secret-123"
```

**Verify:**
- [ ] All tenants checked
- [ ] Low stock items identified
- [ ] Out of stock items identified
- [ ] Notifications created correctly

### Test Notifications Cron

```bash
# Trigger locally
curl http://localhost:3000/api/cron/notifications \
  -H "Authorization: Bearer test-secret-123"
```

**Verify:**
- [ ] Pending notifications fetched (high/medium priority only)
- [ ] Emails sent (check inbox)
- [ ] Email formatting correct (HTML + plain text)
- [ ] Priority color coding (red for high, yellow for medium)
- [ ] Notification status updated to 'sent'
- [ ] sent_at timestamp set

---

## Integration Testing

### End-to-End Workflow: Maintenance

1. **Setup:**
   - Create equipment category with maintenance enabled
   - Set maintenance interval to 90 days
   - Create inventory item in that category

2. **Initial Maintenance:**
   - Navigate to `/[tenant]/maintenance`
   - Verify item appears in "Due Soon" (if within 7 days of next_maintenance_date)
   - Click "Complete Maintenance"
   - Fill form, enable "Create Task"
   - Submit

3. **Verify Results:**
   - Maintenance record created in database
   - Inventory item last_maintenance_date updated
   - Inventory item next_maintenance_date = last_maintenance_date + 90 days
   - Task created if checkbox was enabled
   - Any overdue notifications dismissed

4. **Automation:**
   - Run maintenance automation
   - Verify new task created for next maintenance (if within 7 days)

### End-to-End Workflow: Consumables

1. **Setup:**
   - Create consumable category with threshold = 100, consumption = 50/event
   - Create consumable inventory with quantity = 150

2. **Use Consumables:**
   - Log usage of 75 units
   - Verify current_quantity = 75
   - Verify still above threshold (no alert)

3. **Trigger Low Stock:**
   - Log usage of 50 more units
   - Verify current_quantity = 25
   - Run consumables automation
   - Verify low stock notification created

4. **Restock:**
   - Record reorder of 500 units
   - Verify current_quantity = 525
   - Verify low stock notification dismissed

5. **Email:**
   - Run notifications cron
   - Verify email received with low stock alert (if notification was pending)

---

## User Acceptance Testing

### Settings Page UAT
- [ ] User can understand all settings without documentation
- [ ] Changes take effect immediately in forms/lists
- [ ] Category colors are visually distinct
- [ ] Validation messages are clear
- [ ] Save confirmations are visible

### Maintenance Dashboard UAT
- [ ] Overdue items are clearly marked as urgent
- [ ] Maintenance completion workflow is intuitive
- [ ] History is easy to search and filter
- [ ] Stats provide useful at-a-glance information

### Notifications UAT
- [ ] Email subject lines are clear
- [ ] Email content explains the issue
- [ ] Action items are obvious
- [ ] Priority levels are appropriate

---

## Performance Testing

### Database Queries
```sql
-- Check for missing indexes
EXPLAIN ANALYZE
SELECT * FROM inventory_items
WHERE tenant_id = 'xxx' AND next_maintenance_date < NOW();

-- Should use index on (tenant_id, next_maintenance_date)
```

### API Response Times
- [ ] Equipment categories list < 200ms
- [ ] Maintenance dashboard < 500ms
- [ ] Inventory list with filters < 1s
- [ ] Cron jobs complete within timeout (30s)

### Cron Job Scalability
- [ ] Test with 10 tenants
- [ ] Test with 100 items per tenant
- [ ] Verify no timeouts
- [ ] Verify no duplicate creations

---

## Security Testing

### Authorization
- [ ] Cron endpoints reject requests without CRON_SECRET
- [ ] Cron endpoints reject requests with wrong secret
- [ ] API endpoints enforce tenant isolation
- [ ] Users cannot access other tenant's data

### Input Validation
- [ ] Category name: Max length enforced
- [ ] Maintenance interval: Must be positive integer
- [ ] Stock quantity: Cannot be negative
- [ ] Dates: Cannot be in far future

---

## Regression Testing

After all changes, verify existing functionality still works:

- [ ] Inventory item creation/editing
- [ ] Inventory assignment to users/locations
- [ ] Event checkout workflow
- [ ] Product groups
- [ ] Physical addresses
- [ ] Weekend prep dashboard
- [ ] Availability checker

---

## Sign-Off Checklist

### Database
- [ ] All 5 migrations applied successfully
- [ ] Triggers working (maintenance dates, quantity deduction)
- [ ] Constraints enforced (unique categories, foreign keys)

### API
- [ ] All 24+ endpoints tested and working
- [ ] Authentication working
- [ ] Tenant isolation verified
- [ ] Error handling appropriate

### UI
- [ ] Settings page fully functional
- [ ] Maintenance dashboard complete
- [ ] Form validation respects settings
- [ ] Column visibility respects settings

### Automation
- [ ] Maintenance automation creates tasks/notifications
- [ ] Consumable automation monitors stock
- [ ] Alert dismissal works on completion/restock

### Cron Jobs
- [ ] All 3 cron jobs configured in vercel.json
- [ ] Endpoints secured with CRON_SECRET
- [ ] Multi-tenant processing works
- [ ] Emails send successfully

### Documentation
- [ ] CRON_SETUP.md complete
- [ ] TESTING_GUIDE.md complete
- [ ] Environment variables documented
- [ ] API documentation up to date

---

## Known Issues / Future Enhancements

Document any known issues or planned enhancements:

- [ ] Issue: ...
- [ ] Enhancement: ...
- [ ] TODO: ...

---

## Deployment Checklist

Before deploying to production:

1. [ ] Run all migrations on production database
2. [ ] Set all environment variables in Vercel
3. [ ] Generate and set CRON_SECRET
4. [ ] Configure Gmail app password
5. [ ] Deploy to production
6. [ ] Test cron jobs manually via Vercel dashboard
7. [ ] Monitor first automated cron execution
8. [ ] Verify email delivery works
9. [ ] Check error logs for 24 hours
10. [ ] User acceptance testing in production

---

## Support & Troubleshooting

For issues or questions:
- Review CRON_SETUP.md for cron job issues
- Check Vercel logs for runtime errors
- Review Supabase logs for database errors
- Check email logs for delivery failures

Happy testing! 🚀
