# Stock Opname System - Quick Reference Card

## 🔥 5-Minute Quick Start

### Deploy Backend
```bash
npm run supabase:db:push
```

### Add to App.tsx
```typescript
<Route path="/admin/stock-opening" element={<StockOpening />} />
<Route path="/admin/stock-opening/:openingId" element={<StockOpeningDetail />} />
<Route path="/admin/stock-adjustments" element={<StockAdjustments />} />
```

### Add to adminMenu.ts (in store section)
```typescript
{
  id: "stock-opening",
  label: "Stock Opening",
  icon: "inventory",
  path: "/admin/stock-opening",
  highlight: true,
},
{
  id: "stock-adjustments",
  label: "Stock Adjustments",
  icon: "tune",
  path: "/admin/stock-adjustments",
  highlight: true,
},
```

### Test
```bash
npm run dev
# Navigate to /admin/stock-opening
# Create opening → Success!
# Navigate to /admin/stock-adjustments  
# Create adjustment → Stock updated!
```

## 📁 File Structure

```
supabase/migrations/
├── 20260609010000_revamp_stock_opname_system.sql
└── 20260609020000_stock_opname_rpc_functions.sql

frontend/src/
├── hooks/
│   ├── useStockOpnameNew.ts          ← All hooks
│   └── useInventoryProducts.ts        ← Product fetching
├── pages/admin/
│   ├── StockOpening.tsx               ← Main page
│   ├── StockOpeningDetail.tsx         ← Detail page
│   ├── StockAdjustments.tsx           ← Main page
│   ├── stock-opening/
│   │   ├── StockOpeningTable.tsx
│   │   ├── StockOpeningFormModal.tsx
│   │   └── VariantSelectorWithSearch.tsx
│   └── stock-adjustments/
│       ├── StockAdjustmentTable.tsx
│       └── StockAdjustmentFormModal.tsx
```

## 🔑 Key Concepts

### Stock Opening (Stock Awal)
- **When:** Every morning before opening
- **What:** Input opening stock for each product variant
- **Status:** draft → confirmed (locked)
- **Auto-number:** #open-00001, #open-00002, etc.

### Stock Adjustments (Manual Changes)
- **When:** Whenever there's manual stock change
- **Types:**
  - `gift` - Gifts to customers/partners
  - `kol` - KOL marketing giveaways
  - `loss` - Damaged/stolen/missing
  - `gain` - Returns/found items
  - `other` - Other manual adjustments
- **Required:** Reason (min 10 chars)
- **Effect:** **Auto-updates product_variants.stock**
- **Auto-number:** #adj-00001, #adj-00002, etc.

### Sales Tracking (Automatic!)
- **Source:** `order_products` + `order_product_items`
- **Filter:** `payment_status = 'paid'` AND `pickup_status IN ('pending', 'ready', 'completed')`
- **No manual input needed!**

### Stock Opname (Physical Count)
- **When:** End of day
- **What:** Compare physical count vs system stock
- **System Stock:** = Opening - Sold + Adjustments
- **Variance:** = Physical - System
- **Auto-number:** #opname-00001, #opname-00002, etc.

## 🎯 API Hooks Reference

### Stock Opening
```typescript
import {
  useStockOpeningList,
  useStockOpeningDetail,
  useCreateStockOpening,
} from '../hooks/useStockOpnameNew';

// List
const { data, isLoading } = useStockOpeningList(limit, offset);
// data.data = array of openings
// data.total_count = total count

// Detail
const { data: opening } = useStockOpeningDetail(openingId);

// Create
const createOpening = useCreateStockOpening();
await createOpening.mutateAsync({
  opening_date: '2026-06-09',
  location: 'SparkStage55',
  notes: 'Morning opening',
  items: [
    {
      product_id: 123,
      variant_id: 456,
      opening_quantity: 100,
      unit: 'pcs',
    },
  ],
});
```

### Stock Adjustments
```typescript
import {
  useStockAdjustmentList,
  useCreateStockAdjustment,
} from '../hooks/useStockOpnameNew';

// List
const { data } = useStockAdjustmentList(limit, offset);

// Create
const createAdjustment = useCreateStockAdjustment();
await createAdjustment.mutateAsync({
  adjustment_date: '2026-06-09',
  adjustment_type: 'gift',
  reason: 'Gift untuk KOL @influencer campaign Juni',
  notes: 'Campaign collaboration',
  location: 'SparkStage55',
  items: [
    {
      product_id: 123,
      variant_id: 456,
      quantity_change: -5, // Negative = decrease
      unit: 'pcs',
    },
  ],
});
// Stock automatically updated!
```

