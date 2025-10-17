# Settings ↔ Opportunities Integration Audit - STEP 4

**Date:** October 17, 2025  
**Scope:** Test edge cases  
**Status:** Step 4 Complete - Edge Cases Analyzed

---

## STEP 4: TEST EDGE CASES

### 🧪 Edge Case Testing & Analysis

This step identifies potential issues and verifies how the system handles unusual or edge case scenarios.

---

## EDGE CASE #1: Deleted Stage with Active Opportunities

### Scenario:
1. User has opportunities in "Proposal" stage
2. User deletes "Proposal" stage from settings
3. What happens to existing opportunities?

### Current Behavior:

#### Database Constraint:
```sql
-- supabase/migrations/001_complete_schema.sql (line 147)
stage TEXT NOT NULL DEFAULT 'prospecting' 
CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'))
```

**Protection:** ✅ Database has CHECK constraint preventing invalid stages

#### Settings UI:
```typescript
// src/app/[tenant]/settings/opportunities/page.tsx (lines 127-136)
const removeStage = (stageId: string) => {
  if (settings.stages.length <= 2) {
    alert('You must have at least 2 stages');  // ← Prevents deleting too many
    return;
  }
  setSettings(prev => ({
    ...prev,
    stages: prev.stages.filter(stage => stage.id !== stageId)
  }));
};
```

**Protection:** ✅ Prevents deleting if ≤ 2 stages remain

### Issues Identified:

#### 🔴 **CRITICAL: No Check for Active Opportunities**

**Problem:**
User can delete a stage even if opportunities are using it!

**What Happens:**
1. User deletes "Proposal" stage
2. Settings save successfully ✅
3. Existing opportunities still have `stage = 'proposal'` ✅ (database allows it)
4. **BUT:** Stage no longer appears in dropdown when editing ❌
5. **AND:** Stage color/name falls back to defaults ⚠️

**Test Case:**
```
Given: 5 opportunities in "Proposal" stage
When: User deletes "Proposal" from settings
Then:
  - ✅ Database allows (CHECK constraint includes it)
  - ✅ Opportunities still show in pipeline (fallback color)
  - ❌ Can't move them to "Proposal" again (not in dropdown)
  - ⚠️ Shows default purple color instead of custom color
  - ⚠️ Shows "Proposal" name (fallback) instead of custom name
```

---

### Recommended Fix:

#### Option 1: Prevent Deletion (Safest)
```typescript
const removeStage = async (stageId: string) => {
  // Check if any opportunities use this stage
  const response = await fetch(`/api/opportunities?stage=${stageId}&limit=1`);
  const data = await response.json();
  
  if (data.items && data.items.length > 0) {
    toast.error(`Cannot delete: ${data.totalItems} opportunities are in this stage`);
    return;
  }
  
  // Proceed with deletion
  setSettings(prev => ({
    ...prev,
    stages: prev.stages.filter(stage => stage.id !== stageId)
  }));
};
```

#### Option 2: Disable Stage (Better UX)
```typescript
const disableStage = (stageId: string) => {
  // Just mark as disabled instead of deleting
  setSettings(prev => ({
    ...prev,
    stages: prev.stages.map(stage =>
      stage.id === stageId ? { ...stage, enabled: false } : stage
    )
  }));
  toast.success('Stage disabled. Existing opportunities preserved.');
};
```

**Recommendation:** ✅ **Use Option 2** (disable instead of delete)

---

## EDGE CASE #2: Probability = 0 or 100

### Scenario:
What happens with extreme probability values?

### Current Behavior:

#### Settings Allow 0-100:
```typescript
// src/app/[tenant]/settings/opportunities/page.tsx (lines 335-345)
<input
  type="number"
  min="0"      // ← Allows 0
  max="100"    // ← Allows 100
  value={stage.probability}
  onChange={(e) => updateStage(stage.id, 'probability', parseInt(e.target.value) || 0)}
/>
```

#### Weighted Calculation:
```typescript
// src/lib/opportunity-utils.ts (lines 44-51)
export function getWeightedValue(
  opportunity: OpportunityLike,
  settings?: OpportunitySettings
): number {
  const amount = opportunity.amount ?? 0
  const probability = getOpportunityProbability(opportunity, settings)
  return Math.round(amount * (probability / 100))
}
```

