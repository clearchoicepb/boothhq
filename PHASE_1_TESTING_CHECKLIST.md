# Phase 1 Refactoring - Testing Checklist

## 🧪 How to Test

Navigate to: **http://localhost:3000/default/opportunities**

---

## ✅ Core Functionality Tests

### 1. **Page Load** 
- [ ] Page loads without errors
- [ ] Loading spinner appears initially
- [ ] Opportunities display correctly
- [ ] No console errors in browser DevTools

### 2. **Data Fetching & Pagination**
- [ ] Opportunities load from API
- [ ] Pagination controls appear at bottom
- [ ] Can navigate between pages
- [ ] Page numbers update correctly
- [ ] Scroll to top works when changing pages

### 3. **Search Functionality**
- [ ] Search bar is visible
- [ ] Can type in search field
- [ ] Results filter as you type
- [ ] Search works for opportunity name
- [ ] Search works for account name
- [ ] Search works for contact name
- [ ] Clearing search shows all results

### 4. **Stage Filter**
- [ ] Stage dropdown is visible
- [ ] Can select "All Stages"
- [ ] Can filter by specific stage (Prospecting, Qualification, etc.)
- [ ] Opportunities filter correctly
- [ ] Count updates when filtered

### 5. **Owner Filter**
- [ ] Owner dropdown is visible
- [ ] Shows "All Owners" option
- [ ] Shows "Unassigned" option
- [ ] Shows list of team members
- [ ] Filtering by owner works
- [ ] Count updates when filtered

### 6. **Date Filters**
- [ ] Date filter dropdown visible
- [ ] Can select date ranges (Today, Last 7 days, etc.)
- [ ] Date type toggle works (Created/Closed)
- [ ] Opportunities filter by date correctly
- [ ] Count updates when filtered

### 7. **Calculation Modes**
- [ ] "Total" button is visible
- [ ] "Expected Value" button is visible
- [ ] Can toggle between modes
- [ ] Statistics cards update correctly:
  - Total Opportunities count
  - Total Value amount
  - Open Opportunities count
- [ ] Expected Value shows probability note
- [ ] Values calculate correctly

### 8. **View Toggle**
- [ ] Table view button visible
- [ ] Pipeline view button visible
- [ ] Can switch between views
- [ ] View preference saves (refresh page to verify)
- [ ] Both views display opportunities correctly

---

## ✅ Table View Tests

### 9. **Table Display**
- [ ] Table headers visible
- [ ] Columns: Name, Account, Contact, Owner, Stage, Probability, Value, Actions
- [ ] All opportunity data displays correctly
- [ ] Owner initials show in colored circles
- [ ] Stage badges have correct colors
- [ ] Values format with commas

### 10. **Table Actions**
- [ ] Eye icon (View) works - opens detail page
- [ ] Edit icon visible
- [ ] Email icon works - opens email modal
- [ ] SMS icon works - opens SMS modal
- [ ] Delete icon works - shows confirmation dialog
- [ ] Row click opens detail page in new tab

### 11. **Empty State (Table)**
- [ ] Shows when no opportunities exist
- [ ] Shows correct icon and message
- [ ] "Create First Opportunity" button visible
- [ ] Shows filtered empty state when search returns nothing
- [ ] Shows active filter chips
- [ ] "Clear all filters" button works

---

## ✅ Pipeline View Tests

### 12. **Pipeline Display**
- [ ] Pipeline stages display as columns
- [ ] Each stage shows opportunity count
- [ ] Each stage shows total value
- [ ] Stage probabilities display (if auto-calculate enabled)
- [ ] Opportunities appear in correct stages

### 13. **Pipeline Cards**
- [ ] Opportunity cards display name
- [ ] Cards show account name
- [ ] Cards show amount
- [ ] Cards show probability percentage
- [ ] Owner initials display on cards
- [ ] Hover effects work

### 14. **Drag and Drop**
- [ ] Can grab an opportunity card
- [ ] Card becomes semi-transparent when dragging
- [ ] Drag indicator appears
- [ ] Can drag to different stage
- [ ] Hover over stage highlights it
- [ ] Drop updates opportunity stage
- [ ] Opportunity moves to new stage visually

### 15. **Closed Won/Lost Buckets**
- [ ] "Closed Won" bucket visible (green)
- [ ] "Closed Lost" bucket visible (red)
- [ ] Buckets show count of closed opportunities
- [ ] Can drag opportunity to Closed Won
- [ ] Modal appears asking for close reason
- [ ] Can drag opportunity to Closed Lost
- [ ] Modal appears asking for close reason
- [ ] Clicking bucket opens popup with closed opportunities

### 16. **Success Animations**
- [ ] Green animation shows when opportunity closed won
- [ ] Red animation shows when opportunity closed lost
- [ ] "Opportunity Won!" message displays
- [ ] "Opportunity Lost" message displays
- [ ] Animation disappears after 2 seconds

### 17. **Closed Bucket Popup**
- [ ] Clicking bucket opens popup
- [ ] Shows list of closed opportunities
- [ ] Can drag opportunities back out of closed status
- [ ] Close reason displays if provided
- [ ] Close button works
- [ ] Click outside closes popup

---

## ✅ Mobile View Tests

### 18. **Mobile Responsive**
- [ ] Resize browser to mobile width
- [ ] Cards display instead of table
- [ ] Search bar full width
- [ ] Filters stack vertically
- [ ] Cards show all information
- [ ] Actions work on cards
- [ ] Pipeline adjusts for mobile
- [ ] Pagination works on mobile

