# 🚀 Deploy Stock Opname System - Quick Guide

## Status: ✅ Ready to Deploy

**What:** Complete stock management system with Opening, Adjustments, and Opname  
**Files:** 4 migration files ready  
**Frontend:** 100% complete  
**Time:** 5 minutes to deploy + 10 minutes to test

---

## Step 1: Deploy Database Migrations

Run this command from repo root:

```bash
npm run supabase:db:push
```

**What this does:**
- Deploys 4 migration files:
  1. `20260609010000_revamp_stock_opname_system.sql` (tables, triggers, RLS)
  2. `20260609020000_stock_opname_rpc_functions.sql` (9 RPC functions)
  3. `20260609030000_fix_stock_opname_group_by.sql` (GROUP BY fix)
  4. `20260609040000_fix_calculate_system_stock_return_type.sql` (type casting fix)

**Expected output:**
```
Applying migration 20260609010000_revamp_stock_opname_system.sql...
Applying migration 20260609020000_stock_opname_rpc_functions.sql...
Applying migration 20260609030000_fix_stock_opname_group_by.sql...
Applying migration 20260609040000_fix_calculate_system_stock_return_type.sql...
Finished supabase db push.
```

---

## Step 2: Verify Tables Created

Run in SQL editor (Supabase Studio):

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'stock_%'
ORDER BY table_name;
```

**Expected result (6 tables):**
```
stock_adjustments
stock_adjustment_items
stock_openings
stock_opening_items
stock_opnames
stock_opname_items
```

---

## Step 3: Test RPC Functions

```sql
-- Test stock opening list (should return empty array initially)
SELECT * FROM get_stock_opening_list(10, 0);

-- Test stock adjustment list
SELECT * FROM get_stock_adjustment_list(10, 0);

-- Test stock opname list
SELECT * FROM get_stock_opname_list(10, 0);
```

**Expected:** All should return JSON with `{"data": [], "total_count": 0}`

---

## Step 4: Test Frontend Locally

```bash
npm run dev
```

Then test:

### Test Stock Opening:
1. Navigate to: `http://localhost:5173/admin/stock-opening`
2. Click "Buat Stock Opening"
3. Select date (today)
4. Search for a product (should show ALL products)
5. Add product with opening quantity: 10
6. Click "Simpan Draft"
7. Should see new opening in list with status "Draft"

### Test Stock Adjustments:
1. Navigate to: `http://localhost:5173/admin/stock-adjustments`
2. Click "Buat Stock Adjustment"
3. Select type: "Gift"
4. Enter reason: "Test gift untuk KOL campaign" (min 10 chars)
5. Search and add a product
6. Set quantity change: -2 (negative for reduction)
7. Click "Simpan"
8. Should see new adjustment in list
9. **Verify stock updated:** Check `product_variants` table, stock should decrease by 2

### Test Stock Opname:
1. First, confirm the stock opening (set status to "confirmed")
2. Navigate to: `http://localhost:5173/admin/stock-opname`
3. Click "Buat Stock Opname"
4. Select date (same as opening)
5. Should auto-load system stock calculation
6. See: Opening: 10, Sold: 0, Adjustment: -2, System Stock: 8
7. Enter physical count: 8 (matches system)
8. Click "Buat Stock Opname"
9. Should see new opname with variance = 0

---

## Step 5: Production Deployment

Once local testing passes:

```bash
# Build for production
npm run build

# Deploy (your deployment command)
# Example: vercel deploy
# Example: netlify deploy
```

---

## Troubleshooting

### Error: "Function not found"
**Solution:** Migrations not deployed. Run `npm run supabase:db:push`

### Error: "No products found"
**Solution:** Make sure you have active products in `products` and `product_variants` tables

### Error: "Not authorized"
**Solution:** Make sure you're logged in as admin role

### Error: "Stock opening not found for opname"
**Solution:** Stock opening must be:
1. Created for the same date
2. Same location (SparkStage55)
3. Status = "Confirmed" (not "Draft")

