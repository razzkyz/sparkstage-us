# Setup Dressing Room Admin Role untuk dress@gmail.com

## 🎯 Tujuan
Setup user `dress@gmail.com` dengan role `dressing_room_admin` agar bisa:
- Akses menu Dressing Room di sidebar
- Edit dan manage dressing room items
- Manage product orders, vouchers, inventory
- Manage rental orders tanpa forbidden error

## ⚠️ **CRITICAL: Database Fix Required First!**

**Sebelum** assign role ke user, jalankan SQL ini di Supabase SQL Editor untuk fix `is_admin()` function:

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

**Why?** Fungsi lama hanya check `'admin'` role, tidak termasuk `dressing_room_admin`. Ini menyebabkan RLS policy `Admins can manage rental orders` tidak berlaku untuk dressing room admin!

---

## 📋 Pilihan Setup

### Opsi 1: Via Supabase Web Console (Recommended untuk testing)

1. **Login ke Supabase Dashboard**
   - Buka https://supabase.com/dashboard
   - Pilih project Spark Stage

2. **Cari User ID dress@gmail.com**
   - Klik **Authentication** → **Users**
   - Cari email `dress@gmail.com`
   - Salin User ID (UUID format)

3. **Jalankan SQL di Supabase SQL Editor**
   ```sql
   -- Replace {USER_ID} dengan UUID dari step 2
   INSERT INTO public.user_role_assignments (user_id, role_name)
   VALUES ('{USER_ID}', 'dressing_room_admin')
   ON CONFLICT (user_id, role_name) DO NOTHING;
   
   -- Verify
   SELECT ura.user_id, ura.role_name, u.email
   FROM public.user_role_assignments ura
   JOIN auth.users u ON u.id = ura.user_id
   WHERE u.email = 'dress@gmail.com';
   ```

### Opsi 2: Via Supabase CLI

```bash
# 1. Set environment variables di terminal
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

# 2. Run setup script
node scripts/setup-dress-admin-role.js
```

### Opsi 3: Raw SQL File

```bash
# Run SQL migration langsung
supabase db push scripts/setup-dress-admin.sql
```

---

## 🔧 Troubleshooting "Forbidden" Error

Jika setelah setup user masih dapat error "forbidden" saat edit data:

### 1️⃣ Verify Role di Database
```sql
-- Check apakah role sudah di-assign
SELECT ura.user_id, ura.role_name, u.email
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'dress@gmail.com';

-- Expected output:
-- user_id | role_name               | email
-- --------|-------------------------|------------------
-- [UUID] | dressing_room_admin     | dress@gmail.com
```

### 2️⃣ Force Re-Login
Setelah role di-assign, user HARUS logout dan login ulang agar RLS policies ter-refresh:
1. Click **Logout** di navbar
2. Login kembali dengan `dress@gmail.com`
3. Refresh page (F5)

### 3️⃣ Clear Browser Cache
```javascript
// Di browser console saat login
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### 4️⃣ Verify RLS Policies
Check apakah RLS policies correct di database:

```sql
-- List semua dressing_room_admin policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE policyname ILIKE '%dra%' OR policyname ILIKE '%dressing_room_admin%'
ORDER BY tablename, policyname;
```

---

## 🚀 Quick Checklist

- [ ] User `dress@gmail.com` sudah ada di Authentication → Users
- [ ] Role `dressing_room_admin` sudah di-assign di `user_role_assignments`
- [ ] User sudah **logout dan login ulang** setelah role di-assign
- [ ] Sidebar menampilkan menu "Dressing Room"
- [ ] Bisa akses `/admin/dressing-room`
- [ ] Bisa edit data tanpa forbidden error

---

## 📝 Sidebar Menu yang Seharusnya Tampil

Jika role berhasil di-assign dan user logout/login ulang, sidebar harus tampil:

```
Toko
├── Pesanan Produk (shopping_bag)
├── Scan Pickup Produk (qr_code_scanner)
├── Voucher & Diskon (confirmation_number)
└── Stok & Produk (inventory_2)

Dressing Room
├── Dressing Room Manager (styler) ← BISA EDIT
├── Sewa Dressing Room (checkroom)
└── Scan QR Customer (qr_code_scanner)
```

---

## 🔐 RLS Policies yang Support dressing_room_admin

Role `dressing_room_admin` punya akses ke:

| Table | Permission | Policy |
|-------|-----------|--------|
| `dressing_room_collections` | ALL (SELECT, INSERT, UPDATE, DELETE) | ✅ dressing_room_collections_dra_all |
| `dressing_room_looks` | ALL | ✅ dressing_room_looks_dra_all |
| `dressing_room_look_items` | ALL | ✅ dressing_room_look_items_dra_all |
| `dressing_room_look_photos` | ALL | ✅ dressing_room_look_photos_dra_all |
| `products` | ALL | ✅ products_dra_all |
| `product_variants` | ALL | ✅ product_variants_dra_all |
| `categories` | ALL | ✅ categories_dra_all |
| `vouchers` | ALL | ✅ vouchers_dra_all |
| `order_products` | SELECT, UPDATE | ✅ order_products_dra_select, order_products_dra_update |
| `order_product_items` | SELECT | ✅ order_product_items_dra_select |
| `rental_orders` | ALL | ✅ rental_orders_dra_all |
| `rental_order_items` | ALL | ✅ rental_order_items_dra_all |
| `profiles` | SELECT | ✅ profiles_dra_select |

---

## ❓ Jika Masih Error

1. **Pastikan role TEPAT di-assign ke user ID yang BENAR**
   - User ID dari `auth.users`, bukan dari table lain
   - Role name CASE-SENSITIVE: `dressing_room_admin` (bukan `Dressing_Room_Admin`)

2. **Cek di browser DevTools**
   - Network tab: Check response dari `/admin/dressing-room`
   - Console: Check apakah ada JS errors

3. **Query RLS Policy langsung**
   ```sql
   -- Test RLS dengan user role check
   SELECT EXISTS (
     SELECT 1 FROM public.user_role_assignments
     WHERE user_id = 'DRESS_USER_ID_HERE' 
     AND role_name = 'dressing_room_admin'
   );
   ```

---

## 📞 Contact / Need Help?

Jika masih ada masalah setelah coba semua langkah di atas, collect ini:
- User ID dari `auth.users`
- Screenshot error message
- Check di database: user sudah punya role?