---

## ✅ Modals Tests

### 19. **Email Modal**
- [ ] Clicking email icon opens modal
- [ ] Modal pre-fills opportunity name in subject
- [ ] Can compose email
- [ ] Can close modal
- [ ] Modal doesn't break page

### 20. **SMS Modal**
- [ ] Clicking SMS icon opens modal
- [ ] Can compose SMS message
- [ ] Can close modal
- [ ] Modal doesn't break page

### 21. **Close Opportunity Modal**
- [ ] Dragging to Closed Won opens modal
- [ ] Dragging to Closed Lost opens modal
- [ ] Can enter close reason
- [ ] Can enter close notes
- [ ] Confirm button works
- [ ] Cancel button works
- [ ] Opportunity updates after confirm

---

## ✅ Performance Tests

### 22. **Performance**
- [ ] Page loads quickly (< 2 seconds)
- [ ] Filtering is responsive (< 500ms)
- [ ] Drag and drop is smooth
- [ ] No lag when switching views
- [ ] No memory leaks (check DevTools Performance)

### 23. **Network Requests**
- [ ] Open DevTools Network tab
- [ ] Check API calls are efficient
- [ ] No duplicate requests
- [ ] Pagination fetches correctly
- [ ] Filter changes trigger new fetch

---

## ✅ Integration Tests

### 24. **Data Persistence**
- [ ] Create a new opportunity
- [ ] It appears in the list
- [ ] Edit an opportunity
- [ ] Changes reflect immediately
- [ ] Delete an opportunity
- [ ] It's removed from list
- [ ] Refresh page - data persists

### 25. **Cross-View Consistency**
- [ ] Opportunity appears in both table and pipeline
- [ ] Stage change in pipeline updates table view
- [ ] Statistics match across views
- [ ] Filters apply to both views

---

## ✅ Error Handling

### 26. **Error Scenarios**
- [ ] Network error (disconnect internet temporarily)
- [ ] Shows appropriate error message
- [ ] Page doesn't crash
- [ ] Can retry after reconnecting

---

## 🐛 Known Issues to Check

Based on the refactoring, specifically verify:

### 27. **Filter Integration**
- [ ] Server-side filters (stage, owner) work correctly
- [ ] Client-side filters (search, date) work correctly
- [ ] Combining multiple filters works
- [ ] Clearing filters resets everything

### 28. **State Management**
- [ ] Drag state clears after drop
- [ ] Modal state doesn't leak
- [ ] Page number resets when filters change
- [ ] View preference persists

### 29. **Hook Dependencies**
- [ ] No infinite render loops
- [ ] useEffect dependencies are correct
- [ ] Re-fetching happens at right times
- [ ] No unnecessary API calls

---

## 📊 Before vs After Comparison

### Test the Same Actions You Did Before Refactoring:

1. **Create an opportunity** - Does it work the same?
2. **Move opportunity through pipeline** - Same behavior?
3. **Close an opportunity** - Modal works?
4. **Filter by stage** - Same results?
5. **Search for opportunity** - Same results?
6. **Calculate expected value** - Same numbers?

If all these match your previous experience, the refactoring was successful! ✅

---

## 🚨 What to Look For

### Signs of Success ✅
- Everything works exactly as before
- No console errors
- No visual glitches
- Smooth interactions
- Fast load times

### Red Flags 🚩
- Console errors in DevTools
- Opportunities not loading
- Filters not working
- Drag-and-drop broken
- Modals not opening
- Infinite loading states
- Page crashes

---

## 📝 Testing Results

After testing, note:

**Date Tested:** _______________

**Test Results:**
- [ ] All tests passed ✅
- [ ] Some issues found (list below) ⚠️
- [ ] Major issues found (rollback needed) 🚨

**Issues Found:**
1. _________________________________
2. _________________________________
3. _________________________________

**Performance Notes:**
- Page load time: _______ seconds
- Filter response time: _______ ms
- Drag-and-drop smoothness: _______

**Overall Assessment:**
- [ ] Ready for production ✅
- [ ] Needs minor fixes ⚠️
- [ ] Needs major fixes 🚨

---

## 💡 Tips for Testing

1. **Open Browser DevTools (F12)**
   - Check Console for errors
   - Check Network tab for API calls
   - Check Performance tab for slowness

2. **Test in Multiple Browsers**
   - Chrome
   - Firefox
   - Safari (if on Mac)
   - Mobile browsers

3. **Test Different Data Scenarios**
   - Empty state (no opportunities)
   - One opportunity
   - Many opportunities (100+)
   - All stages filled
   - Some stages empty

4. **Test Edge Cases**
   - Very long opportunity names
   - Missing account/contact
   - Unassigned opportunities
   - Closed opportunities
   - Opportunities with $0 value

---

## 🎯 Success Criteria

✅ **Phase 1 refactoring is successful if:**
1. All 29 test categories pass
2. No new bugs introduced
3. Performance is same or better
4. User experience is identical
5. Code is cleaner (verified ✅)

---

## 📞 Need Help?

If you find any issues:
1. Note the exact steps to reproduce
2. Check browser console for errors
3. Note which test category failed
4. We can fix any issues found

The refactoring was designed to be **100% backwards compatible**, so everything should work exactly as before!