**Test Cases:**
```
Probability = 0:
  Amount: $10,000
  Weighted: $10,000 × (0 / 100) = $0
  Result: ✅ Works correctly

Probability = 100:
  Amount: $10,000
  Weighted: $10,000 × (100 / 100) = $10,000
  Result: ✅ Works correctly

Probability = 50:
  Amount: $10,000
  Weighted: $10,000 × (50 / 100) = $5,000
  Result: ✅ Works correctly
```

**Verdict:** ✅ **No Issues** - Math works correctly for all values 0-100

---

## EDGE CASE #3: Negative Probability

### Scenario:
What if someone manually sets negative probability?

### Current Behavior:

#### HTML Input Validation:
```typescript
<input
  type="number"
  min="0"      // ← Prevents negative in UI
  max="100"
  value={stage.probability}
/>
```

**Protection:** ✅ HTML prevents negative input

#### API Validation:
```typescript
// src/lib/api-entities.ts (lines 246-250)
probability: {
  type: 'number',
  min: 0,      // ← API validates >= 0
  max: 100     // ← API validates <= 100
}
```

**Protection:** ✅ API validates range

#### Calculation Safety:
```typescript
// src/lib/opportunity-utils.ts (line 38)
return stageConfig?.probability ?? opportunity.probability ?? 0
//                                                             ↑
//                                                    Defaults to 0
```

**Protection:** ✅ Defaults to 0 if missing

**Verdict:** ✅ **No Issues** - Multiple layers of validation

---

## EDGE CASE #4: Probability > 100

### Scenario:
What if someone manually sets probability > 100?

### Current Behavior:

#### Same Protections as Negative:
- ✅ HTML `max="100"` prevents in UI
- ✅ API validates `max: 100`
- ✅ No special handling needed

**Test Case:**
```javascript
// If someone bypasses UI and sends:
{ probability: 150 }

// API will reject:
Error: "probability must be <= 100"
```

**Verdict:** ✅ **No Issues** - Well protected

---

## EDGE CASE #5: Missing or Null Probability

### Scenario:
Opportunity has `probability: null` or undefined

### Current Behavior:

#### Calculation Handles Null:
```typescript
// src/lib/opportunity-utils.ts (lines 28-39)
export function getOpportunityProbability(
  opportunity: OpportunityLike,
  settings?: OpportunitySettings
): number {
  if (!settings?.autoCalculateProbability) {
    return opportunity.probability ?? 0  // ← Nullish coalescing
  }

  const stageConfig = settings.stages?.find(
    s => s.id === opportunity.stage
  )

  return stageConfig?.probability ?? opportunity.probability ?? 0
  //     ↑ Stage fallback    ↑ Opp fallback          ↑ Final fallback
}
```

**Test Cases:**
```
Scenario 1: Auto-calculate ON, stage has probability
  opportunity.probability = null
  stageConfig.probability = 50
  Result: 50 ✅

Scenario 2: Auto-calculate OFF, opportunity has probability
  opportunity.probability = 75
  Result: 75 ✅

Scenario 3: Auto-calculate OFF, opportunity probability null
  opportunity.probability = null
  Result: 0 ✅

Scenario 4: Everything null
  opportunity.probability = null
  stageConfig = undefined
  Result: 0 ✅
```

**Verdict:** ✅ **No Issues** - Excellent null handling with cascading fallbacks

---

## EDGE CASE #6: Stage Not in Settings

### Scenario:
Opportunity has a stage that doesn't exist in settings (e.g., old custom stage)

### Current Behavior:

#### Color Fallback:
```typescript
// src/lib/utils/stage-utils.ts (lines 43-69)
export function getStageColor(
  stageId: string,
  settings?: { opportunities?: OpportunitySettings }
): string {
  const stageConfig = settings?.opportunities?.stages?.find(
    (s: StageConfig) => s.id === stageId
  )
  
  if (stageConfig?.color && colorMap[stageConfig.color]) {
    return colorMap[stageConfig.color]  // ← Found in settings
  }
  
  // Fallback to defaults
  const defaultColors: Record<string, string> = {
    prospecting: colorMap.blue,
    qualification: colorMap.yellow,
    // ... standard stages
  }
  
  return defaultColors[stageId] || colorMap.gray  // ← Gray if unknown
}
```

**Test Cases:**
```
Known Stage (in settings):
  stage = 'prospecting'
  settings.stages has 'prospecting' with color 'purple'
  Result: Purple ✅

Known Stage (not in settings):
  stage = 'prospecting'
  settings.stages doesn't have 'prospecting'
  Result: Default blue ✅

Unknown Stage:
  stage = 'custom_stage_xyz'
  settings.stages doesn't have it
  Result: Gray (safe fallback) ✅
```

