# Setup Kasir Dashboard untuk kasir@gmail.com

## 📊 Dashboard Features

Dashboard Kasir sudah dilengkapi dengan fitur:
- ✅ **Total Penjualan Hari Ini**: Tiket + Produk (qty dan revenue)
- ✅ **Total Penjualan Bulan Ini**: Tiket + Produk (qty dan revenue)
- ✅ **Export CSV**: Download laporan penjualan dalam format CSV
- ✅ **Summary Table**: Ringkasan lengkap penjualan dalam format tabel
- ✅ **Real-time Updates**: Dashboard auto-refresh saat ada penjualan baru

## 🚀 Setup Steps

### Step 1: Create Kasir User di Supabase

**Via Supabase Dashboard:**
1. Login ke https://supabase.com/dashboard
2. Pilih project **Spark Stage**
3. Buka **Authentication** → **Users**
4. Klik **+ Add user**
5. Isi:
   - **Email**: kasir@gmail.com
   - **Password**: [pilih password yang aman]
6. Klik **Create user**
7. **Copy User ID** (UUID format)

### Step 2: Assign Kasir Role

Jalankan di Supabase SQL Editor:

```sql
-- Paste User ID dari step sebelumnya
INSERT INTO public.user_role_assignments (user_id, role_name, created_at)
VALUES ('PASTE_USER_ID_HERE', 'kasir', NOW())
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Verify
SELECT ura.user_id, ura.role_name, u.email
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'kasir@gmail.com';
```

**Expected Output:**
```
        user_id         | role_name | email
------------------------|-----------|-----------------
[UUID dari step 1]      | kasir     | kasir@gmail.com
```

### Step 3: Test Login

1. Logout dari akun sekarang
2. Buka http://localhost:5173/login (atau production URL)
3. Login dengan:
   - **Email**: kasir@gmail.com
   - **Password**: [password yang dibuat di step 1]
4. Harus di-redirect ke `/admin/cashier-dashboard`

## ✨ Dashboard Menu Kasir

Di sidebar, kasir akan melihat menu:

```
📊 PENJUALAN
├─ Dashboard Penjualan (main dashboard - current page)
├─ Cek Pesanan (search orders)
└─ Scan QR Produk (verify product pickup)
```

## 💾 Export CSV

### Cara Export:
1. Di dashboard, klik tombol **"Export CSV"** (warna hijau)
2. File akan otomatis diunduh dengan nama: `penjualan-kasir-YYYY-MM-DD.csv`

### Format CSV:
```
Laporan Penjualan Kasir - Spark Stage
Tanggal Laporan,2026-05-19
Bulan,2026-05

RINGKASAN PENJUALAN HARI INI
Kategori,Jumlah,Revenue (Rp)
Tiket,5,750000
Produk,3,450000
TOTAL,8,1200000

RINGKASAN PENJUALAN BULAN INI
Kategori,Jumlah,Revenue (Rp)
Tiket,120,18000000
Produk,85,12750000
TOTAL,205,30750000
```

### Buka di Excel/Google Sheets:
- Download CSV file
- Buka dengan Excel atau Google Sheets
- Formattir sesuai kebutuhan

## 🔄 Real-time Updates

Dashboard **secara otomatis** refresh ketika:
- Ada penjualan tiket baru (order_items)
- Ada penjualan produk baru (order_product_items)
- User focus kembali ke browser tab

Tidak perlu refresh manual!

## ⚙️ Menu Kasir

### Dashboard Penjualan (Current)
- Path: `/admin/cashier-dashboard`
- Tampil: Total penjualan hari ini & bulan ini
- Fitur: Export CSV

### Cek Pesanan
- Path: `/admin/cashier-orders`
- Fitur: Search & lookup orders (read-only)
- Gunakan untuk verifikasi pesanan customer

### Scan QR Produk
- Path: `/admin/product-pickup`
- Fitur: Scan QR untuk verifikasi product pickup
- Confirm bahwa produk sudah diserahkan ke customer

## 🔐 Kasir Permissions

Kasir memiliki permission:
- ✅ Read: Order items, product items, kasir dashboard stats
- ❌ Write: Kasir tidak bisa edit/modify data
- ❌ Delete: Kasir tidak bisa hapus data

Semua perubahan hanya bisa dilakukan oleh admin.

## 📱 Mobile Friendly

Dashboard kasir responsive:
- ✅ Desktop: Full view dengan semua stats cards
- ✅ Tablet: 2 column layout
- ✅ Mobile: 1 column layout, mudah digunakan

## 🆘 Troubleshooting

### Kasir login tapi "Forbidden" error

**Solusi:**
1. Verify role di database:
   ```sql
   SELECT * FROM user_role_assignments 
   WHERE user_id = 'USER_ID' AND role_name = 'kasir';
   ```
2. Harus ada 1 row dengan role_name = 'kasir'
3. Jika tidak ada, jalankan INSERT dari Step 2
4. Force logout & login ulang

### Dashboard tidak tampil data penjualan

**Solusi:**
1. Check internet connection
2. Open browser DevTools → Network tab
3. Check jika ada error pada request ke `order_items` atau `order_product_items`
4. Verify user memiliki read access di RLS policies

### Kasir tidak bisa export CSV

**Solusi:**
1. Pastikan browser punya permission download file
2. Check browser console (F12) untuk error message
3. Coba download file kecil lain terlebih dahulu
4. Clear browser cache dan try lagi

## 📞 Support

Jika ada issue:
1. Check DevTools console (F12)
2. Lihat error message
3. Contact admin untuk permission issues
4. Report bug di development team

## 🎯 Next Steps

Kasir sekarang bisa:
- ✅ Login dengan kasir@gmail.com
- ✅ Lihat total penjualan tiket & produk
- ✅ Export data penjualan ke CSV
- ✅ Scan QR produk untuk pickup
- ✅ Search & check orders
