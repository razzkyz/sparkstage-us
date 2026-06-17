# Ticket Count Error Fix ✅

**Date:** 2026-06-13  
**Status:** ✅ Fixed

## Problem

Console errors when loading the app:

```
GET .../purchased_tickets?select=i...&order_items.orders.is_hidden_by_user=eq.false 400 (Bad Request)

HEAD .../orders?select=*&user_id=eq...&status=eq.pending&is_hidden_by_user=eq.false 400 (Bad Request)
```

**Impact:**
- Red 400 errors in console
- Queries fail because `purchased_tickets` and `orders` tables don't exist in US DB
- Ticket count badge in navbar shows 0 (correct, but with errors)

## Root Cause

`useTicketCount` hook tries to query:
1. `purchased_tickets` table with complex join → **Table doesn't exist in US DB**
2. `orders` table for pending ticket orders → **Different schema in US DB**

**Why these tables matter:**
- Indonesia version: Ticket booking system for venue entrance
- US version: No ticket booking (e-commerce only)
- Badge in navbar shows count of active tickets + pending orders

## Solution

Simplified `useTicketCount` hook for US version:

```typescript
export const useTicketCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false); // No tickets in US version
  const { user, initialized } = useAuth();

  useEffect(() => {
    // US VERSION: No ticket booking functionality
    // Always return 0 count
    if (!initialized) {
      return;
    }

    setCount(0);
    setLoading(false);
  }, [initialized]);

  return { count, loading };
};
```

**Changes:**
- ❌ Removed complex `purchased_tickets` query with joins
- ❌ Removed `orders` pending count query  
- ❌ Removed realtime subscription to ticket changes
- ✅ Always returns `count: 0` (no tickets in US version)
- ✅ Always returns `loading: false` (instant, no query)
- ✅ No database queries = no errors

## Files Modified

### `frontend/src/hooks/useTicketCount.ts`
- Removed all Supabase queries
- Simplified to always return 0 count
- Added comment: "US VERSION: No ticket booking functionality"

## UI Impact

### Navbar Ticket Icon
- **Before:** Tries to query tickets → 400 errors → shows 0
- **After:** No queries → no errors → shows 0
- **Visual:** No change (icon still visible, always shows 0)

### Future Consideration
Since ticket icon always shows 0 in US version, we may want to:
1. Hide ticket icon entirely from navbar
2. Replace with product orders icon only
3. Keep it for future US event tickets (if needed)

For now, leaving the icon visible (with 0 count) is fine.

## Related Errors Fixed Today

### 1. Event Page Settings Error ✅
- **File:** `useCmsSingletonSettings.ts`
- **Fix:** Handle `PGRST205` (table not found) gracefully
- **Result:** Warning only, uses default settings

### 2. Ticket Count Error ✅  
- **File:** `useTicketCount.ts`
- **Fix:** Simplified hook to return 0 always
- **Result:** No queries, no errors

### 3. News Page Settings Warning ✅
- **Already handled** by `useCmsSingletonSettings.ts` fix
- **Result:** Warning only, uses default settings

## Testing

1. ✅ No console errors for `purchased_tickets`
2. ✅ No console errors for `orders` table
3. ✅ Navbar ticket icon shows 0 (no badge)
4. ✅ Page loads fast (no failed queries)
5. ✅ Auth flow works normally

## Next Steps

Consider these improvements for US version:
1. Remove ticket icon from navbar (or hide when count = 0)
2. Remove `/my-tickets` page entirely
3. Focus on product orders only
4. Add US-specific order tracking

## Summary of All Fixes (Session)

### Navigation Cleanup
- ✅ Removed STARGUIDE role and menu
- ✅ Removed "Tiket" section from admin sidebar
- ✅ Fixed duplicate SHOP in public navbar
- ✅ Removed Event Page Config from admin

### Database Error Handling
- ✅ Added PGRST205 handling for missing tables
- ✅ Graceful fallback to default CMS settings
- ✅ Simplified ticket count hook to bypass queries

### Build & TypeScript
- ✅ Fixed TypeScript imports for removed constants
- ✅ Build successful with no errors
- ✅ Clean console (warnings only, no errors)

**Status:** Production ready! All console errors resolved. 🎉
