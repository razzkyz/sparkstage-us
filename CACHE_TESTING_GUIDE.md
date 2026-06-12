# 🧪 LocalStorage Cache - Testing Guide

## 🎯 Purpose
Panduan lengkap untuk testing localStorage cache implementation di CheckoutShippingSection.

---

## 🛠️ Testing Tools

### Browser DevTools:
1. **Console Tab** - Lihat cache hit/miss logs
2. **Application Tab** → Local Storage → `http://localhost:5173`
3. **Network Tab** - Monitor API calls ke Supabase

### Useful Console Commands:
```javascript
// View all cache
Object.keys(localStorage)
  .filter(k => k.startsWith('rajaongkir'))
  .forEach(k => console.log(k, localStorage.getItem(k)));

// Clear all RajaOngkir cache
Object.keys(localStorage)
  .filter(k => k.startsWith('rajaongkir'))
  .forEach(k => localStorage.removeItem(k));

// Clear specific cache
localStorage.removeItem('rajaongkir_checkout_v1_provinces');
localStorage.removeItem('rajaongkir_checkout_v1_cities_6'); // Jakarta

// Check cache size
const cacheKeys = Object.keys(localStorage)
  .filter(k => k.startsWith('rajaongkir'));
const totalSize = cacheKeys.reduce((sum, key) => {
  return sum + localStorage.getItem(key).length;
}, 0);
console.log(`Total cache size: ${(totalSize / 1024).toFixed(2)} KB`);
```

---

## 📋 Test Cases

### ✅ Test 1: First-Time User (No Cache)

**Setup:**
```javascript
// Clear all cache
localStorage.clear();
```

**Steps:**
1. Navigate to `/cart` or product page
2. Add item to cart
3. Go to checkout page
4. Initially select "Pickup" (default) ✅
5. Click "Shipping" radio button
6. Observe Province dropdown behavior

**Expected Results:**
```
Console Log:
✅ "[useShipping] Fetching provinces from API..."
✅ "[useShipping] Cached 34 provinces"

Network Tab:
✅ 1 API call to rajaongkir Edge Function (action: provinces)
✅ Response time: 500-2000ms

Dropdown:
✅ Shows loading state briefly
✅ Then populates with 34 provinces
✅ Data appears correct

Local Storage:
✅ Key created: rajaongkir_checkout_v1_provinces
✅ Contains data + timestamp
```

**Continue with City:**
1. Select province (e.g., "DKI Jakarta" - id: 6)
2. Observe City dropdown

**Expected:**
```
Console:
✅ "[useShipping] Fetching cities for province 6..."
✅ "[useShipping] Cached 27 cities for province 6"

Network:
✅ 1 API call (action: cities, province_id: 6)

Dropdown:
✅ Populates with 27 cities

Storage:
✅ Key: rajaongkir_checkout_v1_cities_6
```

**Continue with District:**
1. Select city (e.g., "Jakarta Selatan" - id: 154)
2. Observe District dropdown

**Expected:**
```
Console:
✅ "[useShipping] Fetching subdistricts for city 154..."
✅ "[useShipping] Cached 24 subdistricts for city 154"

Network:
✅ 1 API call (action: subdistricts, city_id: 154)

Dropdown:
✅ Populates with 24 districts (Cilandak, Kebayoran, etc.)

Storage:
✅ Key: rajaongkir_checkout_v1_subdistricts_154
```

**Summary:**
- Total API calls: 3 (province, city, district)
- Total cache keys: 3
- Next visit will be INSTANT! ⚡

---

### ✅ Test 2: Returning User (Full Cache Hit)

**Setup:**
```javascript
// Keep cache from Test 1
// Do NOT clear localStorage
```

**Steps:**
1. Refresh page or navigate back to checkout
2. Click "Shipping" radio button
3. Observe Province dropdown

