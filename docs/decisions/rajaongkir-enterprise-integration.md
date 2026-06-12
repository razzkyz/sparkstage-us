# RajaOngkir Enterprise Integration - Subdistrict Support

## Summary
Upgraded RajaOngkir integration from Starter to Enterprise plan to support subdistrict/kecamatan data in shipping and profile pages.

## Date
2026-06-08

## Context
Previously, the app only supported province and city selection using RajaOngkir Starter API. With Enterprise subscription, we can now fetch subdistrict (kecamatan) data for more precise address management.

## Changes Made

### 1. Edge Function Enhancement
**File**: `supabase/functions/rajaongkir/index.ts`
- Added new `subdistricts` action handler
- Endpoint: `GET ${BASE_URL}/subdistrict/{city_id}`
- Returns subdistrict list for a given city
- Includes same error handling and rate limit detection as other endpoints

### 2. Frontend Hook Update
**File**: `frontend/src/hooks/useShipping.ts`
- Added `Subdistrict` interface type
- Added `subdistricts` state array
- Added `isLoadingSubdistricts` loading state
- Added useEffect to fetch subdistricts when `cityId` changes
- Hook now requires `cityId` parameter: `useShipping(provinceId, cityId, weight)`
- Returns `subdistricts` and `isLoadingSubdistricts` in return object

### 3. Checkout Page Integration
**Files**: 
- `frontend/src/pages/product-checkout/CheckoutShippingSection.tsx`
- `frontend/src/pages/product-checkout/useProductCheckoutController.ts`
- `frontend/src/pages/ProductCheckoutPage.tsx`

**Updates**:
- Added `subdistrictId` state in checkout controller
- Added `setSubdistrictId` setter function
- Added subdistrict dropdown in CheckoutShippingSection component
- Passes `subdistrictId` to backend when creating orders
- Dropdown shows after city is selected
- Full cascade: Province → City → Subdistrict

### 4. Profile Page Enhancement
**File**: `frontend/src/pages/account/ProfilePage.tsx`

**Updates**:
- Added `subdistricts` state array
- Added `isLoadingSubdistricts` loading state
- Added `subdistrictError` error state
- Added `selectedSubdistrictName` for display
- Added localStorage caching with key prefix: `rajaongkir_profile_subdistricts_`
- Cache duration: 7 days (same as provinces/cities)
- Converted subdistrict field from text input to smart dropdown
- Fallback to manual text input if API fails
- Shows loading state while fetching
- Full cascade: Province → City → Subdistrict

## API Format

### Request
```typescript
{
  action: "subdistricts",
  city_id: "153" // Jakarta Selatan
}
```

### Response
```typescript
{
  data: [
    {
      id: "2318",
      subdistrict_id: "2318",
      city_id: "153",
      province: "DKI Jakarta",
      city: "Jakarta Selatan",
      type: "Kecamatan",
      subdistrict_name: "Cilandak"
    },
    // ... more subdistricts
  ]
}
```

## Data Flow
1. User selects Province → triggers cities fetch
2. User selects City → triggers subdistricts fetch
3. User selects Subdistrict → stored in form state
4. On checkout/profile save → `subdistrictId` sent to backend

## Caching Strategy
- **Provinces**: Cached globally (key: `rajaongkir_profile_provinces`)
- **Cities**: Cached per province (key: `rajaongkir_profile_cities_{province_id}`)
- **Subdistricts**: Cached per city (key: `rajaongkir_profile_subdistricts_{city_id}`)
- All cache duration: 7 days
- Reduces API calls and improves UX

## Error Handling
- Rate limit detection (429 errors)
- Invalid API key detection (401/403 errors)
- Graceful fallback to manual text input if API fails
- Error messages shown to user with option to enter manually

## Database Schema
Ensure `profiles` and `product_orders` tables have `subdistrict_id` column:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subdistrict_id TEXT;
ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS shipping_subdistrict_id TEXT;
```

## Testing Checklist
- [ ] Profile page: province → city → subdistrict cascade works
- [ ] Profile page: cache working (check localStorage)
- [ ] Profile page: form submission saves subdistrict_id
- [ ] Checkout page: subdistrict dropdown shows after city selected
- [ ] Checkout page: order creation includes subdistrictId
- [ ] Error handling: manual input fallback works
- [ ] Edge function: subdistricts endpoint returns data
- [ ] Edge function: rate limit handling works

## Notes
- Subdistrict is now required field (marked with red asterisk)
- Enterprise API gives more precise location data for better shipping calculations
- Backwards compatible: old orders without subdistrict_id still work
- Consider adding postal code auto-fill from subdistrict data in future

## References
- RajaOngkir Enterprise API Docs: https://rajaongkir.komerce.id/documentation
- Original RajaOngkir integration: `docs/runbooks/` (if exists)
