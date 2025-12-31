# Codebase Cleanup Audit Report

**Date:** 2025-12-31
**Status:** Research Complete - No Deletions Made

---

## 1. TASK COMPONENTS

| File Path | Purpose | Used In | Recommendation |
|-----------|---------|---------|----------------|
| `src/components/create-task-modal.tsx` | Full-featured modal for creating tasks with entity linking, assignee selection, due dates | Events page, Opportunities page, Projects page | **KEEP** - Primary task creation modal |
| `src/components/dashboards/add-task-modal.tsx` | Simplified quick-add modal for dashboards | unified-task-dashboard.tsx, design-dashboard.tsx, my-tasks-dashboard.tsx, my-tasks page | **KEEP** - Dashboard-specific modal |
| `src/components/task-detail-modal.tsx` | View/edit task details with subtasks and notes | tasks-section.tsx, my-tasks page | **KEEP** - Primary task detail view |
| `src/components/tasks-section.tsx` | Reusable task list component for entity pages | OpportunityTasksTab, EventPlanningTab, projects page | **KEEP** - Core task list component |
| `src/components/subtask-list.tsx` | Subtask management within tasks | task-detail-modal.tsx | **KEEP** - Active subtask feature |
| `src/components/task-notes.tsx` | Task notes/comments component | task-detail-modal.tsx | **KEEP** - Active notes feature |
| `src/components/events/event-inline-tasks.tsx` | Compact inline task display for event lists | events page.tsx | **KEEP** - Active in events list |
| `src/components/task-templates/task-template-form.tsx` | Form for creating/editing task templates | settings/task-templates page | **KEEP** - Settings feature |
| `src/components/opportunities/task-indicator.tsx` | Task completion indicator badge | opportunity components | **KEEP** - UI indicator |
| `src/components/opportunities/detail/tabs/OpportunityTasksTab.tsx` | Tasks tab in opportunity detail | opportunity detail page | **KEEP** - Active tab |

### Task Component Notes:
- `CreateTaskModal` and `AddTaskModal` are **NOT duplicates** - they serve different purposes:
  - `CreateTaskModal`: Full-featured, used in entity detail pages
  - `AddTaskModal`: Simplified, used in dashboards for quick task creation
- There's a **duplicate TaskDetailModal** defined inside `unified-task-dashboard.tsx` (lines 765-908) that duplicates functionality from the standalone `task-detail-modal.tsx`

---

## 2. DASHBOARDS

| File Path | Purpose | Actively Used? | Recommendation |
|-----------|---------|----------------|----------------|
| `src/components/dashboard/kpi-cards.tsx` | KPI cards for main dashboard | Yes - main dashboard page | **KEEP** |
| `src/components/dashboard/weekly-events-table.tsx` | Weekly events table | Yes - main dashboard page | **KEEP** |
| `src/components/dashboard/kpi-drilldown-modal.tsx` | Drilldown modal for KPI details | Yes - kpi-cards.tsx | **KEEP** |
| `src/components/dashboards/unified-task-dashboard.tsx` | Universal department task dashboard | Yes - 6 department dashboard pages | **KEEP** |
| `src/components/dashboards/design-dashboard.tsx` | Design team specific dashboard | Yes - /dashboard/design page | **KEEP** |
| `src/components/dashboards/add-task-modal.tsx` | Quick add task modal | Yes - multiple dashboards | **KEEP** |
| `src/components/dashboards/my-tasks-dashboard.tsx` | Personal task dashboard component | **NO** - NOT IMPORTED ANYWHERE | **REMOVE** |
| `src/components/dashboard/stats-dashboard.tsx` | Stats dashboard with trends | **NO** - NOT IMPORTED ANYWHERE | **REMOVE** |
| `src/components/dashboard-stats.tsx` | Grid-based dashboard stats | **NO** - NOT IMPORTED ANYWHERE | **REMOVE** |
| `src/components/maintenance/maintenance-dashboard.tsx` | Equipment maintenance dashboard | Yes - maintenance page | **KEEP** |
| `src/components/inventory/weekend-prep-dashboard.tsx` | Weekend prep inventory view | Yes - inventory page | **KEEP** |

### Dashboard Notes:
- **MyTasksDashboard** (`src/components/dashboards/my-tasks-dashboard.tsx`) is ORPHANED. The actual my-tasks page (`src/app/[tenant]/dashboard/my-tasks/page.tsx`) has its own implementation and does NOT import this component.
- **StatsDashboard** (`src/components/dashboard/stats-dashboard.tsx`) appears to be an older version replaced by KPI cards.
- **DashboardStats** (`src/components/dashboard-stats.tsx`) appears to be legacy, replaced by newer dashboard components.

### Department Dashboard Pages (All Active):
| Route | Status | Uses Component |
|-------|--------|----------------|
| `/dashboard` | Active | KPICardsSection, WeeklyEventsTable |
| `/dashboard/my-tasks` | Active | Custom implementation (NOT MyTasksDashboard) |
| `/dashboard/design` | Active | DesignDashboard |
| `/dashboard/sales` | Active | UnifiedTaskDashboard |
| `/dashboard/operations` | Active | UnifiedTaskDashboard |
| `/dashboard/customer-success` | Active | UnifiedTaskDashboard |
| `/dashboard/accounting` | Active | UnifiedTaskDashboard |
| `/dashboard/admin` | Active | UnifiedTaskDashboard |
| `/dashboard/tasks` | Active | UnifiedTaskDashboard |

