# 🚀 SETUP DRESS@GMAIL.COM - COMPLETE SOLUTION

## 🔴 PROBLEM

User `dress@gmail.com` (role: `dressing_room_admin`) mendapat error **"Forbidden"** saat:
- Edit dressing room data
- Manage rental orders
- Edit products/inventory

**Root Cause:** Function `public.is_admin()` hanya check role `'admin'`, tidak termasuk `dressing_room_admin`. Ini menyebabkan RLS policies tidak grant akses.

---

## ✅ SOLUTION - 3 STEPS

### STEP 1️⃣: Fix Database Function (PENTING!)

Buka [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new) dan jalankan:

```sql
-- Drop existing function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create updated function that checks for ALL admin roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.uid()
      AND ura.role_name IN (
        'admin',
        'super_admin',
        'super-admin',
        'ticket_admin',
        'retail_admin',
        'dressing_room_admin'
      )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

✅ **Result:** Verify success dengan SQL ini:
```sql
SELECT 'Function updated successfully!' as status;
```

---

### STEP 2️⃣: Assign Role ke User

#### Option A: Via Supabase Web Console (Recommended)

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Authentication** → **Users**
3. Cari `dress@gmail.com`
4. Copy user ID (UUID format)
5. Go to **SQL Editor** dan jalankan:

```sql
-- Replace {USER_ID} dengan UUID dari step 4
INSERT INTO public.user_role_assignments (user_id, role_name)
VALUES ('{USER_ID}', 'dressing_room_admin')
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Verify ✅
SELECT ura.user_id, ura.role_name, u.email
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'dress@gmail.com';
```

#### Option B: Create New User dengan Role

Jika user belum ada, jalankan di SQL Editor:

```sql
-- Create auth user (pastikan email belum ada!)
-- Note: Anda perlu gunakan Supabase Auth API atau manage via UI
-- Untuk saat ini, assume user sudah di-create via UI

-- Then assign role (replace {USER_ID})
INSERT INTO public.user_role_assignments (user_id, role_name)
VALUES ('{USER_ID}', 'dressing_room_admin');
```

✅ **Verify:** Output harus show `dress@gmail.com` dengan role `dressing_room_admin`

---

### STEP 3️⃣: Force Re-Login

**PENTING!** User HARUS logout dan login ulang agar RLS policies ter-refresh:

1. Click **Logout** di navbar
2. Go ke login page: https://sparkstage.com/login
3. Login dengan `dress@gmail.com` dan password
4. Refresh page (F5)

✅ **Verify:** Sidebar harus tampil dengan menu Dressing Room

---

## ✨ EXPECTED RESULT

Setelah semua 3 steps, user `dress@gmail.com` bisa:

### Sidebar Menu ✅
```
Toko
├── Pesanan Produk (shopping_bag)
├── Scan Pickup Produk (qr_code_scanner)
├── Voucher & Diskon (confirmation_number)
└── Stok & Produk (inventory_2)

Dressing Room  ← CAN EDIT ✅
├── Dressing Room Manager (styler)
├── Sewa Dressing Room (checkroom)
└── Scan QR Customer (qr_code_scanner)
```

### Database Access ✅
| Resource | Permission | Status |
|----------|-----------|--------|
| Dressing Room Collections | ALL | ✅ |
| Dressing Room Looks | ALL | ✅ |
| Products & Variants | ALL | ✅ |
| Rental Orders | ALL | ✅ |
| Order Products | SELECT, UPDATE | ✅ |
| Vouchers | ALL | ✅ |

---

## 🔍 TROUBLESHOOTING

### Problem: Sidebar tidak menampilkan Dressing Room menu

**Solution:**
```
1. Logout dan login ulang
2. Clear browser cache: Ctrl+Shift+Delete
3. Force refresh: Ctrl+F5
4. Check DevTools Console untuk JS errors
```

### Problem: Masih dapat "Forbidden" error

**Check 1: Verify role di database**
```sql
SELECT ura.user_id, ura.role_name, u.email
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'dress@gmail.com';
```
✅ Expected: harus return row dengan `role_name = 'dressing_room_admin'`

**Check 2: Verify function sudah di-update**
```sql
SELECT public.is_admin(); -- Should return TRUE for dressing_room_admin user
```

**Check 3: Check RLS policy**
```sql
SELECT EXISTS (
  SELECT 1 FROM public.user_role_assignments
  WHERE user_id = 'DRESS_USER_ID_HERE' 
  AND role_name = 'dressing_room_admin'
);
```

**Check 4: Monitor network error**
- Buka DevTools (F12) → Network tab
- Coba edit data dressing room
- Check response dari API - lihat error message

### Problem: Can't find user ID

**Command to get user ID:**
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'dress@gmail.com';
```

---

## 📝 DEPLOYMENT CHECKLIST

- [ ] Run Step 1️⃣ SQL (fix `is_admin()` function)
- [ ] Verify function berhasil di-update
- [ ] Run Step 2️⃣ SQL (assign role)
- [ ] Verify user punya role
- [ ] User logout & login ulang
- [ ] Check sidebar menu Dressing Room muncul
- [ ] Try edit dressing room - tidak ada forbidden error
- [ ] Try edit rental orders - not forbidden

---

## 🔧 Files Updated

| File | Change |
|------|--------|
| `supabase/migrations/20260516000001_fix_is_admin_function_for_all_roles.sql` | New migration to fix is_admin() function |
| `frontend/src/constants/adminMenu.ts` | Already includes DRESSING_ROOM_ADMIN_MENU_SECTIONS |
| `frontend/src/auth/adminRole.ts` | Already includes dressing_room_admin in ADMIN_ROLES |
| `frontend/src/pages/Login.tsx` | Already routes dressing_room_admin to dashboard |

---

## 📞 QUICK REFERENCE

| Action | SQL |
|--------|-----|
| Get user ID | `SELECT id FROM auth.users WHERE email = 'dress@gmail.com'` |
| Assign role | `INSERT INTO user_role_assignments VALUES ('{USER_ID}', 'dressing_room_admin')` |
| Check role | `SELECT * FROM user_role_assignments WHERE user_id = '{USER_ID}'` |
| Test is_admin() | `SELECT public.is_admin()` |
| List admin users | `SELECT DISTINCT ura.role_name FROM user_role_assignments ura` |

---

## 📱 After Setup Complete

User bisa login dan:
1. ✅ Access `/admin/dashboard` redirect ke dressing room dashboard
2. ✅ Edit dressing room items (create, update, delete)
3. ✅ Manage rental orders
4. ✅ Manage products & inventory
5. ✅ Create vouchers & discounts
6. ✅ Scan QR for customer pickup
7. ✅ Scan QR for dressing room operations

---

**Last Updated:** May 16, 2026