### Stock Opname
```typescript
import {
  useStockOpnameList,
  useStockOpnameDetail,
  useCalculateSystemStock,
  useCreateStockOpname,
} from '../hooks/useStockOpnameNew';

// Calculate system stock first
const { data: systemStock } = useCalculateSystemStock('2026-06-09', 'SparkStage55');
// Returns: opening_stock, sold_quantity, adjustment_quantity, system_stock

// Create opname
const createOpname = useCreateStockOpname();
await createOpname.mutateAsync({
  opname_date: '2026-06-09',
  location: 'SparkStage55',
  notes: 'End of day opname',
  items: [
    {
      product_id: 123,
      variant_id: 456,
      opening_stock: 100,
      sold_quantity: 7,
      adjustment_quantity: -5,
      system_stock: 88, // 100 - 7 - 5
      physical_count: 87, // Actual count
      variance_reason: '1 pcs damaged not recorded',
      unit: 'pcs',
    },
  ],
});
```

### Inventory Products
```typescript
import { useInventoryProducts } from '../hooks/useInventoryProducts';

// Search products
const { data } = useInventoryProducts('kaos'); // Search query
// data.data = array of products with variants
```

## 🚦 Status Flow

### Stock Opening
```
CREATE → draft → CONFIRM → confirmed (locked)
```

### Stock Opname
```
CREATE → draft → FINALIZE → finalized (locked)
```

## 📊 Database Tables Quick Reference

### stock_openings
- `opening_number` - Auto-generated #open-00001
- `opening_date` - Date of opening (UNIQUE per location)
- `location` - Default 'SparkStage55'
- `status` - 'draft' | 'confirmed'

### stock_opening_items
- `stock_opening_id` - FK to stock_openings
- `variant_id` - FK to product_variants
- `opening_quantity` - Opening stock amount
- `unit` - 'pcs' | etc.

### stock_adjustments
- `adjustment_number` - Auto-generated #adj-00001
- `adjustment_date` - Date of adjustment
- `adjustment_type` - 'gift' | 'kol' | 'loss' | 'gain' | 'other'
- `reason` - Required explanation

### stock_adjustment_items
- `stock_adjustment_id` - FK to stock_adjustments
- `variant_id` - FK to product_variants
- `quantity_change` - Change amount (+ or -)
- **Side effect:** Updates `product_variants.stock`

### stock_opnames
- `opname_number` - Auto-generated #opname-00001
- `opname_date` - Date of opname (UNIQUE per location)
- `status` - 'draft' | 'finalized'

### stock_opname_items
- `stock_opname_id` - FK to stock_opnames
- `variant_id` - FK to product_variants
- `opening_stock` - From stock_opening
- `sold_quantity` - Auto-calculated from orders
- `adjustment_quantity` - From stock_adjustments
- `system_stock` - = opening - sold + adj
- `physical_count` - User input
- `variance` - = physical - system
- `variance_reason` - Required if variance != 0

## 🔍 Debugging

### Check if migrations ran
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'stock_%';
```

### Check RPC functions
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%stock%';
```

### Test create opening
```sql
SELECT create_stock_opening(
  CURRENT_DATE,
  'SparkStage55',
  'Test',
  '[{"product_id":1,"variant_id":1,"opening_quantity":10}]'::jsonb
);
```

### Check stock after adjustment
```sql
SELECT id, name, stock FROM product_variants WHERE id = 1;
```

### Calculate system stock
```sql
SELECT * FROM calculate_system_stock_for_opname(CURRENT_DATE, 'SparkStage55');
```

## ❌ Common Errors

### "Stock opening already exists for date X"
**Cause:** Only 1 opening per date per location  
**Fix:** Use different date or edit existing opening

### "Adjustment would make stock negative"
**Cause:** quantity_change would make stock < 0  
**Fix:** Check current stock first

### "Not authorized to create stock opening"
**Cause:** User not admin  
**Fix:** Check `public.is_admin()` returns true

### "Stock opname already exists for date X"  
**Cause:** Only 1 opname per date per location  
**Fix:** Use different date or edit existing opname

## 📖 Full Documentation

- **System Overview:** `docs/runbooks/stock-opname-system.md`
- **Quick Start:** `docs/runbooks/STOCK_OPNAME_QUICKSTART.md`
- **Architecture:** `docs/architecture/stock-opname-flow.md`
- **Indonesian Guide:** `STOCK_OPNAME_BAHASA_INDONESIA.md`
- **Deployment:** `READY_TO_DEPLOY.md`

## 🎯 Daily Workflow

### Morning (9:00 AM)
1. Open `/admin/stock-opening`
2. Click "Buat Stock Opening"
3. Add products with opening quantities
4. Save & Confirm

### During Day
**Sales** → Automatic tracking ✅  
**Adjustments** → Manual entry as needed

### Evening (8:00 PM)
1. Open `/admin/stock-opname`
2. Click "Buat Stock Opname"
3. System shows calculated stock
4. Enter physical count
5. Review variance
6. Add variance reason if needed
7. Save & Finalize

---

**Created:** 2026-06-09  
**Status:** Production Ready ✅  
**Version:** 1.0.0