**Verdict:** ✅ **No Issues** - Graceful degradation with gray fallback

---

## EDGE CASE #7: Concurrent Settings Updates

### Scenario:
Two users update settings at the same time

### Current Behavior:

#### Database Level:
```sql
-- Table: tenant_settings
-- Primary Key: (tenant_id, setting_key)

-- Upsert operation:
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, updated_at)
VALUES (?, ?, ?, NOW())
ON CONFLICT (tenant_id, setting_key)
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = EXCLUDED.updated_at
```

**Protection:** ✅ Upsert ensures last write wins (atomic operation)

#### Application Level:
```typescript
// src/lib/settings-context.tsx (lines 65-96)
const updateSettings = async (newSettings: Record<string, any>) => {
  // 1. Read current settings
  const mergedSettings = deepMerge(settings, newSettings)
  
  // 2. Write to database
  await fetch('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ settings: mergedSettings })
  })
  
  // 3. Update local state
  setSettings(mergedSettings)
  
  // 4. Revalidate from database
  fetchSettings()  // ← Ensures consistency
}
```

**Test Scenario:**
```
Time 0s: User A reads settings (stages = [A, B, C])
Time 1s: User B reads settings (stages = [A, B, C])
Time 2s: User A saves (stages = [A, B, C, D])  ← Adds D
Time 3s: User B saves (stages = [A, B, E])     ← Replaces C with E

Result:
  Database: stages = [A, B, E]  ← User B's version (last write wins)
  User A sees: [A, B, E]        ← After revalidation
  User B sees: [A, B, E]        ← After revalidation
```

#### 🟡 **ISSUE: Lost Update Problem**

**Problem:**
User A's addition of "D" is lost when User B saves!

**Why:**
- Each user has their own local copy
- Deep merge only merges with their local copy
- No conflict detection
- Last write wins at database level

**Severity:** MEDIUM (rare scenario, only affects settings changes)

---

### Recommended Fix:

#### Option 1: Optimistic Locking
```typescript
// Add version field to tenant_settings
interface TenantSettings {
  tenant_id: string
  settings: object
  version: number  // ← Increment on each update
  updated_at: timestamp
}

// In updateSettings():
const currentVersion = settings._version || 0
const response = await fetch('/api/settings', {
  method: 'POST',
  body: JSON.stringify({ 
    settings: mergedSettings,
    expectedVersion: currentVersion 
  })
})

if (!response.ok) {
  const error = await response.json()
  if (error.code === 'VERSION_MISMATCH') {
    toast.error('Settings were updated by another user. Please refresh and try again.')
    fetchSettings()  // Reload fresh data
    return
  }
}
```

#### Option 2: Last-Modified Check
```typescript
// Check if settings changed since last fetch
const lastFetch = settingsFetchedAt
const response = await fetch('/api/settings', {
  headers: {
    'If-Unmodified-Since': lastFetch.toISOString()
  }
})

if (response.status === 412) {  // Precondition Failed
  toast.error('Settings changed. Refreshing...')
  fetchSettings()
  return
}
```

#### Option 3: Live Collaboration (Websockets)
```typescript
// Real-time updates via WebSocket/Supabase Realtime
supabase
  .channel('settings_changes')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'tenant_settings' },
    (payload) => {
      // Auto-refresh when settings change
      fetchSettings()
      toast.info('Settings updated by another user')
    }
  )
  .subscribe()
```

**Recommendation:** 🟡 **Low Priority**
- Concurrent settings changes are rare
- Only affects admin users
- Simple workaround: refresh page
- Can implement Option 1 (optimistic locking) if needed

---

## EDGE CASE #8: Empty Settings Object

### Scenario:
New tenant with no settings in database

### Current Behavior:

#### Settings Context Handles Empty:
```typescript
// src/lib/settings-context.tsx (line 39)
setSettings(data.settings || {})  // ← Defaults to empty object
```

#### Components Have Defaults:
```typescript
// src/lib/utils/stage-utils.ts (lines 53-63)
const stageConfig = settings?.opportunities?.stages?.find(...)
//                  ↑ Optional chaining prevents errors

if (stageConfig?.color && colorMap[stageConfig.color]) {
  return colorMap[stageConfig.color]
}

// Falls back to defaults
const defaultColors: Record<string, string> = {
  prospecting: colorMap.blue,
  // ... etc
}
```

