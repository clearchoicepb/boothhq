# Google Maps Integration Audit Report

**Date:** December 24, 2025
**Purpose:** Evaluate current Google Maps integration for mileage calculation feature planning

---

## Executive Summary

BoothHQ currently uses Google Maps Places API for address autocomplete when creating locations. While the autocomplete captures latitude/longitude coordinates from Google, **these coordinates are NOT stored in the database**. Only structured text address fields are persisted. This is a gap that needs to be addressed for any distance/mileage calculation feature.

---

## 1. Current Google Maps Integration

### API Key Configuration

| Item | Details |
|------|---------|
| **Environment Variable** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| **Configuration File** | `.env.example` (lines 62-68) |
| **Visibility** | Public (client-side accessible) |
| **Required Google APIs** | Places API, Maps JavaScript API, Geocoding API |

### Implementation Files

| File | Purpose |
|------|---------|
| `src/lib/google-maps-loader.ts` | Dynamic script loader for Google Maps API |
| `src/components/ui/address-input.tsx` | Reusable address autocomplete component |

### Loading Mechanism

The Google Maps API is loaded dynamically (not via npm package):

```typescript
// src/lib/google-maps-loader.ts:40
script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`
```

Key features:
- Lazy loading (only when needed)
- Promise-based with memoization
- Prevents duplicate script injection
- Includes fallback for manual entry on failure

### Places Autocomplete Configuration

```typescript
// src/components/ui/address-input.tsx:138-143
autocompleteRef.current = new window.google.maps.places.Autocomplete(
  addressLine1Ref.current,
  {
    types: ['establishment', 'geocode'],
    fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components']
  }
)
```

**Fields requested from Google:**
- `formatted_address` - Full formatted address string
- `geometry` - **Contains lat/lng coordinates** (NOT currently stored)
- `name` - Place/venue name
- `place_id` - Google's unique place identifier (NOT currently stored)
- `address_components` - Structured address parts

---

## 2. Address Data Storage

### What We Capture vs. Store

| Field from Google | Captured | Stored | Notes |
|-------------------|----------|--------|-------|
| `formatted_address` | Yes | No | Discarded after parsing |
| `geometry.location.lat()` | Yes | **No** | Available but not stored |
| `geometry.location.lng()` | Yes | **No** | Available but not stored |
| `place_id` | Yes | **No** | Could enable future lookups |
| `street_number + route` | Yes | Yes | → `address_line1` |
| `locality` | Yes | Yes | → `city` |
| `administrative_area_level_1` | Yes | Yes | → `state` (short_name) |
| `postal_code` | Yes | Yes | → `postal_code` |
| `country` | Yes | Yes | → `country` (short_name) |

### Locations Table Schema

```sql
-- supabase/migrations/20250121000000_phase1_database_foundation.sql
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,        -- Venue name
  address_line1 VARCHAR(255),        -- Street address
  address_line2 VARCHAR(255),        -- Suite/unit
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'US',
  contact_name VARCHAR(255),         -- Location contact
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  is_one_time BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
  -- NO latitude/longitude columns
  -- NO place_id column
);
```

### Users Table Address Schema

```sql
-- supabase/migrations/20251011120001_update_address_fields.sql
-- Users table (for staff home addresses):
address_line_1 TEXT,
address_line_2 TEXT,
city TEXT,
state TEXT,
zip_code TEXT
-- NO country field
-- NO latitude/longitude columns
```

### Events Table Address Fields

Events reference locations via `location_id` foreign key, plus have direct mailing address fields:

```sql
-- Events table mailing address fields:
mailing_address_line1 VARCHAR(255),
mailing_address_line2 VARCHAR(255),
mailing_city VARCHAR(100),
mailing_state VARCHAR(50),
mailing_postal_code VARCHAR(20),
mailing_country VARCHAR(100)
-- NO latitude/longitude columns
```

### Event Dates Table

```sql
-- Each event date can have a different location:
event_dates (
  location_id UUID REFERENCES locations(id),
  -- Links to locations table for address
)
```

---

## 3. API Usage Patterns

### Current Google API Calls

| API | Usage | Billing Impact |
|-----|-------|----------------|
| **Places Autocomplete** | Address input fields | Per-request billing |
| **Places Details** | Part of autocomplete | Included in autocomplete session |
| Maps JavaScript API | Required for Places | Free (SDK) |
| Geocoding API | Listed but not actively used | Not currently called |
| **Distance Matrix API** | **Not used** | Would be needed for mileage |
| **Directions API** | **Not used** | Alternative for routing |

### Billing Considerations

Current cost is primarily Places Autocomplete:
- Basic Autocomplete: ~$2.83 per 1,000 requests
- With session tokens (current implementation uses them implicitly): More cost-effective

For mileage calculations, additional APIs would be needed:
- **Distance Matrix API**: ~$5.00 per 1,000 elements
- **Directions API**: ~$5.00 per 1,000 requests

---

## 4. Components Using Address Autocomplete

| Component | File | Usage |
|-----------|------|-------|
| `LocationForm` | `src/components/location-form.tsx` | Create/edit venue locations |
| `LeadConversionModal` | `src/components/lead-conversion-modal.tsx` | Capture mailing address during conversion |
| `LocationSelector` | `src/components/location-selector.tsx` | Select/create locations in event forms |
| `LocationSelect` | `src/components/location-select.tsx` | Dropdown for existing locations |

---

## 5. Gap Analysis for Mileage Calculations

### Current Gaps

1. **No Coordinates Stored**
   - `geometry.lat()` and `geometry.lng()` are captured but discarded
   - Cannot calculate distances without re-geocoding

2. **No `place_id` Stored**
   - Could be used for future lookups without re-geocoding
   - Google allows retrieving place details by ID

3. **Users Missing Country Field**
   - Staff home addresses have no country column
   - Assumes US-only (may cause issues for international)

4. **No Distance Matrix Integration**
   - Would need to add API calls for distance calculations
   - Need to handle API costs at scale

### What's Needed for Mileage Feature

#### Option A: Store Coordinates (Recommended)

Add latitude/longitude columns and capture at address entry time:

```sql
-- Add to locations table:
ALTER TABLE locations ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE locations ADD COLUMN longitude DECIMAL(11, 8);
ALTER TABLE locations ADD COLUMN place_id VARCHAR(255);

