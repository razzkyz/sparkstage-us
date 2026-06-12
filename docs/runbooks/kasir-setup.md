# Setup Kasir (Cashier) Role - Dokumentasi

## Overview

Role `kasir` adalah role read-only khusus untuk kasir/cashier yang hanya bisa melihat:
- Dashboard penjualan (Total tiket & produk hari ini + bulan ini)
- List pesanan (search & lookup)
- Scan QR produk untuk verifikasi

Kasir **TIDAK BISA**:
- Mengubah/edit pesanan atau produk
- Akses menu admin lainnya
- Mengubah data penjualan

## Setup Steps

### 1. Buat Kasir User di Supabase Auth

```bash
# Login ke Supabase Dashboard → Authentication → Users
# Klik "+ Add user"
# Email: kasir@spark.local (atau email kasir sesuai kebutuhan)
# Password: [buat password yang aman]
```

Atau via CLI:
```bash
npx supabase link
supabase auth admin create-user --email kasir@spark.local --password YOUR_SECURE_PASSWORD
```

### 2. Assign Role Kasir di Database

Jalankan di Supabase SQL Editor:

```sql
-- Cari dulu USER_ID kasir dari auth.users
SELECT id, email FROM auth.users WHERE email = 'kasir@spark.local';

-- Copy UUID-nya, lalu jalankan:
SELECT public.assign_kasir_role('PASTE_UUID_HERE');
```

Atau gunakan function yang sudah dibuat di migration:

```bash
# Setelah migration di-push
npx supabase db push

# Lalu run SQL di Supabase dashboard:
SELECT public.assign_kasir_role('USER_UUID_HERE');
```

### 3. Verifikasi Setup

Login dengan kasir account:
- Buka http://localhost:5173/login
- Email: kasir@spark.local
- Password: [password yang dibuat]
- Harus masuk ke `/admin/cashier-dashboard`

## Features di Kasir Dashboard

### Dashboard Penjualan
- **Penjualan Tiket Hari Ini**: Jumlah tiket + revenue
- **Penjualan Tiket Bulan Ini**: Jumlah tiket + revenue
- **Penjualan Produk Hari Ini**: Jumlah produk + revenue
- **Penjualan Produk Bulan Ini**: Jumlah produk + revenue
- **Summary Card**: Total penjualan gabungan per hari dan bulan

### Menu Kasir
1. **Dashboard Penjualan** → /admin/cashier-dashboard (main dashboard)
2. **Cek Pesanan** → /admin/cashier-orders (search & view orders read-only)
3. **Scan QR Produk** → /admin/product-pickup (scan untuk verifikasi pickup)

## Database Updates

### New Migration: `20260515000000_add_kasir_role.sql`
- Membuat function `assign_kasir_role(user_id UUID)`
- Untuk assign kasir role ke user tertentu

### Updated Files

**Frontend:**
- `frontend/src/auth/adminRole.ts` - Tambah 'kasir' ke ADMIN_ROLES
- `frontend/src/constants/adminMenu.ts` - Tambah CASHIER_MENU_SECTIONS
- `frontend/src/utils/auth.ts` - Update import CASHIER_MENU_SECTIONS
- `frontend/src/hooks/useCashierSalesStats.ts` - Baru: Hook untuk sales stats
- `frontend/src/lib/queryKeys.ts` - Tambah cashierSalesStats key
- `frontend/src/pages/admin/CashierDashboard.tsx` - Baru: Dashboard kasir
- `frontend/src/pages/Login.tsx` - Update routing untuk kasir
- `frontend/src/app/routes/adminRoutes.ts` - Tambah route /admin/cashier-dashboard

**Backend:**
- `supabase/functions/_shared/admin.ts` - Tambah 'kasir' ke ADMIN_ROLES
- `supabase/migrations/20260515000000_add_kasir_role.sql` - Baru: Migration

## Timezone Note

Kasir dashboard menggunakan timezone WIB (Asia/Jakarta) untuk semua timestamp, sesuai dengan timezone app secara umum.

## Permission Model

Kasir di-handle sebagai `is_admin() = true` di backend untuk database access, tapi dengan:
- Frontend: Restricted to kasir-specific pages only
- No edit/write permissions - hanya read-only
- RLS policies sudah enforce ini melalui `is_admin()` function

## Troubleshooting

### Kasir login tapi tidak masuk ke cashier-dashboard
Pastikan:
1. User sudah di-assign kasir role di database
2. Jalankan: `SELECT * FROM user_role_assignments WHERE user_id = 'USER_UUID'`
3. Harus ada row dengan `role_name = 'kasir'`

### Dashboard penjualan tidak tampil angka
1. Check Supabase network tab di browser
2. Verify RLS policies allow read akses order_items & order_product_items
3. Run: `SELECT COUNT(*) FROM order_items;` - harus ada data

### Kasir bisa akses halaman yang seharusnya restricted
Frontend punya additional check di AuthContext, verify role loading tidak timeout

## Next Steps

Jika perlu expand kasir permissions:
1. Tambah new route di CASHIER_MENU_SECTIONS
2. Pastikan component hanya display read-only data
3. Add RLS policy kalau perlu restrict table access per role
