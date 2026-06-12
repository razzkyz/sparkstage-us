# 🧪 Shipping Integration - Testing Guide

**Phase 1 Deployment Testing**  
**Date:** 2026-06-10

---

## 🎯 Testing Objectives

1. ✅ Verify database migration successful
2. ✅ Test existing pickup orders still work (backward compatibility)
3. ✅ Test new shipping orders with delivery
4. ✅ Verify shipping cost calculation
5. ✅ Verify payment total includes shipping
6. ✅ Verify order data saved correctly
7. ✅ Test ship-product-order function

---

## 📋 Pre-Flight Checks

### 1. Verify Database Migration

```sql
-- Check if shipping columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'order_products'
  AND column_name IN (
    'shipping_address',
    'shipping_province_id',
    'shipping_city_id',
    'shipping_subdistrict_id',
    'shipping_courier',
    'shipping_service',
    'tracking_number',
    'shipped_at',
    'estimated_delivery_date'
  )
ORDER BY column_name;
```

**Expected Result:** Should return 9 rows, all with `is_nullable = YES`

### 2. Check Existing Orders Still Valid

```sql
-- Verify existing orders unaffected
SELECT 
  order_number,
  payment_status,
  pickup_status,
  shipping_courier,
  shipping_cost,
  total,
  created_at
FROM order_products
WHERE created_at < NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:** Old orders should have `shipping_courier = NULL`

### 3. Check Indexes Created

```sql
-- Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'order_products'
  AND indexname LIKE '%shipping%'
ORDER BY indexname;
```

**Expected Result:** Should see 3 indexes:
- `idx_order_products_shipping_courier`
- `idx_order_products_tracking_number`
- `idx_order_products_shipped_at`

---

## 🧪 Test Scenarios

### Test 1: Backward Compatibility - Pickup Order ✅

**Objective:** Ensure existing pickup flow still works

**Steps:**
1. Go to product page
2. Add product to cart
3. Go to checkout
4. **Keep "Pickup" selected** (default)
5. Fill customer name and email
6. Click "Pay Now"
7. Complete DOKU payment (or cancel)

**Verify in Database:**
```sql
SELECT 
  order_number,
  channel,
  shipping_courier,
  shipping_cost,
  subtotal,
  total,
  payment_status
FROM order_products
WHERE order_number = 'PRD-XXXXXX' -- Your test order number
```

**Expected:**
- ✅ `shipping_courier` = `NULL`
- ✅ `shipping_cost` = `0`
- ✅ `total` = `subtotal` (no shipping added)
- ✅ `shipping_address` = `NULL`
- ✅ Order created successfully

**Status:** PASS ✅ / FAIL ❌

---

### Test 2: Shipping Order - Full Flow ✅

**Objective:** Test end-to-end shipping integration

**Steps:**

#### 2.1. Add Product to Cart
1. Browse to `/products`
2. Select a product
3. Add to cart
4. Note the product price

#### 2.2. Start Checkout
1. Go to `/cart`
2. Click "Checkout"
3. Should land on `/checkout`

#### 2.3. Select Delivery Method
1. In "Metode Pengiriman" section
2. **Select "Delivery (Dikirim ke Alamat)"**
3. Delivery form should appear

#### 2.4. Fill Shipping Address
1. Enter full address in text field
2. Select **Province** from dropdown (e.g., "DKI Jakarta")
   - Wait for cities to load
3. Select **City** from dropdown (e.g., "Jakarta Barat")
   - Wait for districts to load
4. Select **District** from dropdown (e.g., "Kebon Jeruk")
   - Wait for shipping costs to calculate

#### 2.5. Choose Courier & Service
1. Courier options should appear (JNE, TIKI, POS, etc.)
2. Select a courier (e.g., "JNE")
3. Service options appear (REG, OKE, YES)
4. Select a service (e.g., "REG")
5. **Note the shipping cost shown**

#### 2.6. Verify Total Calculation
Check the summary card:
- Subtotal: [product price]
- Ongkir: [shipping cost]
- **Total: Subtotal + Ongkir**

**Screenshot or note the amounts!**

#### 2.7. Complete Payment
1. Fill customer name and email
2. Click "Pay Now"
3. DOKU popup should open
4. Check DOKU invoice line items:
   - ✅ Product item with price
   - ✅ **Shipping line item** (e.g., "Shipping JNE REG")
   - ✅ Total matches checkout total
5. Complete payment (or close popup to test pending)

#### 2.8. Verify Order Created
Get order number from success page URL or database:

```sql
-- Find your test order
SELECT 
  order_number,
  shipping_courier,
  shipping_service,
  shipping_cost,
  LEFT(shipping_address, 100) as address_preview,
  shipping_province_id,
  shipping_city_id,
  shipping_subdistrict_id,
  subtotal,
  total,
  payment_status,
  status,
  created_at