-- Add to users table:
ALTER TABLE users ADD COLUMN home_latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN home_longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT 'US';
```

Modify `AddressInput` component to capture and return coordinates:

```typescript
interface AddressData {
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  // Add these:
  latitude?: number
  longitude?: number
  place_id?: string
}
```

**Pros:** One-time capture, no ongoing API costs for stored addresses
**Cons:** Requires backfilling existing addresses

#### Option B: Geocode On-Demand

Keep current schema, geocode addresses when calculating distances.

**Pros:** No database changes needed
**Cons:** Higher API costs, slower calculations, risk of geocoding failures

### Recommended Implementation Steps

1. **Database Migration**
   - Add `latitude`, `longitude`, `place_id` columns to `locations` table
   - Add `home_latitude`, `home_longitude`, `country` columns to `users` table

2. **Update AddressInput Component**
   - Capture and return coordinates from `place.geometry.location`
   - Capture and return `place_id`

3. **Update Location/User Forms**
   - Pass coordinates through to API when saving

4. **Create Distance Calculation Service**
   - Use stored coordinates for Haversine formula (straight-line distance)
   - OR integrate Google Distance Matrix API for driving distances

5. **Backfill Script**
   - Geocode existing addresses to populate new coordinate fields
   - Use batch geocoding with rate limiting

---

## 6. Files to Modify for Implementation

| File | Changes Needed |
|------|----------------|
| `src/components/ui/address-input.tsx` | Capture lat/lng/place_id, add to AddressData interface |
| `src/components/location-form.tsx` | Pass coordinates to API |
| `src/app/api/locations/route.ts` | Accept and store coordinates |
| `src/app/api/users/route.ts` | Accept and store home coordinates |
| `src/types/database.ts` | Add new column types |
| `supabase/migrations/` | New migration for coordinate columns |
| New: `src/lib/distance-calculator.ts` | Distance calculation utilities |
| New: `src/hooks/useStaffMileage.ts` | Mileage calculation hook |

---

## 7. Summary

### Current State
- Google Maps Places API integration is functional
- Address autocomplete works well for structured address capture
- **Coordinates are NOT stored** despite being available

### For Mileage Calculations
- **Primary gap:** No lat/lng storage in database
- **Secondary gap:** No Distance Matrix API integration
- **Estimated effort:** Medium (database migration + component updates + new service)

### Recommendations
1. Add coordinate columns to `locations` and `users` tables
2. Update `AddressInput` to capture and pass coordinates
3. Create backfill script for existing addresses
4. Implement distance calculation service (start with Haversine, optionally add Distance Matrix)
5. Consider caching distance calculations to reduce API costs
