# Event Page Settings Error Fix ✅

**Date:** 2026-06-13  
**Status:** ✅ Fixed

## Problem

Console error when loading the app:
```
Error fetching event page settings: {
  code: 'PGRST205', 
  details: null, 
  hint: null, 
  message: "Could not find the table 'public.event_page_settings' in the schema cache"
}
```

**Impact:** 
- Red error in console
- No visual/functional impact (events page still loads with default settings)
- User experience not affected but concerning for developers

## Root Cause

1. **Indonesia DB** has `event_page_settings` table for event/booking CMS
2. **US DB** does NOT have this table (not needed - no booking features)
3. `useEventSettings` hook used by:
   - `/events` page (public Events page - still exists in US version)
   - `/admin/event-page` (admin Event Config - already removed from menu)
4. `useCmsSingletonSettings` helper only handled:
   - ✅ `PGRST116` (no rows found) → returns `null`
   - ❌ `PGRST205` (table not found) → throws error

## Solution

Updated `useCmsSingletonSettings.ts` to gracefully handle missing tables:

```typescript
if (fetchError.code === 'PGRST205') {
  console.warn(`Table '${table}' not found - using default settings for ${errorLabel}`);
  return null;
}
```

**Behavior:**
- If table exists but empty → return `null` → use `DEFAULT_EVENT_PAGE_SETTINGS`
- If table doesn't exist → return `null` → use `DEFAULT_EVENT_PAGE_SETTINGS`
- Other errors → still throw (actual database problems)

## Files Modified

### `frontend/src/hooks/useCmsSingletonSettings.ts`
- Added handling for `PGRST205` error code (table not found)
- Returns `null` gracefully instead of throwing error
- Logs warning to console for developer awareness

## Benefits

1. **No More Console Errors** - Clean console in US version
2. **Graceful Fallback** - Uses default settings when table missing
3. **Future-Proof** - Will work for any CMS table removed in US version
4. **Developer Friendly** - Warning log explains why defaults are used

## Affected Tables (Potentially)

This fix helps with ANY missing CMS settings table in US version:
- ✅ `event_page_settings` (events/booking config)
- ✅ `booking_page_settings` (booking page config)
- ✅ Any other CMS table we remove for US version

## Testing

1. ✅ `/events` page loads without errors
2. ✅ Console shows warning (not error) if table missing
3. ✅ Default event page content displays correctly
4. ✅ No red errors in browser console
5. ✅ Other CMS hooks still work normally

## Default Event Page Settings

When `event_page_settings` table doesn't exist, the app uses these defaults:

- **Hero Images:** 5 Unsplash stock photos
- **Magic Title:** "CAPTURING your MAGIC MOMENT"
- **Experience Title:** "CHOOSE your EXPERIENCE"
- **Experience Links:** The Galleries, My Services, Contact Me
- **Fonts:** Cardo (headings) + Nunito Sans (body)

These defaults are fine for US version placeholder content.

## Future Improvements

For US version, we may want to:
1. Replace event page with US-focused content
2. Remove event page entirely if not needed
3. Create new US-specific landing pages
4. Add Stripe-related CMS settings tables

## Related Changes

- `NAVBAR_MENU_FIX_COMPLETE.md` - Event menu already removed
- `ADMIN_MENU_CLEANUP.md` - Event Page Config admin removed
- Event page still accessible at `/events` but uses defaults
