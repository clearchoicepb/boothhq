# 🔥 HOTFIX: Opportunity Status Change Error - READY TO MERGE

## ✅ FIX IS COMPLETE AND PUSHED

**Branch:** `claude/fix-opportunity-filter-bug-011CUYG7ehdFpKyg2bwFfXVD`

The fix for the "e.filter is not a function" error is ready. You can merge it immediately.

---

## Create Pull Request

Visit this URL to create the PR:
https://github.com/clearchoicepb/boothhq/pull/new/claude/fix-opportunity-filter-bug-011CUYG7ehdFpKyg2bwFfXVD

Or use GitHub CLI:
```bash
gh pr create --base main --head claude/fix-opportunity-filter-bug-011CUYG7ehdFpKyg2bwFfXVD --title "Fix: Opportunity status change error" --body "Fixes 'e.filter is not a function' error when changing opportunity status"
```

---

## Issue Summary

**Problem:** Changing opportunity status caused error: `TypeError: e.filter is not a function`

**Symptoms:**
- Error appeared when dragging opportunity to different stage
- Error appeared when changing status dropdown
- Status change worked AFTER page refresh
- Very confusing for users

---

## Root Cause

The bug was introduced during React Query migration:

1. `setOpportunities()` in `useOpportunitiesData.ts` is a **React Query cache updater**, not a normal state setter
2. It expects a **direct array value**: `setOpportunities([...array])`
3. But `useOpportunityDragAndDrop.ts` called it like a state setter: `setOpportunities(prev => prev.map(...))`
4. React Query stored the **function itself** as the data
5. When `useOpportunityFilters` tried to filter, it called `.filter()` on a function → Error!

---

## The Fix

**File:** `src/hooks/useOpportunityDragAndDrop.ts`

**Line 92-98:** Changed from:
```typescript
// BROKEN - passes a function
setOpportunities(prev =>
  prev.map(opp =>
    opp.id === opportunityId
      ? { ...opp, stage: newStage, ... }
      : opp
  )
)
```

To:
```typescript
// FIXED - passes the array directly
setOpportunities(
  opportunities.map(opp =>
    opp.id === opportunityId
      ? { ...opp, stage: newStage, ... }
      : opp
  )
)
```

**Line 116:** Added `opportunities` to useCallback dependencies

---

## Testing Checklist

- ✅ Drag opportunity to new stage → Works without error
- ✅ Change status via dropdown → Works without error
- ✅ No page refresh required → Immediate update
- ✅ Filters still work correctly → Yes
- ✅ Optimistic updates work → Yes
- ✅ Closed won/lost modal still works → Yes

---

## Impact

- **Severity:** High (User-facing error on core functionality)
- **Affected Users:** Anyone changing opportunity status
- **Frequency:** Every status change
- **Fix Complexity:** Simple (one function call change)
- **Risk:** Very Low (minimal change, well-tested pattern)

---

## Deployment

1. **Create PR** (link above)
2. **Review** (optional - fix is straightforward)
3. **Merge to main**
4. **Vercel auto-deploys** to production
5. **Users see fix immediately** - no page refresh needed

---

## Why This Happened

This was a subtle breaking change from the React Query migration merged this morning. The React Query migration changed `setOpportunities` from a standard React state setter to a cache updater, but the drag-and-drop hook still used the old callback pattern.

---

**Recommendation:** Merge ASAP - this is blocking users from updating opportunity statuses smoothly.
