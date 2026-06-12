# RajaOngkir Subdistrict Issue

## Status: 🔴 BLOCKED

## Problem
RajaOngkir Komerce API wrapper does not provide subdistrict endpoint.

## Test Results
All endpoints return **404 Not Found**:
- ❌ `https://rajaongkir.komerce.id/api/v1/destination/subdistrict/{city_id}`
- ❌ `https://rajaongkir.komerce.id/api/v1/subdistrict/{city_id}`
- ❌ `https://rajaongkir.komerce.id/api/destination/subdistrict/{city_id}`
- ❌ `https://rajaongkir.komerce.id/api/v1/destination/city/{city_id}/subdistrict`

## Current Workaround
✅ **Manual text input** for subdistrict field (already implemented)
- Users can type subdistrict name manually
- No API call needed
- Works on both Profile page and Checkout page

## Recommended Actions

### Option 1: Contact Komerce Support (Recommended)
**Email/Contact**: support@komerce.id atau cek dokumentasi mereka

**Questions to ask**:
1. Does Enterprise plan support subdistrict endpoint?
2. What is the correct endpoint URL for subdistrict?
3. If not available, when will it be added?

**Template email**:
```
Subject: Pertanyaan tentang Endpoint Subdistrict di RajaOngkir Enterprise

Halo Team Komerce,

Saya berlangganan RajaOngkir Enterprise melalui Komerce dan ingin menggunakan 
endpoint untuk mengambil data kecamatan/subdistrict.

Saya sudah mencoba endpoint berikut tapi semuanya return 404:
- https://rajaongkir.komerce.id/api/v1/destination/subdistrict/{city_id}
- https://rajaongkir.komerce.id/api/v1/subdistrict/{city_id}

Apakah endpoint subdistrict tersedia di Komerce? Jika ya, bisa tolong berikan 
dokumentasi atau contoh penggunaan yang benar?

API Key: v3sHTJuq2e6671c7d9d93690TOI7N03G
Paket: Enterprise

Terima kasih.
```

### Option 2: Use Direct RajaOngkir API
If Komerce doesn't support subdistrict:
1. Sign up directly at https://rajaongkir.com
2. Get Pro or Enterprise plan API key
3. Use endpoint: `https://api.rajaongkir.com/pro/subdistrict?city={city_id}`
4. Update Edge Function to use direct API

**Trade-offs**:
- ✅ More features (subdistrict support)
- ❌ Need separate subscription
- ❌ Different API format

### Option 3: Keep Manual Input (Current Solution)
**This is the safest and simplest option for now.**

✅ Already implemented
✅ No API dependency
✅ Works reliably
✅ Users can type any subdistrict name
✅ No additional cost

## Implementation Status

### ✅ What's Working:
- Province dropdown (from Komerce API)
- City dropdown (from Komerce API)
- Subdistrict **manual text input** (no API needed)
- Full cascade: Province → City → Subdistrict (manual)
- Error handling and fallback
- Caching for provinces and cities
- Data saved to database correctly

### ❌ What's NOT Working:
- Subdistrict **dropdown** (blocked by missing API endpoint)

## Temporary Solution

**Keep subdistrict as manual text input** until:
1. Komerce adds subdistrict endpoint, OR
2. You switch to direct RajaOngkir API, OR
3. You decide dropdown is not necessary

## Code Changes Made

All code changes are **backwards compatible**:
- If API works → dropdown appears
- If API fails → fallback to text input
- No breaking changes
- Users can still complete checkout/profile

## Files Modified
- ✅ `supabase/functions/rajaongkir/index.ts` - Edge function with multi-endpoint fallback
- ✅ `frontend/src/hooks/useShipping.ts` - Hook with error handling
- ✅ `frontend/src/pages/account/ProfilePage.tsx` - Profile with dropdown/fallback
- ✅ `frontend/src/pages/product-checkout/CheckoutShippingSection.tsx` - Checkout with dropdown/fallback

## Next Steps

1. **Contact Komerce support** with template above
2. **Wait for response** (1-3 business days)
3. **Meanwhile**: Keep using manual text input (works perfectly)
4. **If confirmed not available**: Remove dropdown code and keep manual input
5. **If endpoint provided**: Update Edge Function with correct URL

## Decision: 2026-06-08

**For now, we will:**
- ✅ Keep manual text input for subdistrict
- ✅ Wait for Komerce support response
- ✅ Deploy current code (works with manual input)
- ⏳ Re-evaluate when we get response from Komerce

**This is NOT a blocker** - the app works fine with manual input.