**Expected Results:**
```
Console Log:
✅ "[useShipping] Using cached provinces (checkout)"

Network Tab:
✅ NO API call to provinces endpoint! ⚡

Dropdown:
✅ Populates INSTANTLY (<10ms)
✅ No loading spinner visible

Local Storage:
✅ Same key, timestamp unchanged
```

**Continue with City:**
1. Select same province (DKI Jakarta - id: 6)
2. Observe City dropdown

**Expected:**
```
Console:
✅ "[useShipping] Using cached cities for province 6"

Network:
✅ NO API call! ⚡

Dropdown:
✅ INSTANT population
```

**Continue with District:**
1. Select same city (Jakarta Selatan - id: 154)
2. Observe District dropdown

**Expected:**
```
Console:
✅ "[useShipping] Using cached subdistricts for city 154"

Network:
✅ NO API call! ⚡

Dropdown:
✅ INSTANT population
```

**Summary:**
- Total API calls: 0! 🎉
- Load time: <30ms total (100x faster)
- Cache hit rate: 100%

---

### ✅ Test 3: Different Province (Mixed Hit/Miss)

**Setup:**
```javascript
// Keep cache from Test 1 (has Jakarta data)
```

**Steps:**
1. Go to checkout, click "Shipping"
2. Province dropdown appears
3. Select different province (e.g., "Jawa Barat" - id: 9)

**Expected Results:**
```
Province:
✅ Console: "Using cached provinces"
✅ Network: NO API call
✅ Dropdown: INSTANT

City (new province):
✅ Console: "Fetching cities for province 9..."
✅ Network: 1 API call (first time for Jawa Barat)
✅ Dropdown: 500-2000ms load
✅ Cache saved: rajaongkir_checkout_v1_cities_9

District (new city):
✅ Console: "Fetching subdistricts for city X..."
✅ Network: 1 API call (first time for that city)
✅ Dropdown: 500-2000ms load
✅ Cache saved: rajaongkir_checkout_v1_subdistricts_X
```

**Summary:**
- Province: CACHED ⚡
- City: API CALL (expected for new province)
- District: API CALL (expected for new city)
- Total: 2 API calls (better than 3!)

---

### ✅ Test 4: Cache Expiry Simulation

**Setup:**
```javascript
// Manually edit cache timestamp to simulate 8 days ago
const cacheKey = 'rajaongkir_checkout_v1_provinces';
const cache = JSON.parse(localStorage.getItem(cacheKey));
cache.timestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
localStorage.setItem(cacheKey, JSON.stringify(cache));
```

**Steps:**
1. Refresh checkout page
2. Click "Shipping"
3. Observe Province dropdown

**Expected Results:**
```
Console:
✅ "[useShipping] Cache expired, fetching fresh data"
✅ "[useShipping] Fetching provinces from API..."
✅ "[useShipping] Cached 34 provinces"

Network:
✅ 1 API call (cache expired)

Dropdown:
✅ 500-2000ms load
✅ Populates correctly

Storage:
✅ Timestamp updated to NOW
✅ Valid for another 7 days
```

**Summary:**
- Cache expiry works correctly ✅
- Auto-refreshes stale data
- New timestamp = fresh for 7 more days

---

### ✅ Test 5: API Rate Limit (429 Error)

**Setup:**
```javascript
// Clear cache to force API call
localStorage.clear();

// API must be at quota limit (429 error)
// Can't simulate locally, must happen naturally or mock
```

**Steps:**
1. Go to checkout, click "Shipping"
2. Province dropdown attempts to load
3. RajaOngkir API returns 429

**Expected Results:**
```
Console:
✅ "[useShipping] Fetching provinces from API..."
❌ "[useShipping] API error: Too Many Requests"
✅ Falls back to FALLBACK_PROVINCES

Network:
❌ 1 API call (returns 429)

Dropdown:
✅ Still populates with 34 fallback provinces!
✅ User can continue (not blocked)

Storage:
❌ No cache saved (error response)
```

