# Inventory Automation Cron Jobs

This document explains the automated cron jobs for inventory management, maintenance tracking, and consumable stock monitoring.

## Overview

Three cron jobs run on Vercel to automate inventory management:

1. **Maintenance Automation** - Daily at 6:00 AM UTC
2. **Consumable Stock Checks** - 3x daily at 8:00 AM, 2:00 PM, 8:00 PM UTC
3. **Notification Emails** - Daily at 9:00 AM UTC

## Cron Schedules

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/maintenance",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/consumables",
      "schedule": "0 8,14,20 * * *"
    },
    {
      "path": "/api/cron/notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Environment Variables Required

Add these to your Vercel project:

```bash
# Required for cron job authentication
CRON_SECRET="your-random-secret-string-here"

# Required for tenant operations
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Required for email notifications
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"
```

### Generating CRON_SECRET

Use a secure random string:

```bash
openssl rand -base64 32
```

## Cron Job Details

### 1. Maintenance Automation (`/api/cron/maintenance`)

**Schedule:** Daily at 6:00 AM UTC
**Endpoint:** `/api/cron/maintenance`

**Actions:**
- Scans all inventory items for upcoming maintenance (due within 7 days)
- Creates tasks for items without existing maintenance tasks
- Creates high-priority notifications for overdue maintenance
- Prevents duplicate tasks and notifications

**Example Task Created:**
```
Title: "Maintenance: Canon Camera EOS R5"
Description: "Scheduled maintenance is due for Canon Camera EOS R5"
Type: maintenance
Priority: medium
Due Date: [next_maintenance_date from item]
Assigned To: [item's assigned_to_id if exists]
Metadata: {
  inventoryItemId: "uuid",
  autoCreated: true,
  createdAt: "2025-11-13T06:00:00Z"
}
```

**Example Notification Created:**
```
Title: "Overdue Maintenance: Canon Camera EOS R5"
Message: "Maintenance for Canon Camera EOS R5 is 5 day(s) overdue. Please complete maintenance as soon as possible."
Type: maintenance_overdue
Priority: high
```

### 2. Consumable Stock Checks (`/api/cron/consumables`)

**Schedule:** 3x daily at 8:00 AM, 2:00 PM, 8:00 PM UTC
**Endpoint:** `/api/cron/consumables`

**Actions:**
- Monitors stock levels against category-defined thresholds
- Creates low stock alerts when quantity <= threshold
- Creates critical out-of-stock alerts when quantity = 0
- Calculates events remaining based on consumption rates
- Prevents duplicate notifications

**Example Low Stock Alert:**
```
Title: "Low Stock: Photo Paper"
Message: "Stock level for Photo Paper is low: 150 sheets remaining. Only enough for approximately 2 event(s). Please reorder soon."
Type: low_stock
Priority: medium
```

**Example Out of Stock Alert:**
```
Title: "OUT OF STOCK: Printer Ink"
Message: "Printer Ink is completely out of stock. Immediate reorder required!"
Type: out_of_stock
Priority: high
```

### 3. Notification Emails (`/api/cron/notifications`)

**Schedule:** Daily at 9:00 AM UTC
**Endpoint:** `/api/cron/notifications`

**Actions:**
- Finds all pending notifications with high/medium priority
- Sends email to assigned users or company default email
- Updates notification status to 'sent' with timestamp
- Limits to 50 notifications per tenant per run to avoid overwhelming email server

**Email Format:**
- Subject: `[HIGH] Overdue Maintenance: Canon Camera`
- Styled HTML with color-coded priority (red for high, yellow for medium)
- Includes notification details, due date, and tenant info
- Plain text fallback included

**Recipients:**
- If item is assigned to a user: user's email address
- Otherwise: `GMAIL_USER` environment variable

## Monitoring

### Check Automation Status

You can monitor automation status via GET endpoints:

**Maintenance Status:**
```bash
curl https://your-app.vercel.app/api/automation/maintenance \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Consumables Status:**
```bash
curl https://your-app.vercel.app/api/automation/consumables \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Response Example:**
```json
{
  "automation_status": "active",
  "items_due_soon": 3,
  "items_overdue": 1,
  "pending_notifications": 2,
  "last_check": "2025-11-13T10:00:00Z"
}
```

## Manual Trigger

You can manually trigger cron jobs for testing:

```bash
# Trigger maintenance automation
curl -X POST https://your-app.vercel.app/api/automation/maintenance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"tenantId": "your-tenant-id", "action": "all"}'

# Trigger consumable automation
curl -X POST https://your-app.vercel.app/api/automation/consumables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"tenantId": "your-tenant-id", "action": "all"}'
```

## Security

1. **CRON_SECRET**: All cron endpoints require Bearer token authentication
2. **Tenant Isolation**: Automation respects tenant boundaries
3. **Rate Limiting**: Notification emails limited to 50 per tenant per run
4. **Service Role Key**: Uses Supabase service role key for cross-tenant queries

## Troubleshooting

### Cron jobs not running

1. Check Vercel dashboard > Cron Jobs to see execution logs
2. Verify `CRON_SECRET` is set in Vercel environment variables
3. Check that vercel.json is committed to repository

### No notifications being sent

1. Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set
2. Check Gmail app password is valid (not regular password)
3. Review `/api/cron/notifications` logs in Vercel

### Duplicate tasks/notifications

- Automation includes duplicate prevention
- Tasks are only created if none exist for that item
- Notifications are only created if none exist with pending/sent status

### Items not triggering automation

1. Check `next_maintenance_date` is set on inventory items
2. Verify category has `requires_maintenance` = true
3. Ensure `maintenance_interval_days` is set on category or item
4. For consumables, verify `low_stock_threshold` is set on category

## Architecture

```
Vercel Cron Schedule
       ↓
/api/cron/maintenance
       ↓
Fetches all active tenants
       ↓
For each tenant:
  → /api/automation/maintenance
       ↓
    MaintenanceAutomation service
       ↓
    - Creates tasks (maintenance_history → tasks)
    - Creates notifications (inventory_notifications)
```

## Database Tables Involved

- `tenants` - Active tenant list
- `inventory_items` - Items with maintenance dates
- `equipment_categories` - Maintenance intervals, stock thresholds
- `consumable_inventory` - Stock levels
- `tasks` - Auto-created maintenance tasks
- `inventory_notifications` - Alerts for users
- `maintenance_history` - Completed maintenance records
- `consumable_usage` - Usage tracking

## Future Enhancements

- [ ] Configurable cron schedules per tenant
- [ ] Email digest option (batch notifications)
- [ ] SMS/Slack notification channels
- [ ] Predictive maintenance based on usage patterns
- [ ] Auto-reorder integration for consumables
- [ ] Custom notification templates
