# Deploy RajaOngkir Edge Function

## Step 1: Deploy Edge Function

```bash
# From project root
npx supabase functions deploy rajaongkir
```

## Step 2: Test the subdistrict endpoint

```bash
# Test locally first (optional)
node test-rajaongkir-subdistrict.js
```

## Step 3: Check Supabase Logs

After deploying, test from your app and check logs:

```bash
npx supabase functions logs rajaongkir --follow
```

Or go to Supabase Dashboard → Edge Functions → rajaongkir → Logs

## Expected Output in Logs

You should see:
```
[RajaOngkir:xxx] Fetching subdistricts from: https://rajaongkir.komerce.id/api/v1/destination/subdistrict/68
[RajaOngkir:xxx] Subdistricts (city 68) API response: { status: 200, ... }
```

## Troubleshooting

### If you see 404 or 401 error:

1. **Check API Key has Enterprise access**
   - Contact RajaOngkir support to confirm your API key is upgraded
   - Test with their provided example endpoint

2. **Endpoint might be different**
   - RajaOngkir Komerce wrapper might use different URL structure
   - Check Komerce documentation: https://rajaongkir.komerce.id/documentation
   - Try different endpoint formats (see test script)

3. **Alternative: Use RajaOngkir Direct API**
   If Komerce wrapper doesn't support subdistricts, use direct RajaOngkir API:
   - Base URL: `https://api.rajaongkir.com/starter` or `/pro` or `/enterprise`
   - Endpoint: `/subdistrict?city={city_id}`
   - Header: `key: YOUR_API_KEY`

### If subdistricts still don't work:

The app has **graceful fallback** to manual text input. Users can still:
1. Select Province (dropdown)
2. Select City (dropdown)
3. Enter Subdistrict manually (text input)

This is already implemented in both ProfilePage and CheckoutPage.

## Verify Deployment

After deploy, go to your app:
1. Go to Profile page
2. Select a province (e.g., Jawa Barat)
3. Select a city (e.g., Bandung Barat)
4. Check if subdistrict dropdown appears or shows error

If dropdown doesn't populate:
- Check browser console for errors
- Check Supabase logs for API response
- Use the fallback manual input
