# Settings ↔ Opportunities Integration Audit Report

**Date:** October 17, 2025  
**Scope:** Post-refactoring integration verification  
**Status:** Step 1 Complete - Issues Identified

---

## STEP 1: VERIFY EXISTING FIX

### ✅ What Works Correctly

#### 1.1 **Settings Save to Database** ✅
**Status:** WORKING CORRECTLY

**Data Flow:**
```
Settings UI → updateSettings() → deepMerge() → API POST /api/settings → Database
```

**Evidence:**
- Settings page (`src/app/[tenant]/settings/opportunities/page.tsx`) correctly calls `updateSettings()`
- Deep merge implemented (`src/lib/settings-context.tsx` lines 48-63)
- API properly flattens nested objects into `tenant_settings` table rows
- Uses `upsert` with conflict resolution on `tenant_id,setting_key`

**Code Path:**
```typescript
// Settings Page (line 155-158)
await updateSettings({
  ...globalSettings,
  opportunities: settings  // Sends FULL merged settings
});

// Settings Context (lines 70-79)
const mergedSettings = deepMerge(settings, newSettings)
await fetch('/api/settings', {
  method: 'POST',
  body: JSON.stringify({ settings: mergedSettings })
})

// API Route (lines 94-99)
await supabase
  .from('tenant_settings')
  .upsert(settingsArray, {
    onConflict: 'tenant_id,setting_key'
  })
```

**Verification:** ✅ Settings ARE being saved correctly to the database

---

#### 1.2 **Opportunities Page Reads Settings** ✅
**Status:** WORKING CORRECTLY

**Data Flow:**
```
Opportunities Page → useSettings() → settings object → useOpportunityCalculations()
```

**Evidence:**
- Opportunities page imports `useSettings()` hook (line 41)
- Passes settings to `useOpportunityCalculations()` hook (line 104)
- Hook accesses `settings.opportunities` (line 50)
- Uses `getWeightedValue(opp, settings.opportunities)` (line 46)

**Code Path:**
```typescript
// Opportunities Page (line 41)
const { settings, updateSettings } = useSettings()

// Opportunities Page (line 99-104)
const {
  calculationMode,
  setCalculationMode,
  currentStats,
  openOpportunities,
} = useOpportunityCalculations(opportunities, settings)  // ← Settings passed here

// useOpportunityCalculations Hook (line 46)
return sum + getWeightedValue(opp, settings.opportunities)  // ← Reads settings.opportunities

// opportunity-utils.ts (lines 24-39)
export function getOpportunityProbability(
  opportunity: OpportunityLike,
  settings?: OpportunitySettings
): number {
  if (!settings?.autoCalculateProbability) {
    return opportunity.probability ?? 0
  }
  
  const stageConfig = settings.stages?.find(
    s => s.id === opportunity.stage
  )
  
  return stageConfig?.probability ?? opportunity.probability ?? 0
}
```

**Verification:** ✅ Opportunities ARE reading from settings correctly

---

### 🟡 ISSUES IDENTIFIED

#### Issue #1: **Cache Invalidation Problem** 🔴 **CRITICAL**
**Severity:** HIGH  
**Impact:** Settings changes don't appear immediately without page refresh

**Root Cause:**
The Settings API GET endpoint has aggressive caching headers:

```typescript
// src/app/api/settings/route.ts (line 46)
response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
```

**Problem:**
1. User changes settings in `/settings/opportunities`
2. Settings context calls `fetchSettings()` to revalidate (line 90)
3. BUT the API response is cached for 5 minutes (300 seconds)
4. Opportunities page continues using stale cached settings
5. User must manually refresh the page to see changes

**Evidence:**
```typescript
// Settings Context (lines 87-90)
setSettings(mergedSettings)  // Updates local state

// Optionally re-validate from server in background to ensure consistency
fetchSettings()  // ← This is blocked by cache!
```

**Test Scenario:**
1. Open opportunities page
2. Open settings page in new tab
3. Change stage probability from 50% to 75%
4. Save settings
5. Return to opportunities tab
6. **Expected Value calculation still uses 50%** ❌
7. Hard refresh (Cmd+Shift+R) → Now shows 75% ✅

**Why This Matters:**
- Users think settings aren't working
- Weighted values show incorrect amounts
- Stage probabilities don't update in real-time
- Creates confusion and support tickets

---

#### Issue #2: **No Cross-Tab Communication** 🟡 **MEDIUM**
**Severity:** MEDIUM  
**Impact:** Multiple tabs/windows don't sync settings changes

**Problem:**
If a user has opportunities open in multiple tabs:
1. Tab A: Opportunities page (showing old values)
2. Tab B: Settings page (user changes stage probabilities)
3. Tab A: Still shows old probabilities until page refresh

**Current Behavior:**
- Each tab has its own isolated `SettingsContext`
- No `BroadcastChannel` or storage event listener
- No real-time sync mechanism

**Recommended Solution:**
- Implement `BroadcastChannel` API for cross-tab communication
- OR use `localStorage` events to notify other tabs
- OR implement WebSocket for real-time updates

