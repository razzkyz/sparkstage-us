# Role Setup Comparison - Kasir vs Dress Admin

## 📊 Comparison Table

| Aspek | Kasir | Dress Admin |
|-------|-------|------------|
| **Role Name** | `kasir` | `dressing_room_admin` |
| **Email** | `kasir@spark.local` | `dress@gmail.com` |
| **Main Purpose** | Sales dashboard read-only | Dressing room management |
| **Create User** | Via Supabase UI | Via Supabase UI |
| **Assign Role** | SQL query | SQL query |
| **Database Fix** | None (kasir sudah ada) | ✅ Fix is_admin() function |
| **Main Dashboard** | `/admin/cashier-dashboard` | `/admin/dressing-room` |

---

## 🔄 Setup Flow (Sama)

### Kedua Role Mengikuti Pattern Ini:

```
1. Create User
   └─ Supabase Dashboard → Auth → Users → Add user
   
2. Assign Role
   └─ SQL: INSERT INTO user_role_assignments
   
3. Force Re-Login
   └─ Logout → Login → Force Refresh (Ctrl+F5)
```

---

## 📋 Setup Kasir (Reference)

### Step 1: Create User
```
Supabase Dashboard
├─ Authentication → Users
├─ + Add user
├─ Email: kasir@spark.local
├─ Password: [safe password]
└─ Create
```

### Step 2: Assign Role
```sql
SELECT id FROM auth.users WHERE email = 'kasir@spark.local';
-- Copy UUID

INSERT INTO public.user_role_assignments (user_id, role_name)
VALUES ('{USER_ID}', 'kasir');
```

### Step 3: Login & Verify
```
- Logout & Login
- Should see Dashboard Penjualan
- Menu: Cashier Dashboard, Cek Pesanan, Scan QR Produk
```

---

## 📋 Setup Dress Admin (Now!)

### Step 1: Create User
```
Supabase Dashboard
├─ Authentication → Users
├─ + Add user
├─ Email: dress@gmail.com
├─ Password: [safe password]
└─ Create
```

### Step 2: Fix is_admin() Function (ONLY FOR DRESS)
```sql
-- Ini hanya perlu untuk dress admin karena baru
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
        'admin', 'super_admin', 'super-admin',
        'ticket_admin', 'retail_admin', 'dressing_room_admin'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

### Step 3: Assign Role
```sql
SELECT id FROM auth.users WHERE email = 'dress@gmail.com';
-- Copy UUID

INSERT INTO public.user_role_assignments (user_id, role_name)
VALUES ('{USER_ID}', 'dressing_room_admin');
```

### Step 4: Login & Verify
```
- Logout & Login
- Should see Dressing Room menu
- Menu: Dressing Room Manager, Sewa Dressing Room, Scan QR Customer
- Also see: Pesanan Produk, Voucher & Diskon, Stok & Produk
```

---

## 🔐 Why is_admin() Fix Needed?

### Kasir Role ✅
- `is_admin()` function check: `role_name = 'admin'`
- Kasir bisa access karena... wait, kasir BUKAN admin!
- **Solution:** Kasir di-handle sebagai read-only via frontend routing
- RLS policies TIDAK check `is_admin()` untuk kasir

### Dress Admin ❌ → ✅
- Dressing room items (rental_orders, products) punya RLS policies yang check `is_admin()`
- Old `is_admin()` ONLY check `role_name = 'admin'`
- Dress admin TIDAK di-recognize sebagai admin → Forbidden error
- **Solution:** Update `is_admin()` untuk check ALL admin roles termasuk `dressing_room_admin`

---

## 📝 Key Differences

### Kasir
- Read-only access
- No direct RLS policy check (frontend filtering)
- Specific dashboard only
- Can't edit atau create data

### Dress Admin
- Full READ + WRITE access
- RLS policies check `is_admin()`
- Full admin sidebar menu (filtered to dressing room only)
- Can edit, create, delete data

---

## 🎯 After Setup

### Kasir Bisa:
- ✅ View sales dashboard
- ✅ Search orders (read-only)
- ✅ Scan QR untuk verifikasi

### Dress Admin Bisa:
- ✅ View dressing room dashboard
- ✅ Create/edit/delete dressing room items
- ✅ Manage rental orders
- ✅ Edit product inventory
- ✅ Create/edit vouchers
- ✅ View customer info

---

## 🚀 Quick Checklist

**For Kasir Setup (Reference):**
- [ ] Create user
- [ ] Run: `INSERT INTO user_role_assignments (user_id, 'kasir')`
- [ ] Login & verify

**For Dress Admin Setup (Do Now):**
- [ ] Run is_admin() fix SQL
- [ ] Create user
- [ ] Run: `INSERT INTO user_role_assignments (user_id, 'dressing_room_admin')`
- [ ] Logout & login
- [ ] Verify menu

---

## 📚 Related Docs

- [Kasir Setup](kasir-setup.md) - Reference untuk role setup pattern
- [Dress Admin Setup Simple](DRESS_ADMIN_SETUP_SIMPLE.md) - Simplified guide
- [Auth Flow](auth.md) - How role-based routing works

---

**Last Updated:** May 16, 2026