**Continue:**
1. Select province from fallback list
2. City dropdown attempts to load
3. Also returns 429

**Expected:**
```
City Dropdown:
❌ Empty (no fallback for cities)
✅ Fallback UI: Manual text input shows!
✅ User can type city manually
```

**Summary:**
- ✅ Graceful degradation (not broken)
- ✅ Fallback provinces work
- ✅ Manual input available
- ✅ Checkout not blocked

---

### ✅ Test 6: Corrupted Cache Data

**Setup:**
```javascript
// Manually corrupt cache
localStorage.setItem(
  'rajaongkir_checkout_v1_provinces',
  'INVALID_JSON{'
);
```

**Steps:**
1. Refresh checkout page
2. Click "Shipping"
3. Observe behavior

**Expected Results:**
```
Console:
❌ JSON parse error caught
✅ Cache removed automatically
✅ Falls back to API call
✅ "[useShipping] Fetching provinces from API..."

Network:
✅ 1 API call (corrupted cache ignored)

Dropdown:
✅ Loads from API normally
✅ New valid cache saved

Storage:
✅ Corrupted cache replaced with valid data
```

**Summary:**
- ✅ Error handling works
- ✅ Auto-recovery from corruption
- ✅ User never sees error

---

### ✅ Test 7: Switch Between Pickup & Shipping

**Setup:**
```javascript
// Have full cache from previous tests
```

**Steps:**
1. Go to checkout
2. Default: "Pickup" selected
3. Check network tab (should be 0 API calls)
4. Click "Shipping"
5. Province dropdown populates (cache hit)
6. Click "Pickup" again
7. Shipping form disappears
8. Click "Shipping" again

**Expected Results:**
```
Step 2 (Pickup):
✅ 0 API calls
✅ No shipping form visible

Step 4 (First Shipping):
✅ Province: Cache hit (<10ms)
✅ 0 API calls

Step 6 (Back to Pickup):
✅ 0 API calls
✅ Form hides

Step 8 (Shipping again):
✅ Province: Still cached (<10ms)
✅ 0 API calls
✅ Same cache data
```

**Summary:**
- ✅ Pickup = 0 API calls always
- ✅ Shipping = Cache persists across toggles
- ✅ No unnecessary API calls

---

### ✅ Test 8: Multiple Checkout Sessions (Same Day)

**Scenario:** User completes 3 orders in same day

**Steps:**
1. Complete order #1 (first time, cache populated)
2. Add items to cart again
3. Complete order #2 (should use cache)
4. Add items again
5. Complete order #3 (should use cache)

**Expected API Calls:**
```
Order #1:
- Provinces: 1 API call (first time)
- Cities: 1 API call (first time)
- Districts: 1 API call (first time)
- Shipping cost: 1 API call
Total: 4 API calls

Order #2:
- Provinces: 0 (cache hit)
- Cities: 0 (cache hit, same city)
- Districts: 0 (cache hit, same district)
- Shipping cost: 1 API call
Total: 1 API call ⚡

Order #3:
- Provinces: 0 (cache hit)
- Cities: 0 (cache hit, same city)
- Districts: 0 (cache hit, same district)
- Shipping cost: 1 API call
Total: 1 API call ⚡

Grand Total: 6 API calls
Without cache: 12 API calls
Savings: 50%! 🎉
```

---

### ✅ Test 9: Different Browsers/Devices

**Scenario:** Test cross-device behavior

**Steps:**
1. **Chrome Desktop**: Complete checkout (cache populated)
2. **Chrome Mobile** (same user): Complete checkout

**Expected:**
```
Chrome Desktop:
- First visit: 3 API calls (province, city, district)
- Second visit: 0 API calls (cache hit)

Chrome Mobile:
- First visit: 3 API calls (fresh cache, different device)
- Second visit: 0 API calls (cache hit on mobile)

Conclusion:
✅ Cache is per-device (expected behavior)
✅ Each device builds its own cache
✅ Not a bug, this is correct for localStorage
```