FROM order_products
WHERE user_id = 'YOUR_USER_ID' -- Your test user
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ `shipping_courier` = `'jne'` (lowercase)
- ✅ `shipping_service` = `'REG'` (uppercase)
- ✅ `shipping_cost` = actual cost (e.g., 15000)
- ✅ `shipping_address` = your entered address
- ✅ `shipping_province_id` = RajaOngkir province ID
- ✅ `shipping_city_id` = RajaOngkir city ID
- ✅ `shipping_subdistrict_id` = RajaOngkir district ID
- ✅ `total` = `subtotal + shipping_cost`
- ✅ `tracking_number` = `NULL` (not shipped yet)
- ✅ `shipped_at` = `NULL`

**Status:** PASS ✅ / FAIL ❌

**Notes:**
```
Subtotal: Rp _______
Shipping: Rp _______
Total: Rp _______
DB Total Match: YES / NO
```

---

### Test 3: Shipping Cost Accuracy ✅

**Objective:** Verify RajaOngkir cost calculation is correct

**Steps:**
1. Go to RajaOngkir website directly: https://rajaongkir.com/
2. Use same:
   - Origin: Your store location
   - Destination: Test address (province/city/district)
   - Weight: Test product weight
   - Courier: Same courier (JNE)
3. Compare costs

**Verify:**
```sql
SELECT 
  order_number,
  shipping_courier,
  shipping_service,
  shipping_cost
FROM order_products
WHERE order_number = 'PRD-XXXXXX'
```

**Expected:** Cost should match RajaOngkir calculation (±Rp 1000 tolerance for cache)

**Status:** PASS ✅ / FAIL ❌

---

### Test 4: Payment Total Validation ✅

**Objective:** Ensure DOKU receives correct total

**Steps:**
1. Create shipping order
2. Open DOKU payment popup
3. Check invoice details

**Verify DOKU Line Items:**
```
Example Expected:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product Name             Rp 100,000
Shipping JNE REG         Rp  15,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                    Rp 115,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Check Database payment_data:**
```sql
SELECT 
  order_number,
  payment_data->'order'->>'amount' as doku_amount,
  total,
  (payment_data->'order'->>'amount')::numeric = total as amounts_match
FROM order_products
WHERE order_number = 'PRD-XXXXXX';
```

**Expected:** `amounts_match` = `TRUE`

**Status:** PASS ✅ / FAIL ❌

---

### Test 5: Ship Order Function (Admin) ✅

**Objective:** Test admin can mark order as shipped

**Prerequisites:**
- Have a paid shipping order (payment_status = 'paid')
- Be logged in as admin
- Have order number and want to add tracking

**Steps:**

#### 5.1. Get Admin Token
```javascript
// In browser console on your app
console.log(localStorage.getItem('supabase.auth.token'));
// Or from Supabase client
const { data: { session } } = await supabase.auth.getSession();
console.log(session.access_token);
```

#### 5.2. Call Ship Order Function

**Using cURL:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ship-product-order \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "PRD-1234567890-ABCDE",
    "trackingNumber": "JNE1234567890123"
  }'
```

**Using Browser Console:**
```javascript
// On your app page while logged in as admin
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/ship-product-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderNumber: 'PRD-XXXXXX', // Your test order
    trackingNumber: 'JNE1234567890123'
  })
});
const result = await response.json();
console.log(result);
```

**Expected Response:**
```json
{
  "success": true,
  "order_number": "PRD-XXXXXX",
  "tracking_number": "JNE1234567890123",
  "shipped_at": "2026-06-10T12:34:56.789Z"
}
```

#### 5.3. Verify Database Updated

```sql
SELECT 
  order_number,
  tracking_number,
  shipped_at,
  status,
  updated_at
FROM order_products
WHERE order_number = 'PRD-XXXXXX';
```

**Expected:**
- ✅ `tracking_number` = `'JNE1234567890123'`
- ✅ `shipped_at` = timestamp (not NULL)
- ✅ `status` = `'shipped'`
- ✅ `updated_at` = recent timestamp

**Status:** PASS ✅ / FAIL ❌

---

### Test 6: Ship Order Validations ✅

**Objective:** Test edge cases and error handling

#### 6.1. Ship Unpaid Order (Should Fail)
```javascript
// Try to ship order that's not paid yet
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/ship-product-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderNumber: 'PRD-UNPAID-ORDER',
    trackingNumber: 'TEST123'
  })
});
console.log(await response.json());
```

**Expected:** `{ "error": "Order must be paid before shipping" }` (400)

**Status:** PASS ✅ / FAIL ❌

#### 6.2. Ship Pickup Order (Should Fail)
```javascript
// Try to ship order without shipping_courier (pickup only)
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/ship-product-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderNumber: 'PRD-PICKUP-ORDER',
    trackingNumber: 'TEST123'
  })
});
console.log(await response.json());
```

**Expected:** `{ "error": "Order is pickup only (no shipping)" }` (400)

**Status:** PASS ✅ / FAIL ❌

