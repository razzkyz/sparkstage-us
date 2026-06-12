## Debug Kasir Product Scanning - Checklist Fix

### 🎯 QUICK FIX (Do This First!)

**Error: Modal muncul tapi tidak ada kamera**

This is a **Permissions Policy violation**. Quick fix:

**Step 1: Update Frontend Code**
```bash
cd c:\SparkDoku\sparkstage
npm run dev
# Wait for "ready on http://localhost:5173"
# This loads the new Permissions-Policy meta tag fix
```

**Step 2: Clear Browser & Grant Camera Permission**
```bash
1. Close browser completely
2. Press Ctrl+Shift+Del in browser (clear cache)
3. Restart browser
4. Go to http://localhost:5173
5. Login as kasir@gmail.com / pin832295
6. Click "Scan QR Produk"
7. Click "Aktifkan Pemindai"
8. Browser will prompt: "Allow camera access?" → Click ALLOW
9. Camera feed should appear!
```

**Step 3: Verify It Works**
- ✅ Modal appears with live camera feed
- ✅ "Arahkan ke QR Code" text at bottom
- ✅ Can scan or type QR code manually

---

### 🔧 Issues Found & Fixed

#### ✅ 1. Missing `useUserRole` Hook
**Problem:** 
- `ProductPickup.tsx` importing `useUserRole` dari path yang tidak ada
- File `frontend/src/hooks/useUserRole.ts` missing completely
- This caused import error dan component tidak bisa render

**Solution:** 
- Created `frontend/src/hooks/useUserRole.ts` dengan proper implementation
- Hook fetch user role dari database using `lookupUserRole()` function
- Returns `{ role, loading, error }` object

**Status:** ✅ FIXED

---

### 🔍 Kasir Scanning - Debug Checklist

#### ✅ MAJOR FIX: Permissions Policy Issue

**Problem Found:**
```
[Violation] Permissions policy violation: camera is not allowed in this document.
```

**Causes:**
- Browser Permissions Policy blocking camera access
- Camera not allowed in browser settings
- Missing Permissions-Policy meta tag

**Solutions Applied:** ✓
1. Added `Permissions-Policy` meta tag to `frontend/index.html`
2. Improved error messages in scanner modal
3. Better error detection for permission violations

**What you need to do:**

Option A (Quick - Browser Settings):
```bash
1. Open browser (Chrome/Firefox/Edge)
2. Address bar → Settings icon → Settings
3. Go to: Privacy & Security → Site settings → Camera
4. Find: localhost:5173 (or your domain)
5. Set to: "Allow"
6. Refresh page & try scan again
```

Option B (If Option A doesn't work):
```bash
1. Completely close browser
2. Delete browser cache & cookies (or clear site data)
3. Restart browser
4. Go to http://localhost:5173/login
5. Login again as kasir
6. Try scanning
7. When browser prompts for camera permission → Click "Allow"
```

**After fix:**
- Scanner modal should show camera feed (live video)
- Bottom of video will show "Arahkan ke QR Code" indicator
- Can scan or type QR code manually

```bash
# Login ke Supabase Dashboard → SQL Editor
# Run query ini untuk verify kasir sudah ada:

SELECT 
    ura.user_id,
    ura.role_name,
    u.email,
    u.created_at
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE ura.role_name = 'kasir'
ORDER BY u.created_at DESC;
```

**Expected Result:**
- Should see row(s) dengan `role_name = 'kasir'`
- If no result → SETUP KASIR ROLE (lihat Step 2)

#### Step 2: Create Kasir User (if not exists)

**Via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard
2. Project: Spark Stage
3. Menu: Authentication → Users
4. Click: "+ Add user"
5. Email: `kasir@gmail.com`
6. Password: [pilih password aman]
7. Click: "Create user"
8. **COPY User ID (UUID format)**

**Then assign role via SQL:**
```sql
INSERT INTO public.user_role_assignments (user_id, role_name, created_at)
VALUES ('{PASTE_UUID_HERE}', 'kasir', NOW())
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Verify:
SELECT * FROM public.user_role_assignments 
WHERE user_id = '{PASTE_UUID_HERE}';
```

#### Step 3: Frontend - Verify Hook Loading

**Check browser DevTools (F12) → Console:**

```javascript
// Paste ini di console:
document.addEventListener('DOMContentLoaded', () => {
  console.log('✓ Page loaded');
});

// Jika lihat error tentang "useUserRole":
// → Hook tidak ter-import dengan baik
// → Cek: frontend/src/hooks/useUserRole.ts exists
```

#### Step 3B: Verify Permissions Policy Fixed ✅

**Check if Permissions-Policy is set:**

```javascript
// Di browser console, paste ini:
const metaTags = document.querySelectorAll('meta');
metaTags.forEach(tag => {
  if (tag.getAttribute('http-equiv') === 'Permissions-Policy') {
    console.log('✓ Permissions-Policy found:', tag.getAttribute('content'));
  }
});

// Should show: "camera=(*), microphone=(*)"
// If NOT shown → Frontend code not updated yet
```

**If Permissions-Policy not found:**
1. Make sure you're running latest code (`npm run dev`)
2. Hard refresh browser (Ctrl+Shift+Del then Ctrl+F5)
3. Check browser cache is cleared

#### Step 4: Test Login & Navigation

**Login Flow:**
1. Logout dari akun current
2. Go to: http://localhost:5173/login
3. Email: `kasir@gmail.com`
4. Password: [password yg dibuat di Step 2]
5. Click: Login

**Expected Result:**
- ✅ Redirect ke `/admin/cashier-dashboard`
- ✅ Sidebar show: "Penjualan" section
- ✅ Menu items: Dashboard, Cek Pesanan, **Scan QR Produk**

**If redirect fails:**
- Check: `frontend/src/pages/Login.tsx` role handling
- Check: Browser console for errors
- Check: Network tab in DevTools

#### Step 5: Test Product Scan Page

**After successful login:**
1. Click menu: "Scan QR Produk"
2. Should go to: `/admin/product-pickup`
3. Click button: "Aktifkan Pemindai"

**Expected:**
- ✅ QR Scanner modal opens
- ✅ Camera feed visible
- ✅ Can scan OR type manually

**If scanner tidak muncul:**

a) **Camera Permission Issue:**
```javascript
// Check permissions via console:
navigator.permissions.query({ name: 'camera' }).then(r => {
  console.log('Camera permission:', r.state); // 'granted' = OK
});
```
- Solution: Allow camera in browser permissions
- Go to: Browser Settings → Privacy → Camera → Allow for localhost

