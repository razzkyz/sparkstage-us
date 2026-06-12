# Stock Opname Quick Start Guide

## 🚀 Quick Deploy

### 1. Deploy Migrations
```bash
# From repo root
npm run supabase:db:push

# Or
supabase db push
```

### 2. Verify Tables Created
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'stock_%'
ORDER BY table_name;

-- Should return:
-- stock_adjustments
-- stock_adjustment_items
-- stock_openings
-- stock_opening_items
-- stock_opnames
-- stock_opname_items
```

### 3. Verify RPC Functions
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%stock%'
ORDER BY routine_name;

-- Should include:
-- calculate_system_stock_for_opname
-- create_stock_adjustment
-- create_stock_opening
-- create_stock_opname
-- get_stock_adjustment_list
-- get_stock_opening_detail
-- get_stock_opening_list
-- get_stock_opname_detail
-- get_stock_opname_list
```

## 🧪 Quick Test

### Test 1: Create Stock Opening
```sql
SELECT create_stock_opening(
  CURRENT_DATE,
  'SparkStage55',
  'Test opening',
  '[
    {
      "product_id": 1,
      "variant_id": 1,
      "opening_quantity": 100,
      "unit": "pcs"
    }
  ]'::jsonb
);

-- Expected result:
-- {"opening_id": 1, "opening_number": "#open-00001", "items_processed": 1}
```

### Test 2: Create Stock Adjustment
```sql
SELECT create_stock_adjustment(
  CURRENT_DATE,
  'gift',
  'Test gift untuk testing',
  'Test notes',
  'SparkStage55',
  '[
    {
      "product_id": 1,
      "variant_id": 1,
      "quantity_change": -5,
      "unit": "pcs",
      "notes": "Test adjustment"
    }
  ]'::jsonb
);

-- Expected result:
-- {"adjustment_id": 1, "adjustment_number": "#adj-00001", "items_processed": 1}

-- Verify stock updated
SELECT id, name, stock FROM product_variants WHERE id = 1;
-- Stock should be decreased by 5
```

### Test 3: Calculate System Stock
```sql
SELECT * FROM calculate_system_stock_for_opname(
  CURRENT_DATE,
  'SparkStage55'
);

-- Expected result: Table with calculated system stock
-- variant_id | opening_stock | sold_quantity | adjustment_quantity | system_stock
```

### Test 4: Create Stock Opname
```sql
SELECT create_stock_opname(
  CURRENT_DATE,
  'SparkStage55',
  'Test opname',
  '[
    {
      "product_id": 1,
      "variant_id": 1,
      "opening_stock": 100,
      "sold_quantity": 0,
      "adjustment_quantity": -5,
      "system_stock": 95,
      "physical_count": 94,
      "variance_reason": "1 pcs rusak tidak tercatat",
      "unit": "pcs"
    }
  ]'::jsonb
);

-- Expected result:
-- {"opname_id": 1, "opname_number": "#opname-00001", "items_processed": 1}
```

### Test 5: Get Lists
```sql
-- Get stock openings
SELECT * FROM get_stock_opening_list(50, 0);

-- Get stock adjustments
SELECT * FROM get_stock_adjustment_list(50, 0);

-- Get stock opnames
SELECT * FROM get_stock_opname_list(50, 0);
```

## 💻 Frontend Quick Test

### Install in your component
```typescript
import {
  useStockOpeningList,
  useCreateStockOpening,
  useStockAdjustmentList,
  useCreateStockAdjustment,
  useStockOpnameList,
  useCalculateSystemStock,
  useCreateStockOpname,
} from '../hooks/useStockOpnameNew';
```

### Test Hook Usage
```typescript
function TestComponent() {
  // List hooks
  const { data: openings, isLoading: loadingOpenings } = useStockOpeningList();
  const { data: adjustments } = useStockAdjustmentList();
  const { data: opnames } = useStockOpnameList();
  
  // Create hooks
  const createOpening = useCreateStockOpening();
  const createAdjustment = useCreateStockAdjustment();
  const createOpname = useCreateStockOpname();
  
  // System stock calculation
  const { data: systemStock } = useCalculateSystemStock('2026-06-09', 'SparkStage55');
  
  // Test create opening
  const handleCreateOpening = async () => {
    try {
      const result = await createOpening.mutateAsync({
        opening_date: '2026-06-09',
        location: 'SparkStage55',
        notes: 'Test opening',
        items: [
          {
            product_id: 1,
            variant_id: 1,
            opening_quantity: 100,
            unit: 'pcs',
          },
        ],
      });
      console.log('Created:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <div>
      <button onClick={handleCreateOpening}>Test Create Opening</button>
      
      <h3>Openings: {openings?.total_count}</h3>
      <h3>Adjustments: {adjustments?.total_count}</h3>
      <h3>Opnames: {opnames?.total_count}</h3>
      
      {systemStock && (
        <div>
          <h3>System Stock Calculation:</h3>
          <pre>{JSON.stringify(systemStock, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## 📝 Common Scenarios

### Scenario 1: Daily Morning Opening
```typescript
// User selects date, inputs opening quantities
const handleCreateOpening = async (date: string, items: StockOpeningItem[]) => {
  const result = await createOpening.mutateAsync({
    opening_date: date,
    location: 'SparkStage55',
    notes: `Stock opening for ${date}`,
    items: items,
  });
  
  console.log(`Created opening: ${result.opening_number}`);
};
```

### Scenario 2: Gift to Influencer
```typescript
// User creates adjustment for gift
const handleGiftToInfluencer = async () => {
  const result = await createAdjustment.mutateAsync({
    adjustment_date: '2026-06-09',
    adjustment_type: 'gift',
    reason: 'Gift untuk KOL @influencer_xyz campaign Juni',
    notes: 'Campaign collaboration',
    location: 'SparkStage55',
    items: [
      {
        product_id: 123,
        variant_id: 456,
        quantity_change: -3, // Negative = decrease
        unit: 'pcs',
        notes: 'Kaos putih size M',
      },
    ],
  });
  
  console.log(`Created adjustment: ${result.adjustment_number}`);
  // Stock automatically updated in product_variants!
};
```

### Scenario 3: Evening Stock Opname
```typescript
// Step 1: Calculate system stock
const { data: systemStock } = useCalculateSystemStock('2026-06-09', 'SparkStage55');