#### 6.3. Ship Already Shipped Order (Should Fail)
```javascript
// Try to ship order that already has tracking number
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/ship-product-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderNumber: 'PRD-ALREADY-SHIPPED',
    trackingNumber: 'NEW-TRACKING-123'
  })
});
console.log(await response.json());
```

**Expected:** `{ "error": "Order already shipped with tracking: ..." }` (400)

**Status:** PASS ✅ / FAIL ❌

#### 6.4. Ship as Non-Admin (Should Fail)
```javascript
// Try to ship order with customer token (non-admin)
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/ship-product-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${customerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderNumber: 'PRD-XXXXX',
    trackingNumber: 'TEST123'
  })
});
console.log(await response.json());
```

**Expected:** `{ "error": "Admin access required" }` (403)

**Status:** PASS ✅ / FAIL ❌

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Backward Compatibility (Pickup) | ⬜ | |
| 2. Shipping Order Full Flow | ⬜ | |
| 3. Shipping Cost Accuracy | ⬜ | |
| 4. Payment Total Validation | ⬜ | |
| 5. Ship Order Function (Admin) | ⬜ | |
| 6.1. Ship Unpaid Order Validation | ⬜ | |
| 6.2. Ship Pickup Order Validation | ⬜ | |
| 6.3. Duplicate Ship Validation | ⬜ | |
| 6.4. Non-Admin Ship Validation | ⬜ | |

**Legend:** ✅ Pass | ❌ Fail | ⬜ Not Tested

---

## 🐛 Common Issues & Solutions

### Issue 1: Shipping Cost Not Showing
**Symptoms:** Courier options don't appear or costs are 0

**Check:**
1. RajaOngkir API key valid? Check `.env` file
2. Province/City/District selected correctly?
3. Check browser console for errors
4. Check RajaOngkir rate limit (max requests per minute)

**Solution:**
```javascript
// Check localStorage cache
console.log(localStorage.getItem('rajaongkir_cache'));

// Clear cache if stale
localStorage.removeItem('rajaongkir_cache');
```

### Issue 2: Total Not Including Shipping
**Symptoms:** Total = Subtotal even with shipping selected

**Check:**
```javascript
// In CheckoutShippingSection component
console.log('Selected courier:', shippingCourier);
console.log('Selected service:', shippingService);
console.log('Shipping cost:', shippingCost);

// In useProductCheckoutController
console.log('Actual shipping cost:', actualShippingCost);
console.log('Final total:', finalTotal);
```

**Solution:** Verify `deliveryMethod === 'shipping'` and `shippingCost > 0`

### Issue 3: Database Shipping Fields NULL
**Symptoms:** Order created but shipping data not saved

**Check Backend Logs:**
```sql
-- Check Supabase Edge Function logs
-- Look for errors in create-doku-product-checkout

-- Check if data was sent
SELECT 
  order_number,
  payment_data
FROM order_products
WHERE order_number = 'PRD-XXXXX';
```

**Solution:** Verify payload sent to backend includes shipping fields

### Issue 4: Ship Order Function 403 Error
**Symptoms:** Can't call ship-product-order function

**Check:**
```sql
-- Verify user has admin role
SELECT role
FROM user_role_assignments
WHERE user_id = 'YOUR_USER_ID';
```

**Solution:** Assign admin role if missing:
```sql
INSERT INTO user_role_assignments (user_id, role, created_at)
VALUES ('YOUR_USER_ID', 'admin', NOW())
ON CONFLICT DO NOTHING;
```

---

## ✅ Success Criteria

**Phase 1 is successful if:**

- ✅ All 9 tests pass
- ✅ Pickup orders still work (backward compatible)
- ✅ Shipping orders save complete data
- ✅ Payment totals are accurate
- ✅ DOKU shows shipping correctly
- ✅ Admin can mark orders as shipped
- ✅ Validation prevents invalid operations

**If any test fails:**
1. Note the specific issue
2. Check Common Issues section
3. Review error logs
4. Can rollback migration if critical

---

## 📝 Test Report Template

```
=================================
SHIPPING INTEGRATION TEST REPORT
=================================

Date: 2026-06-__
Tester: _____________
Environment: Production / Staging

Pre-Flight Checks:
☐ Database migration verified
☐ Existing orders unaffected
☐ Indexes created

Test Results:
☐ Test 1: Pickup order - PASS / FAIL
☐ Test 2: Shipping order - PASS / FAIL
☐ Test 3: Cost accuracy - PASS / FAIL
☐ Test 4: Payment total - PASS / FAIL
☐ Test 5: Ship function - PASS / FAIL
☐ Test 6: Validations - PASS / FAIL

Issues Found:
1. _____________________
2. _____________________

Overall Status: ✅ PASS / ❌ FAIL

Notes:
_________________________
_________________________
```

---

**Ready to test? Start with Test 1 (Pickup Order) untuk verify backward compatibility dulu! 🚀**