---

### ✅ Test 10: Cache Version Bump

**Scenario:** Test cache invalidation when format changes

**Setup:**
```javascript
// In code, change version:
// const CACHE_VERSION = 'v1'; → 'v2'
```

**Steps:**
1. User has v1 cache populated
2. Deploy code with v2
3. User visits checkout
4. Click "Shipping"

**Expected:**
```
Console:
✅ "[useShipping] Fetching provinces from API..."
(v1 cache ignored, looking for v2 cache)

Network:
✅ API calls happen (v2 cache building)

Storage:
✅ Old keys still exist: rajaongkir_checkout_v1_*
✅ New keys created: rajaongkir_checkout_v2_*
✅ v1 cache orphaned but harmless (will expire)

Dropdown:
✅ Loads from API (first time for v2)
✅ Populates correctly
```

**Summary:**
- ✅ Version bump invalidates old cache
- ✅ Useful for format changes
- ✅ Old cache ignored (eventually cleaned by browser)

---

## 📊 Success Criteria

### Performance:
- ✅ Cache hit load time: <50ms
- ✅ Cache miss load time: <2000ms
- ✅ API call reduction: >70% for returning users

### Functionality:
- ✅ All dropdowns populate correctly
- ✅ Cache persists across page refreshes
- ✅ Cache expires after 7 days
- ✅ Error handling works (429, corrupt cache)
- ✅ Fallback to manual input when needed

### User Experience:
- ✅ No visible difference (same UI)
- ✅ Faster loading (bonus for returning users)
- ✅ Never blocked by cache issues
- ✅ Works in incognito (no cache, uses API)

---

## 🐛 Known Issues & Workarounds

### Issue: "Dropdown still slow even with cache"
**Check:**
```javascript
// Verify cache exists
console.log(localStorage.getItem('rajaongkir_checkout_v1_provinces'));

// Check console for cache hit log
// Should see: "Using cached provinces"
```
**If no cache log:**
- Cache might be cleared by browser
- Check browser settings (disable auto-clear)

### Issue: "Different data on mobile vs desktop"
**Explanation:**
- This is CORRECT behavior
- localStorage is per-device
- Each device has its own cache
- Not a bug! ✅

### Issue: "New province not showing up"
**Solution:**
```javascript
// Clear cache to force refresh
localStorage.removeItem('rajaongkir_checkout_v1_provinces');
// Or wait 7 days for auto-expiry
// Or bump version to v2
```

---

## 📈 Monitoring Checklist

After deployment, monitor these metrics:

### Week 1:
- [ ] API call count dropped? (Target: 70% reduction)
- [ ] Console logs show cache hits? (Target: >50%)
- [ ] No error spike? (Target: <1% error rate)
- [ ] User complaints? (Target: 0 complaints)

### Week 2-4:
- [ ] Cache hit rate increasing? (Target: >70%)
- [ ] API quota stable? (Target: <100 calls/day)
- [ ] localStorage size OK? (Target: <5MB)
- [ ] Load time improved? (Target: <100ms average)

---

## ✅ Final Checklist

Before marking cache as "production-ready":

- [x] Code implemented in `useShipping.ts`
- [x] Cache version defined (v1)
- [x] Fallback data defined (34 provinces)
- [x] Error handling implemented
- [x] Console logging added
- [ ] Test Case 1 passed (first-time user)
- [ ] Test Case 2 passed (returning user)
- [ ] Test Case 3 passed (different province)
- [ ] Test Case 5 passed (rate limit fallback)
- [ ] Test Case 6 passed (corrupted cache)
- [ ] No TypeScript errors
- [ ] No console errors (except expected 429)

---

**Testing Duration:** ~30 minutes for all test cases  
**Best Time to Test:** After API quota reset (tomorrow)  
**Tools Needed:** Browser DevTools, Console, Network Tab  
**Status:** Ready to test! 🚀
