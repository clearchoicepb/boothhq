# Week 1 Component Testing Checklist

## Components to Test

### ✅ OpportunityStatsCard
- [ ] Total Opportunities card displays correctly
- [ ] Total Value card displays correctly with $ formatting
- [ ] Open Opportunities card displays correctly
- [ ] Cards switch between Total and Expected mode
- [ ] Subtitle changes based on calculation mode

### ✅ OpportunityCalculationModeToggle
- [ ] Toggle buttons render correctly
- [ ] "Total" button activates on click
- [ ] "Expected Value" button activates on click
- [ ] Active button has blue background
- [ ] Inactive button has gray background
- [ ] Settings info displays when in Expected mode

### ✅ OpportunityEmptyState
- [ ] Shows "No opportunities yet" when no data and no filters
- [ ] Shows "No opportunities found" when filters are active
- [ ] "Create First Opportunity" button shows when no filters
- [ ] "Clear all filters" button shows when filters active
- [ ] Search filter chip displays and can be cleared
- [ ] Stage filter chip displays and can be cleared
- [ ] Owner filter chip displays and can be cleared
- [ ] Clicking "Clear all filters" removes all filters
- [ ] Icon changes between Target (no filters) and Search (with filters)
- [ ] Works in both mobile and desktop views

### ✅ OpportunitySuccessAnimation
- [ ] Animation appears when opportunity is won
- [ ] Animation appears when opportunity is lost
- [ ] Won animation shows green thumbs up
- [ ] Lost animation shows red thumbs down
- [ ] Animation bounces correctly
- [ ] Animation disappears after timeout

## Test Scenarios

### Scenario 1: Fresh Dashboard
1. Navigate to `/[tenant]/opportunities`
2. **Expected:**
   - Stats cards show 0 opportunities
   - Empty state shows "No opportunities yet"
   - "Create First Opportunity" button visible

### Scenario 2: With Data
1. Navigate to dashboard with opportunities
2. **Expected:**
   - Stats cards show correct numbers
   - All opportunities visible in table/cards
   - No empty state

### Scenario 3: Filtering
1. Apply search filter
2. **Expected:**
   - Filtered results show
   - If no results, empty state shows "No opportunities found"
   - Filter chips appear
3. Apply stage filter
4. **Expected:**
   - Additional filter chip appears
5. Apply owner filter
6. **Expected:**
   - Third filter chip appears
7. Click "Clear all filters"
8. **Expected:**
   - All filters removed
   - Full list restored

### Scenario 4: Calculation Modes
1. Click "Expected Value" button
2. **Expected:**
   - Stats cards update to show expected values
   - Open opportunities calculation changes
   - Subtitle shows probability info
3. Click "Total" button
4. **Expected:**
   - Stats cards return to total values

### Scenario 5: Drag and Drop (Pipeline View)
1. Switch to pipeline view
2. Drag opportunity to "Closed Won"
3. Close the modal that appears
4. **Expected:**
   - Green thumbs up animation appears
   - "Opportunity Won!" text displays
5. Drag another to "Closed Lost"
6. **Expected:**
   - Red thumbs down animation appears
   - "Opportunity Lost" text displays

### Scenario 6: Mobile View
1. Resize browser to mobile width (<768px)
2. **Expected:**
   - Stats cards stack vertically
   - Empty state still works
   - Filter chips wrap correctly

## Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Performance Checks

- [ ] No console errors
- [ ] No console warnings
- [ ] Components render quickly (<100ms)
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts during load

## Visual Regression

**Critical:** UI should look EXACTLY the same as before refactoring!

- [ ] Stats cards - same styling
- [ ] Toggle buttons - same styling
- [ ] Empty state - same styling
- [ ] Animations - same styling
- [ ] Filter chips - same styling
- [ ] Spacing/padding - unchanged
- [ ] Colors - unchanged
- [ ] Fonts - unchanged

## Code Quality

- [x] No TypeScript errors in opportunities components
- [x] Only minor linter warnings (unused vars)
- [x] All components have JSDoc comments
- [x] Props are properly typed
- [x] Components are exported correctly

## Accessibility

- [ ] Buttons have proper aria-labels
- [ ] Filter clear buttons are keyboard accessible
- [ ] Toggle buttons work with keyboard (Tab + Enter/Space)
- [ ] Empty state text is readable
- [ ] Color contrast meets WCAG AA standards

## Edge Cases

- [ ] 0 opportunities
- [ ] 1 opportunity
- [ ] 1000+ opportunities
- [ ] Very long opportunity names
- [ ] Missing data (null values)
- [ ] All filters applied at once
- [ ] Rapid toggle switching
- [ ] Rapid animation triggers

---

## ✅ Quick Smoke Test

**Minimum tests before marking complete:**

1. ✅ Load opportunities page - no errors
2. ✅ Stats cards display correctly
3. ✅ Toggle between Total/Expected - works
4. ✅ Empty state shows when no data
5. ✅ Filter chips work
6. ✅ "Clear all filters" works
7. ✅ Pipeline drag-and-drop animation works
8. ✅ Mobile view works

---

## 🐛 Known Issues

*(List any issues found during testing)*

- None yet!

---

## 📸 Screenshots

*(Optional: Capture screenshots of key components for documentation)*

- Stats cards in Total mode
- Stats cards in Expected mode
- Empty state (no filters)
- Empty state (with filters)
- Won animation
- Lost animation

---

## Sign-off

**Tester:** _______________  
**Date:** _______________  
**Status:** ⏳ Pending / ✅ Passed / ❌ Failed

**Notes:**

---