---

## What Users Will See

### Admin/Owner Users:
- New menu section: "Inventaris" with 3 items:
  - Stock Opening
  - Stock Adjustments
  - Stock Opname

### Dressing Room Admin Users:
- Same 3 menu items under "Toko" section

### Other Users (Kasir, StarGuide):
- No access (RLS policies enforce admin-only)

---

## Daily Workflow After Deployment

### Morning (9:00 AM):
```
Boss → Stock Opening → Buat Stock Opening
Input stock awal → Confirm
```

### Throughout Day:
```
Auto: Kasir jual produk → System track otomatis ✨
Manual: Boss kasih gift → Buat Adjustment (type: gift, reason: wajib)
```

### Evening (8:00 PM):
```
Boss → Stock Opname → Buat Opname
System auto-load calculation
Boss input physical count
System auto-calculate variance
If variance ≠ 0, input reason (wajib)
Simpan → Done! 🎉
```

---

## Success Checklist

After deployment, verify:
- ✅ Can create stock opening
- ✅ Can see all products in dropdown
- ✅ Can create stock adjustment (gift, kol, loss, gain)
- ✅ Stock updates immediately after adjustment
- ✅ Can create stock opname
- ✅ System stock auto-calculated
- ✅ Variance auto-calculated
- ✅ Modal scrolls properly with many items
- ✅ Auto-numbering works (#open-00001, etc.)

---

## Files Overview

### Backend (4 migration files):
- `supabase/migrations/20260609010000_revamp_stock_opname_system.sql`
- `supabase/migrations/20260609020000_stock_opname_rpc_functions.sql`
- `supabase/migrations/20260609030000_fix_stock_opname_group_by.sql`
- `supabase/migrations/20260609040000_fix_calculate_system_stock_return_type.sql`

### Frontend (11 files):
- `frontend/src/hooks/useStockOpnameNew.ts`
- `frontend/src/hooks/useInventoryProducts.ts`
- `frontend/src/pages/admin/StockOpening.tsx`
- `frontend/src/pages/admin/StockOpeningDetail.tsx`
- `frontend/src/pages/admin/stock-opening/StockOpeningTable.tsx`
- `frontend/src/pages/admin/stock-opening/StockOpeningFormModal.tsx`
- `frontend/src/pages/admin/stock-opening/VariantSelectorWithSearch.tsx`
- `frontend/src/pages/admin/StockAdjustments.tsx`
- `frontend/src/pages/admin/stock-adjustments/StockAdjustmentTable.tsx`
- `frontend/src/pages/admin/stock-adjustments/StockAdjustmentFormModal.tsx`
- `frontend/src/pages/admin/StockOpname.tsx`
- `frontend/src/pages/admin/stock-opname/StockOpnameNewTable.tsx`
- `frontend/src/pages/admin/stock-opname/StockOpnameNewFormModal.tsx`
- `frontend/src/pages/admin/StockOpnameDetail.tsx`

### Routes & Menu (2 files):
- `frontend/src/app/routes/adminRoutes.ts` (routes configured)
- `frontend/src/constants/adminMenu.ts` (menu items added)

---

## Support

**Full Documentation:**
- `STOCK_OPNAME_STATUS_FINAL.md` - Complete status and features
- `docs/runbooks/stock-opname-system.md` - System architecture
- `docs/runbooks/STOCK_OPNAME_QUICKSTART.md` - Quick reference
- `STOCK_OPNAME_BAHASA_INDONESIA.md` - Indonesian guide for staff

**Need Help?**
1. Check troubleshooting section above
2. Review browser console for errors
3. Check Supabase logs for RPC errors
4. Verify RLS policies if permission errors

---

## 🎉 You're Ready!

Run this command to deploy:

```bash
npm run supabase:db:push
```

Then test locally with:

```bash
npm run dev
```

Good luck! 🚀✨
