# Fix: GROUP BY Error in Stock Opname Functions

## Error Message
```
column "so.opname_date" must appear in the GROUP BY clause or be used in an aggregate function
```

## Root Cause
The original RPC functions used `jsonb_agg` with `ORDER BY` inside the aggregation, which caused PostgreSQL to require GROUP BY for all non-aggregated columns.

## Solution
Created migration `20260609030000_fix_stock_opname_group_by.sql` that:

1. **Rewrites get_stock_opname_list()** - Uses CTE to pre-order data
2. **Rewrites get_stock_opening_list()** - Same fix preventively
3. **Rewrites get_stock_adjustment_list()** - Same fix preventively

## How It Works

**Before (Error):**
```sql
SELECT jsonb_agg(
  jsonb_build_object(...)
  ORDER BY so.opname_date DESC  -- ❌ Causes GROUP BY error
)
FROM stock_opnames so;
```

**After (Fixed):**
```sql
WITH opname_data AS (
  SELECT so.*, ...
  FROM stock_opnames so
  ORDER BY so.opname_date DESC  -- ✅ Order in CTE
)
SELECT jsonb_agg(
  jsonb_build_object(...)  -- No ORDER BY here
)
FROM opname_data;
```

## Deploy Fix

```bash
# Deploy the fix migration
npm run supabase:db:push

# Or
supabase db push
```

## Verify Fix

```sql
-- Test get_stock_opname_list
SELECT * FROM get_stock_opname_list(10, 0);

-- Test get_stock_opening_list
SELECT * FROM get_stock_opening_list(10, 0);

-- Test get_stock_adjustment_list
SELECT * FROM get_stock_adjustment_list(10, 0);
```

All should now work without GROUP BY errors!

## Files Modified

- Created: `supabase/migrations/20260609030000_fix_stock_opname_group_by.sql`

## Status

✅ **Fixed** - Ready to deploy