b) **Html5Qrcode Library Issue:**
```javascript
// Check if library loaded:
console.log(typeof Html5Qrcode); // should be 'function'
```
- Solution: Run `npm run build` then restart dev server

c) **React State Issue:**
```javascript
// Check console for React errors
// Look for: "Cannot read property 'showScanner'"
```
- Solution: Clear browser cache, hard refresh (Ctrl+F5)

#### Step 6: Test Actual Scan

**Setup Product QR Code (for testing):**

1. Create test product order dengan QR code
2. Get `pickup_code` dari order

**Test Scan:**
1. Open QR Scanner modal
2. Point camera at QR code
3. Should show: Success or Error message

**Expected Success:**
```
✓ Hasil Scan:
  Order ID: 12345
  Pickup Code: PRX-XXXXX
  Status: [status]
```

**If fails with "Forbidden":**
- RLS policy blocked kasir access
- Solution: Check RLS policy allow role='kasir' read access

---

### 📱 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "useUserRole not found" | Hook file missing | ✅ Already fixed - hook created |
| Scanner not opening | Camera permission denied | Allow camera in browser |
| Scanner black screen | Library not loaded | Run `npm run build` |
| "Cannot scan" with manual entry | Session/auth issue | Logout & login again |
| "Forbidden" error on scan | RLS policy | Check `frontend/src/pages/admin/product-pickup/` RLS |
| Kasir redirected to wrong page | Role not assigned | Run SQL in Step 2 |

---

### 🚀 Post-Fix Checklist

- [ ] Kasir user created in Supabase
- [ ] Kasir role assigned in database
- [ ] Frontend dev server running (`npm run dev`)
- [ ] Kasir login successful
- [ ] Can navigate to "Scan QR Produk" page
- [ ] Scanner modal opens on button click
- [ ] Camera permission granted in browser
- [ ] Can scan OR type QR code manually
- [ ] Scan result shows success/error message

---

### 📞 If Still Not Working

**Debugging Steps:**

1. **Check Console Errors:**
   - F12 → Console tab
   - Look for red error messages
   - Screenshot and share

2. **Check Network Requests:**
   - F12 → Network tab
   - Try to scan
   - Look for failed requests (404, 403, 500)
   - Check response body

3. **Check Database:**
   - Verify kasir role exists (Step 1)
   - Verify RLS policies allow read access
   - Run test query to confirm permissions

4. **Restart Everything:**
   ```bash
   # Backend:
   npm run supabase:db:push
   npm run supabase:functions:serve
   
   # Frontend:
   npm run dev
   ```

5. **Report Issues:**
   - Browser: Chrome/Firefox version
   - OS: Windows/Mac/Linux
   - URL: localhost or production
   - Error message (full screenshot)
   - Network response body (F12)

---

**Last Updated:** May 22, 2026
**Status:** Hook implemented ✅ | Awaiting user testing
