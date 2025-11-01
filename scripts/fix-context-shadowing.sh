#!/bin/bash

# Fix variable shadowing issue in [id] routes
# The parameter 'context' conflicts with 'const context = await getTenantContext()'

FILES=(
  "src/app/api/templates/[id]/route.ts"
  "src/app/api/staff-roles/[id]/route.ts"
  "src/app/api/quotes/[id]/route.ts"
  "src/app/api/opportunities/[id]/line-items/route.ts"
  "src/app/api/locations/[id]/route.ts"
  "src/app/api/events/[id]/route.ts"
  "src/app/api/event-staff/[id]/route.ts"
  "src/app/api/event-dates/[id]/route.ts"
  "src/app/api/equipment-types/[id]/route.ts"
  "src/app/api/equipment-items/[id]/route.ts"
  "src/app/api/booths/[id]/route.ts"
  "src/app/api/booth-types/[id]/route.ts"
  "src/app/api/booth-assignments/[id]/route.ts"
  "src/app/api/attachments/[id]/route.ts"
  "src/app/api/quotes/[id]/send/route.ts"
  "src/app/api/quotes/[id]/convert-to-invoice/route.ts"
  "src/app/api/quotes/[id]/pdf/route.ts"
  "src/app/api/opportunities/[id]/activity/route.ts"
  "src/app/api/opportunities/[id]/convert-to-event/route.ts"
  "src/app/api/events/[id]/activity/route.ts"
)

echo "Fixing variable shadowing in ${#FILES[@]} files..."

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "Processing: $FILE"

    # Replace 'context: { params:' with 'routeContext: { params:'
    sed -i 's/context: { params:/routeContext: { params:/g' "$FILE"

    # Replace 'await context.params' with 'await routeContext.params'
    sed -i 's/await context\.params/await routeContext.params/g' "$FILE"

    echo "  ✓ Fixed"
  else
    echo "  ✗ File not found: $FILE"
  fi
done

echo ""
echo "Done! Fixed variable shadowing issue in all files."
echo "Changes:"
echo "  - Parameter renamed: context → routeContext"
echo "  - Usage updated: context.params → routeContext.params"