#### Calculations Handle Empty:
```typescript
// src/lib/opportunity-utils.ts (line 29)
if (!settings?.autoCalculateProbability) {
//  ↑ Safe even if settings is undefined
  return opportunity.probability ?? 0
}
```

**Test Case:**
```
Given: New tenant, settings = {}
When: Load opportunities page
Then:
  - ✅ No crashes
  - ✅ Uses default stage colors
  - ✅ Uses formatted stage names
  - ✅ Uses opportunity's own probability
  - ✅ All calculations work
```

**Verdict:** ✅ **No Issues** - Excellent null safety throughout

---

## EDGE CASE #9: Malformed Settings Data

### Scenario:
Settings data corrupted or has wrong structure

### Current Behavior:

#### Type Safety:
```typescript
// src/lib/utils/stage-utils.ts (lines 12-17)
export interface StageConfig {
  id: string
  name: string
  probability: number
  color: string
  enabled: boolean
}
```

**Protection:** ✅ TypeScript provides compile-time type checking

#### Runtime Safety:
```typescript
// All access uses optional chaining and nullish coalescing
const stageConfig = settings?.opportunities?.stages?.find(...)
//                  ↑        ↑                ↑
//               Safe even if undefined at any level
```

**Test Cases:**
```
settings = null:
  Result: Uses defaults ✅

settings.opportunities = undefined:
  Result: Uses defaults ✅

settings.opportunities.stages = []  (empty array):
  Result: Uses defaults ✅

settings.opportunities.stages = "not an array":
  Result: .find() would error ❌
```

#### 🟡 **ISSUE: No Type Validation at Runtime**

**Problem:**
If database contains malformed JSON, TypeScript can't help at runtime

**Example:**
```json
{
  "opportunities": {
    "stages": "this should be an array"
  }
}
```

**Current Behavior:**
```typescript
settings.opportunities.stages.find(...)  // ← TypeError: stages.find is not a function
```

---

### Recommended Fix:

#### Add Runtime Validation:
```typescript
// src/lib/settings-context.tsx
const validateSettings = (data: any): Record<string, any> => {
  // Ensure opportunities.stages is an array
  if (data.opportunities && !Array.isArray(data.opportunities.stages)) {
    console.warn('Invalid stages format, using defaults')
    data.opportunities.stages = []
  }
  
  // Validate each stage has required fields
  if (data.opportunities?.stages) {
    data.opportunities.stages = data.opportunities.stages.filter((stage: any) => {
      return stage && 
             typeof stage.id === 'string' &&
             typeof stage.name === 'string' &&
             typeof stage.probability === 'number'
    })
  }
  
  return data
}

// In fetchSettings():
const data = await response.json()
setSettings(validateSettings(data.settings || {}))
```

**Recommendation:** 🟡 **Medium Priority** - Add validation to prevent runtime errors

---

## EDGE CASE #10: Database CHECK Constraint Mismatch

### Scenario:
Database allows stages that settings doesn't have

### Current State:

#### Database Constraint:
```sql
CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'))
```

#### Settings Default:
```typescript
stages: [
  { id: 'prospecting', ... },
  { id: 'qualification', ... },
  { id: 'proposal', ... },
  { id: 'negotiation', ... },
  { id: 'closed_won', ... },
  { id: 'closed_lost', ... }
]
```

**Alignment:** ✅ **Perfect Match** - Both have same 6 stages

#### 🟡 **ISSUE: Adding Custom Stages**

**Problem:**
User can add custom stage in settings, but database rejects it!

**Test Case:**
```
1. User adds "Contract Review" stage in settings
2. Saves successfully ✅
3. User tries to create opportunity with "Contract Review" stage
4. Database: ERROR: new row for relation "opportunities" violates 
              check constraint "opportunities_stage_check"
```

**Current Workaround:**
Settings UI only allows modifying the 6 default stages, not adding new ones... 

**Wait, let me check:**
```typescript
// src/app/[tenant]/settings/opportunities/page.tsx (lines 113-125)
const addStage = () => {
  const newStage = {
    id: `stage_${Date.now()}`,  // ← Creates custom stage ID!
    name: 'New Stage',
    probability: 50,
    color: 'gray',
    enabled: true
  };
  setSettings(prev => ({
    ...prev,
    stages: [...prev.stages, newStage]
  }));
};
```

