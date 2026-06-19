# Store Inventory 400 Error Fix

**Date:** 2026-06-19  
**Status:** ✅ Fixed

## Problem

Store Inventory page (`/admin/store`) was showing 400 error when trying to load products:
```
Failed to load resource: the server responded with a status of 400 ()
GET https://advzkhuulbaztolnttfl.supabase.co/rest/v1/products?select=...
```

## Root Cause

The inventory query was trying to join `categories` and `product_images` tables, but:
1. RLS policies on these tables were preventing admin access
2. The query structure was too complex and causing conflicts

## Solution

### 1. Simplified Query (Already Done)
- Removed `product_images` from inventory query ✅
- Removed `categories` from inventory query ✅
- Query now only accesses `products` and `product_variants` tables

### 2. Added Admin RLS Policies
**Migration:** `20260619000001_add_admin_products_policy.sql`

Added full access policies for admins:
- `products` table: Admin can view ALL products (including inactive/deleted)
- `product_variants` table: Admin can view ALL variants
- `categories` table: Admin can view ALL categories

Admin roles: `admin`, `super_admin`, `owner`

### 3. Hid Category Filter
- Category dropdown temporarily hidden from UI
- Category filtering requires joining `categories` table which was removed
- Will be re-enabled in future update with proper implementation

## Files Changed

1. **frontend/src/hooks/inventory/inventoryQuerySchema.ts**
   - Removed unused `isFilteringByCategory` variable
   - Added comment about disabled category filtering

2. **frontend/src/pages/admin/store-inventory/InventoryToolbar.tsx**
   - Commented out category filter dropdown
   - Added explanation comment

3. **supabase/migrations/20260619000001_add_admin_products_policy.sql** (NEW)
   - Admin full access policies for products, product_variants, categories

## Testing Steps

### If error persists, follow these steps:

1. **Hard Refresh Browser**
   - Press `Ctrl + Shift + R` (Windows)
   - Or `Ctrl + F5`
   - This clears cached queries

2. **Check Browser DevTools**
   - Press `F12` to open DevTools
   - Go to **Network** tab
   - Reload page
   - Find failed request to `/rest/v1/products`
   - Click on it and check **Response** tab
   - Copy the error message and share it

3. **Verify User Role**
   Run this query in Supabase SQL Editor:
   ```sql
   SELECT * FROM user_role_assignments 
   WHERE user_id = auth.uid();
   ```
   Should return `admin`, `super_admin`, or `owner` role

4. **Check RLS Policies**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('products', 'product_variants', 'categories');
   ```
   Should show admin policies exist

## Expected Result

- Store Inventory page loads without errors
- Products and variants are visible
- Category filter is hidden (temporary)
- Stock filter and Active/Inactive filter work correctly

## Next Steps (Future)

To re-enable category filtering:
1. Add `categories` back to SELECT query
2. Ensure RLS policies allow admin access to categories
3. Update filtering logic to use category_id instead of slug
4. Uncomment category filter dropdown

## Deployment

```bash
# Migration already deployed
npm run supabase:db:push

# Commit and push
git add -A
git commit -m "Fix Store Inventory 400 error"
git push
```

## Notes

- User can still access product categories through "Manage Categories" button
- Category filter will be restored after proper RLS configuration
- This fix allows admins to view and edit all Glam products shown in `/shop` page