---

## 3. BACKUP/OLD FILES

| File Path | Type | Recommendation |
|-----------|------|----------------|
| `src/app/[tenant]/inventory/page-old-backup.tsx` | Backup file with `-old-backup` suffix | **REMOVE** |

---

## 4. POTENTIALLY ORPHANED COMPONENTS

Components defined but never imported anywhere in the codebase:

| File Path | Component Name | Purpose | Recommendation |
|-----------|----------------|---------|----------------|
| `src/components/dashboards/my-tasks-dashboard.tsx` | MyTasksDashboard | Personal task dashboard | **REMOVE** - Replaced by page implementation |
| `src/components/dashboard/stats-dashboard.tsx` | StatsDashboard | Statistics dashboard | **REMOVE** - Replaced by KPI cards |
| `src/components/dashboard-stats.tsx` | DashboardStats | Dashboard statistics grid | **REMOVE** - Legacy component |
| `src/components/navigation.tsx` | Navigation | Legacy top navigation | **REVIEW** - Uses old "CRM App" branding, may be legacy |
| `src/components/lead-form.tsx` | LeadForm | Lead creation form | **REMOVE** - Replaced by lead-form-sequential.tsx |
| `src/components/invoice-form.tsx` | InvoiceForm | Invoice form wrapper | **REMOVE** - Appears unused |
| `src/components/contact-form.tsx` | ContactForm | Standalone contact form | **REMOVE** - Replaced by forms/ContactForm.tsx |
| `src/components/enhanced-search.tsx` | EnhancedSearch | Advanced search component | **REMOVE** - Replaced by global-search.tsx |
| `src/components/customer-selection.tsx` | CustomerSelection | Customer selector modal | **REMOVE** - Appears unused |
| `src/components/inline-lead-select.tsx` | InlineLeadSelect | Inline lead selector | **REMOVE** - Appears unused |
| `src/components/bulk-operations.tsx` | BulkOperations | Bulk entity operations | **REVIEW** - May be planned feature |
| `src/components/opportunity-pricing.tsx` | OpportunityPricing | Opportunity pricing component | **REMOVE** - Replaced by pricing tab |

---

## 5. UNUSED/UNLISTED PAGE ROUTES

Routes that exist but are NOT linked in main navigation (sidebar/top-nav):

### Developer/Debug Pages (Consider Removing for Production):
| Route | Purpose |
|-------|---------|
| `/debug/performance` | Performance debugging |
| `/demo-api` | API demonstration |
| `/demo-forms` | Form demonstration |
| `/demo-repository` | Repository pattern demo |
| `/test-services` | Service testing |

### Feature Pages Not in Primary Navigation:
| Route | Status | Notes |
|-------|--------|-------|
| `/booths` | Active | Equipment/booth management - may need nav link |
| `/calendar` | Active | Calendar view - may need nav link |
| `/locations` | Active | Location management - may need nav link |
| `/maintenance` | Active | Equipment maintenance - may need nav link |
| `/projects` | Active | Linked from top-nav |
| `/quotes` | Active | Linked from opportunity details |
| `/contracts/[id]/sign` | Active | Document signing flow |

### Settings Sub-pages (All accessible via /settings):
All settings pages are properly nested under `/settings` and accessible through the settings UI.

---

## 6. SUMMARY

### Counts:
| Category | Count |
|----------|-------|
| Task Components | 10 files (all KEEP) |
| Dashboard Components | 11 files (3 REMOVE) |
| Backup Files | 1 file (REMOVE) |
| Orphaned Components | 12 files (10 REMOVE, 2 REVIEW) |
| Developer/Debug Pages | 5 routes (consider removing for production) |

### Immediate Cleanup Recommendations:

**Files Safe to Remove (15 files):**
1. `src/app/[tenant]/inventory/page-old-backup.tsx` - Backup file
2. `src/components/dashboards/my-tasks-dashboard.tsx` - Orphaned, replaced
3. `src/components/dashboard/stats-dashboard.tsx` - Orphaned, replaced
4. `src/components/dashboard-stats.tsx` - Orphaned, legacy
5. `src/components/lead-form.tsx` - Orphaned, replaced by sequential version
6. `src/components/invoice-form.tsx` - Orphaned
7. `src/components/contact-form.tsx` - Orphaned, replaced by forms/ContactForm.tsx
8. `src/components/enhanced-search.tsx` - Orphaned, replaced by global-search.tsx
9. `src/components/customer-selection.tsx` - Orphaned
10. `src/components/inline-lead-select.tsx` - Orphaned
11. `src/components/opportunity-pricing.tsx` - Orphaned

**Files to Review Before Removing (2 files):**
1. `src/components/navigation.tsx` - May be legacy but grep shows some usage
2. `src/components/bulk-operations.tsx` - May be planned feature

**Code to Review (Not File Removal):**
- Duplicate `TaskDetailModal` inside `unified-task-dashboard.tsx` (lines 765-908) duplicates standalone component

### Production Cleanup Recommendations:
Consider removing or access-restricting these debug/demo routes:
- `/debug/*`
- `/demo-*`
- `/test-services`

---

## Next Steps

1. Confirm this audit with the team
2. Create backup branch before deletions
3. Remove confirmed orphaned files
4. Run build and tests after cleanup
5. Consider adding missing navigation links (booths, calendar, locations, maintenance)