---

#### Issue #3: **Re-fetch on Focus Not Implemented** 🟡 **MEDIUM**
**Severity:** MEDIUM  
**Impact:** Stale data when switching between apps

**Problem:**
User workflow:
1. Opens opportunities page
2. Switches to different app/browser
3. Another user changes settings
4. User returns to opportunities page
5. Still sees old settings (no refetch on window focus)

**Missing:**
```typescript
// Settings Context - Should have:
useEffect(() => {
  const handleFocus = () => {
    fetchSettings()
  }
  
  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [])
```

---

#### Issue #4: **Stale-While-Revalidate Too Aggressive** 🟡 **MEDIUM**
**Severity:** MEDIUM  
**Impact:** Browser continues serving stale data for 10 minutes

**Current Cache Headers:**
```typescript
'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
```

**Translation:**
- `s-maxage=300` → Cache for 5 minutes (server-side)
- `stale-while-revalidate=600` → Serve stale data for up to 10 minutes while revalidating

**Problem:**
Settings changes are not time-sensitive enough to warrant 10 minutes of stale data tolerance.

**Recommendation:**
```typescript
'Cache-Control': 'private, no-cache, must-revalidate'
// OR at most:
'Cache-Control': 'private, max-age=30'  // 30 seconds
```

**Why?**
- Settings don't change frequently
- When they DO change, users expect immediate updates
- Private data (tenant-specific, should not be in CDN cache)

---

### 🟢 What Was Fixed Previously

#### Fix #1: **Deep Merge Implementation** ✅
**Before:** Shallow merge caused partial settings overwrites  
**After:** Deep merge preserves all nested settings  
**Status:** WORKING CORRECTLY

#### Fix #2: **Settings Passed to Calculations** ✅
**Before:** Calculations used hardcoded probabilities  
**After:** Calculations use dynamic settings from context  
**Status:** WORKING CORRECTLY

#### Fix #3: **Revalidation After Save** ✅
**Before:** No revalidation after saving  
**After:** Calls `fetchSettings()` after successful save  
**Status:** IMPLEMENTED (but blocked by cache - see Issue #1)

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    SETTINGS WRITE PATH                       │
└─────────────────────────────────────────────────────────────┘

Settings UI
  │
  ├─ User edits stages/probabilities
  ├─ Clicks "Save Settings"
  │
  ▼
updateSettings({ opportunities: { stages: [...] } })
  │
  ├─ Deep merge with current settings
  ├─ POST /api/settings
  │
  ▼
Settings API Route
  │
  ├─ Flatten nested object
  ├─ Convert to key-value pairs
  ├─ UPSERT into tenant_settings
  │
  ▼
PostgreSQL Database
  │
  └─ tenant_settings table
     └─ opportunities.stages[0].probability = 75


┌─────────────────────────────────────────────────────────────┐
│                    SETTINGS READ PATH                        │
└─────────────────────────────────────────────────────────────┘

Opportunities Page Load
  │
  ▼
useSettings() Hook
  │
  ├─ GET /api/settings
  │   ├─ ⚠️ CACHE: 5min + 10min stale (ISSUE #1)
  │   │
  │   ▼
  │   Settings API Route
  │   │
  │   ├─ SELECT from tenant_settings
  │   ├─ Build nested object
  │   ├─ Return { opportunities: { stages: [...] } }
  │   │
  │   ▼
  │   SettingsContext
  │   └─ Stores in React state
  │
  ▼
useOpportunityCalculations(opportunities, settings)
  │
  ├─ For each opportunity:
  │   └─ getWeightedValue(opp, settings.opportunities)
  │       │
  │       ├─ Get probability from settings.opportunities.stages
  │       ├─ Calculate: amount × (probability / 100)
  │       │
  │       ▼
  │       Weighted Value
  │
  ▼
Display in UI
```

---

## STEP 1 SUMMARY

### ✅ Verified Working:
1. Settings save to database correctly
2. Settings read from database correctly
3. Deep merge preserves all settings
4. Opportunities page receives settings
5. Weighted calculations use settings
6. Stage probabilities apply correctly

### 🔴 Critical Issues:
1. **Cache prevents immediate updates** (300s cache + 600s stale)
2. Settings changes require page refresh to see

### 🟡 Medium Issues:
1. No cross-tab communication
2. No refetch on window focus
3. Cache policy too aggressive for settings

### 🟢 Recommendations:
1. **URGENT:** Remove or drastically reduce cache headers on GET /api/settings
2. **HIGH:** Implement cache busting after POST (add timestamp query param)
3. **MEDIUM:** Add BroadcastChannel for cross-tab sync
4. **MEDIUM:** Add window focus refetch
5. **LOW:** Add loading indicator when refetching

---

## NEXT STEPS

**Ready to proceed to Step 2:** Check for other integration issues

**Before proceeding, should we:**
1. ❓ Fix Issue #1 (cache) immediately? (High priority)
2. ❓ Continue audit and fix all issues together?
3. ❓ Document all issues first, then prioritize fixes?

**Your call!**

---

*End of Step 1 Report*