// Step 2: User inputs physical count
const handleCreateOpname = async (physicalCounts: Record<number, number>) => {
  // Build items from system stock + physical counts
  const items = systemStock?.map((item) => ({
    product_id: item.product_id,
    variant_id: item.variant_id,
    opening_stock: item.opening_stock,
    sold_quantity: item.sold_quantity,
    adjustment_quantity: item.adjustment_quantity,
    system_stock: item.system_stock,
    physical_count: physicalCounts[item.variant_id] || 0,
    variance_reason: 
      physicalCounts[item.variant_id] !== item.system_stock 
        ? 'Please input reason' 
        : undefined,
    unit: 'pcs',
  })) || [];
  
  const result = await createOpname.mutateAsync({
    opname_date: '2026-06-09',
    location: 'SparkStage55',
    notes: 'End of day stock opname',
    items: items,
  });
  
  console.log(`Created opname: ${result.opname_number}`);
};
```

## 🐛 Troubleshooting

### Error: "Not authorized to create stock opening"
**Solution:** User must have admin role. Check `public.is_admin()` function.

```sql
-- Check user role
SELECT public.is_admin();
-- Should return true
```

### Error: "Stock opening already exists for date"
**Solution:** Can only have 1 opening per date per location.

```sql
-- Check existing openings
SELECT opening_date, location 
FROM stock_openings 
WHERE opening_date = CURRENT_DATE;

-- Delete test opening if needed (only for testing!)
DELETE FROM stock_openings WHERE opening_date = CURRENT_DATE;
```

### Error: "Adjustment would make stock negative"
**Solution:** Current stock is insufficient for the adjustment.

```sql
-- Check current stock
SELECT id, name, stock 
FROM product_variants 
WHERE id = YOUR_VARIANT_ID;

-- Adjust your quantity_change accordingly
```

### Sales not appearing in system stock calculation
**Check:**
1. Order payment_status = 'paid'?
2. Order pickup_status IN ('pending', 'ready', 'completed')?
3. Order created_at date matches opname_date?

```sql
-- Debug query to check orders
SELECT 
  op.id,
  op.created_at,
  op.payment_status,
  op.pickup_status,
  opi.product_variant_id,
  opi.quantity
FROM order_products op
JOIN order_product_items opi ON opi.order_product_id = op.id
WHERE DATE(op.created_at) = CURRENT_DATE
  AND op.payment_status = 'paid';
```

## 📚 Next Steps

1. **Read Full Documentation:**
   - System overview: `docs/runbooks/stock-opname-system.md`
   - Architecture flow: `docs/architecture/stock-opname-flow.md`
   - Implementation summary: `STOCK_OPNAME_IMPLEMENTATION_SUMMARY.md`

2. **Implement Frontend Pages:**
   - Stock Opening page
   - Stock Adjustments page
   - Stock Opname page (revamp existing)

3. **Test End-to-End:**
   - Full daily workflow
   - Sales auto-tracking
   - Adjustment stock updates
   - Variance calculations

4. **Train Staff:**
   - Daily opening procedures
   - Real-time adjustment recording
   - Physical counting best practices

5. **Go Live:**
   - Deploy to production
   - Monitor first week closely
   - Collect feedback & iterate

## 🎯 Success Criteria

- ✅ All migrations deployed successfully
- ✅ All RPC functions working
- ✅ Frontend hooks tested
- ✅ Can create stock opening
- ✅ Can create stock adjustment (stock updates)
- ✅ Sales auto-tracked in system stock calculation
- ✅ Can create stock opname with variance
- ✅ Staff trained and confident
- ✅ Go-live successful

## 📞 Support

Questions? Check:
1. Full docs: `docs/runbooks/stock-opname-system.md`
2. Architecture: `docs/architecture/stock-opname-flow.md`
3. Implementation summary: `STOCK_OPNAME_IMPLEMENTATION_SUMMARY.md`
4. Hooks reference: `frontend/src/hooks/useStockOpnameNew.ts`
