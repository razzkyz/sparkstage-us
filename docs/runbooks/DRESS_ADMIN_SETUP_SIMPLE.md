# Setup Dress Admin Role - Dokumentasi

## 🎯 Overview

Role `dress` (dressing_room_admin) untuk staff yang manage dressing room & products:
- Dashboard dressing room management
- Edit dressing room collections & looks
- Manage rental orders & customer pickups
- Manage product inventory & vouchers
- Scan QR untuk customer operations

---

## ⚠️ CRITICAL: Database Fix First!

**Sebelum setup**, jalankan SQL ini di [Supabase SQL Editor](https://supabase.com/dashboard):

```sql
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

✅ **Why?** Function lama hanya check `'admin'` role. Ini fix supaya dressing_room_admin bisa akses rental orders tanpa forbidden.

---

## 📋 Setup Steps (Like Kasir)

### Step 1️⃣: Create User di Supabase Auth

**Via Supabase Dashboard:**
1. Login ke https://supabase.com/dashboard
2. Pilih project
3. **Authentication** → **Users**
4. Click **+ Add user**
5. Email: `dress@gmail.com`
6. Password: [set password yang aman]
7. Click **Create user**

📝 **Catat User ID** (UUID format)

---

### Step 2️⃣: Assign Role ke User

**Via SQL di Supabase SQL Editor:**

```sql
-- Ganti {USER_ID} dengan UUID dari Step 1
INSERT INTO public.user_role_assignments (user_id, role_name)
VALUES ('{USER_ID}', 'dressing_room_admin')
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Verify ✅
SELECT * FROM user_role_assignments 
WHERE user_id = '{USER_ID}';
```

✅ Must return: `role_name = 'dressing_room_admin'`

---

### Step 3️⃣: Force Re-Login

**PENTING!** User HARUS logout & login ulang:

1. **Logout** dari app
2. Go to login: https://sparkstage.com/login
3. Email: `dress@gmail.com`
4. Password: [dari Step 1]
5. **Force refresh:** Ctrl+F5

✅ Sidebar should show **Dressing Room** menu

---

## ✨ Expected Result

### Sidebar Menu ✅
```
Toko
├── Pesanan Produk
├── Scan Pickup Produk
├── Voucher & Diskon
└── Stok & Produk

Dressing Room  ← CAN EDIT ✅
├── Dressing Room Manager
├── Sewa Dressing Room
└── Scan QR Customer
```

---

## 🔍 Troubleshooting

### ❌ Sidebar tidak tampil Dressing Room

**1. Logout & Re-login:**
```
- Logout dari app
- Clear cache: Ctrl+Shift+Delete
- Login lagi
- Force refresh: Ctrl+F5
```

**2. Verify Role di Database:**
```sql
SELECT * FROM user_role_assignments 
WHERE user_id = '{USER_ID}' 
AND role_name = 'dressing_room_admin';
```

### ❌ Masih dapat "Forbidden" error

**1. Check is_admin() Function:**
```sql
SELECT public.is_admin(); -- Should return TRUE
```

**2. Check DevTools Network Tab:**
- Open F12 → Network
- Try edit dressing room
- Check API error response

### ❌ Can't find User ID

**Get User ID via SQL:**
```sql
SELECT id, email FROM auth.users WHERE email = 'dress@gmail.com';
```

---

## 📋 Checklist

- [ ] Run is_admin() fix SQL (Step 0)
- [ ] Create user `dress@gmail.com` (Step 1)
- [ ] Assign role via SQL (Step 2)
- [ ] User logout & login (Step 3)
- [ ] Verify sidebar shows Dressing Room menu
- [ ] Test edit dressing room - no forbidden error

---

**Last Updated:** May 16, 2026