#### 🔴 **CRITICAL: Settings Allow Adding Stages, Database Rejects Them!**

**Problem:**
1. Settings UI has "Add Stage" button ✅
2. User adds "Contract Review" stage ✅
3. Saves to database successfully ✅
4. **BUT:** Can't actually use it because database CHECK constraint rejects it ❌

**Severity:** HIGH - Broken feature

---

### Recommended Fix:

#### Option 1: Remove "Add Stage" Feature
```typescript
// Hide the button or disable it
<button onClick={addStage} disabled title="Custom stages coming soon">
  Add Stage
</button>
```

#### Option 2: Make Database Constraint Dynamic
```sql
-- Remove CHECK constraint
ALTER TABLE opportunities 
DROP CONSTRAINT opportunities_stage_check;

-- Now any stage value is allowed
-- Validation happens at application level instead
```

#### Option 3: Keep Constraint, Add Validation
```typescript
const addStage = () => {
  toast.error('Custom stages not yet supported. Please use default stages.');
  return;
  
  // Future: Remove CHECK constraint before enabling this
  // const newStage = { ... }
};
```

**Recommendation:** 🔴 **High Priority**
- **Immediate:** Disable "Add Stage" button (Option 3)
- **Future:** Remove CHECK constraint and implement proper validation (Option 2)

---

## EDGE CASE SUMMARY

| Edge Case | Severity | Current Behavior | Recommendation |
|-----------|----------|------------------|----------------|
| **#1: Deleted Stage** | 🔴 HIGH | Can delete, breaks dropdown | Disable instead of delete |
| **#2: Probability 0/100** | ✅ SAFE | Works correctly | No action needed |
| **#3: Negative Probability** | ✅ SAFE | Multiple validations | No action needed |
| **#4: Probability > 100** | ✅ SAFE | Multiple validations | No action needed |
| **#5: Null Probability** | ✅ SAFE | Cascading fallbacks | No action needed |
| **#6: Unknown Stage** | ✅ SAFE | Gray fallback | No action needed |
| **#7: Concurrent Updates** | 🟡 MEDIUM | Last write wins | Add optimistic locking |
| **#8: Empty Settings** | ✅ SAFE | Uses defaults | No action needed |
| **#9: Malformed Data** | 🟡 MEDIUM | Type errors possible | Add runtime validation |
| **#10: Custom Stages** | 🔴 HIGH | UI allows, DB rejects | Disable Add Stage button |

---

## CRITICAL ISSUES TO FIX

### 1. 🔴 **Custom Stages Broken**
- **Impact:** HIGH - Users can't actually use custom stages
- **Fix:** Disable "Add Stage" button immediately
- **Code:** `src/app/[tenant]/settings/opportunities/page.tsx` (line 310)

### 2. 🔴 **No Protection for Deleting Active Stages**
- **Impact:** MEDIUM - Can orphan opportunities
- **Fix:** Change delete to disable
- **Code:** `src/app/[tenant]/settings/opportunities/page.tsx` (line 127)

### 3. 🟡 **Concurrent Update Conflicts**
- **Impact:** LOW - Rare scenario
- **Fix:** Add version field or last-modified check
- **Code:** `src/lib/settings-context.tsx` (line 65)

### 4. 🟡 **No Runtime Validation**
- **Impact:** LOW - Could cause crashes with bad data
- **Fix:** Add `validateSettings()` function
- **Code:** `src/lib/settings-context.tsx` (line 26)

---

## STEP 4 SUMMARY

### ✅ What Works Well:
1. Probability calculations (0, 100, null, negative all handled)
2. Unknown stage fallbacks (graceful degradation)
3. Empty settings handling (excellent null safety)
4. Database validation (API + HTML validation layers)
5. Type safety (TypeScript throughout)

### 🔴 Critical Issues:
1. Custom stages UI is broken (DB constraint prevents usage)
2. Can delete stages without checking for active opportunities

### 🟡 Medium Issues:
1. Concurrent updates can cause lost data
2. Malformed data could cause runtime errors

### 🟢 Low Priority:
1. Manual refresh required (known limitation)
2. No cross-tab sync (future enhancement)

---

## Next: Step 5

**Final Documentation and Recommendations**
- Consolidate all findings
- Prioritize fixes
- Create implementation plan
- Document best practices

**Should I proceed to Step 5?**

---

*End of Step 4 Report*

