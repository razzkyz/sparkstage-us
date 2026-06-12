# Retail Categories Row Level Security (RLS)

**Status:** ✅ Configured  
**Created:** 2026-06-12  
**Migration File:** `20260612000000_create_retail_categories_with_rls.sql`

## Overview

Tabel `retail_categories` sekarang dilindungi dengan Row Level Security (RLS) yang memungkinkan:
- Public/Anonymous users dapat melihat kategori aktif
- Authenticated admins dapat melakukan CRUD operations
- Non-admin authenticated users hanya dapat melihat kategori aktif

## Table Structure

```sql
CREATE TABLE public.retail_categories (
  id BIGINT PRIMARY KEY,
  department VARCHAR(50) CHECK (department IN ('glam', 'charmbar', 'sparkclub')),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES retail_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## RLS Policies

### 1. Public SELECT Policy
**Name:** `Public can view active retail categories`  
**Operation:** SELECT  
**Who:** `public` (anonymous + authenticated)  
**Condition:** `is_active = true`

```sql
CREATE POLICY "Public can view active retail categories"
  ON public.retail_categories
  FOR SELECT
  TO public
  USING (is_active = true);
```

**Behavior:**
- Website visitors dapat melihat kategori aktif tanpa login
- Digunakan untuk filter kategori di halaman Shop
- Tidak terlihat kategori yang di-disable (is_active = false)

### 2. Admin SELECT Policy
**Name:** `Admins can view all retail categories`  
**Operation:** SELECT  
**Who:** `authenticated` users dengan `is_admin() = true`  
**Condition:** `public.is_admin()`

```sql
CREATE POLICY "Admins can view all retail categories"
  ON public.retail_categories
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

**Behavior:**
- Admin dapat melihat SEMUA kategori (aktif + non-aktif)
- Digunakan di admin panel untuk manajemen kategori
- Override policy public SELECT untuk admin users

### 3. Admin INSERT Policy
**Name:** `Admins can create retail categories`  
**Operation:** INSERT  
**Who:** `authenticated` users dengan `is_admin() = true`  
**Condition:** `public.is_admin()`

```sql
CREATE POLICY "Admins can create retail categories"
  ON public.retail_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
```

**Behavior:**
- Hanya admin yang dapat membuat kategori baru
- Non-admin akan mendapat error saat mencoba INSERT
- Validasi dilakukan sebelum data masuk ke database

### 4. Admin UPDATE Policy
**Name:** `Admins can update retail categories`  
**Operation:** UPDATE  
**Who:** `authenticated` users dengan `is_admin() = true`  
**Condition:** `public.is_admin()`

```sql
CREATE POLICY "Admins can update retail categories"
  ON public.retail_categories
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

**Behavior:**
- Hanya admin yang dapat mengubah kategori
- Dapat mengubah semua field termasuk `is_active`
- Validasi di `USING` (row selection) dan `WITH CHECK` (new values)

### 5. Admin DELETE Policy
**Name:** `Admins can delete retail categories`  
**Operation:** DELETE  
**Who:** `authenticated` users dengan `is_admin() = true`  
**Condition:** `public.is_admin()`

```sql
CREATE POLICY "Admins can delete retail categories"
  ON public.retail_categories
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

**Behavior:**
- Hanya admin yang dapat menghapus kategori
- Jika kategori memiliki child (parent_id references), akan error karena constraint
- Jika kategori digunakan di product_retail, akan set NULL karena ON DELETE SET NULL

## Access Control Matrix

| User Type | SELECT (Active) | SELECT (All) | INSERT | UPDATE | DELETE |
|-----------|----------------|--------------|--------|--------|--------|
| Anonymous | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Authenticated (Non-Admin) | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Admin | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Super Admin | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Kasir | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| StarGuide | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |

**Note:** Kasir dapat melihat semua kategori karena `is_admin()` function includes kasir role.

## Frontend Integration

### Public Shop Page
```typescript
// frontend/src/pages/Shop.tsx
// Automatically filtered to is_active = true by RLS
const { data: categories } = useQuery({
  queryFn: async () => {
    const { data } = await supabase
      .from('retail_categories')
      .select('*')
      .order('name');
    return data; // Only active categories
  }
});
```

### Admin Category Manager
```typescript
// frontend/src/hooks/useRetailCategories.ts
// Admin sees ALL categories (active + inactive)
const { data: categories } = useQuery({
  queryFn: async () => {
    const { data } = await supabase
      .from('retail_categories')
      .select('*')
      .order('department');
    return data; // All categories if admin
  }
});
```

### Admin CRUD Operations
```typescript
// Create category (Admin only)
await supabase
  .from('retail_categories')
  .insert({ department: 'glam', name: 'New Category', slug: 'new-category' });

// Update category (Admin only)
await supabase
  .from('retail_categories')
  .update({ is_active: false })
  .eq('id', categoryId);

// Delete category (Admin only)
await supabase
  .from('retail_categories')
  .delete()
  .eq('id', categoryId);
```

## Testing RLS

### Test 1: Anonymous User (Public Access)
```sql
-- Set role to anon
SET ROLE anon;

-- Should return only active categories
SELECT * FROM retail_categories;

-- Should fail (no INSERT permission)
INSERT INTO retail_categories (department, name, slug) 
VALUES ('glam', 'Test', 'test');
```

### Test 2: Authenticated Non-Admin
```sql
-- Set role to authenticated
SET ROLE authenticated;

-- Set user without admin role
SET request.jwt.claims TO '{"user_id": "test-user-id", "role": "authenticated"}';

-- Should return only active categories
SELECT * FROM retail_categories;

-- Should fail (not admin)
INSERT INTO retail_categories (department, name, slug) 
VALUES ('glam', 'Test', 'test');
```

### Test 3: Admin User
```sql
-- Set role to authenticated with admin
SET ROLE authenticated;
SET request.jwt.claims TO '{"user_id": "admin-user-id", "role": "authenticated"}';

-- Ensure user has admin role in user_role_assignments table
-- INSERT INTO user_role_assignments (user_id, role) VALUES ('admin-user-id', 'admin');

-- Should return ALL categories (active + inactive)
SELECT * FROM retail_categories;

-- Should succeed
INSERT INTO retail_categories (department, name, slug) 
VALUES ('glam', 'Test Category', 'test-category');

-- Should succeed
UPDATE retail_categories SET is_active = false WHERE slug = 'test-category';

-- Should succeed
DELETE FROM retail_categories WHERE slug = 'test-category';
```

## Migration Deployment

### Deploy to Local Development
```bash
npm run supabase:db:push
```

### Verify Migration
```bash
# Check if table exists with RLS enabled
npm run supabase:db:psql -- -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'retail_categories';"

# Check policies
npm run supabase:db:psql -- -c "SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'retail_categories';"
```

### Rollback (if needed)
```sql
-- Disable RLS
ALTER TABLE public.retail_categories DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Public can view active retail categories" ON public.retail_categories;
DROP POLICY IF EXISTS "Admins can view all retail categories" ON public.retail_categories;
DROP POLICY IF EXISTS "Admins can create retail categories" ON public.retail_categories;
DROP POLICY IF EXISTS "Admins can update retail categories" ON public.retail_categories;
DROP POLICY IF EXISTS "Admins can delete retail categories" ON public.retail_categories;

-- Drop table (WARNING: This will delete all data)
DROP TABLE IF EXISTS public.retail_categories CASCADE;
```

## Security Considerations

### ✅ What's Protected
- Non-admins cannot create, update, or delete categories
- Inactive categories are hidden from public users
- All admin operations are logged (if audit system is enabled)
- Foreign key constraints prevent orphaned references

### ⚠️ Important Notes
1. **is_admin() Function Dependency:**
   - RLS policies rely on `public.is_admin()` function
   - Ensure this function is defined and includes all admin roles
   - Current roles: `admin`, `super_admin`, `owner`, `kasir`

2. **Cascade Behavior:**
   - `parent_id` → ON DELETE SET NULL (subcategories become root)
   - `product_retail.retail_category_id` → ON DELETE SET NULL (products lose category)
   - `product_retail.retail_subcategory_id` → ON DELETE SET NULL (products lose subcategory)

3. **Performance:**
   - Indexes created on `department`, `parent_id`, `slug`, `is_active`
   - RLS adds overhead to every query (minimal for simple policies)
   - Consider materialized views if query performance becomes an issue

4. **Soft Delete Pattern:**
   - Use `is_active = false` instead of DELETE for soft delete
   - Preserves data integrity and audit trail
   - Can be re-activated later if needed

## Common Issues & Solutions

### Issue 1: "new row violates row-level security policy"
**Cause:** Non-admin user trying to INSERT/UPDATE/DELETE  
**Solution:** Ensure user has admin role in `user_role_assignments` table

### Issue 2: "permission denied for table retail_categories"
**Cause:** Missing GRANT permissions  
**Solution:** Run migration again or manually grant permissions

### Issue 3: Admin can't see all categories
**Cause:** `is_admin()` function not working correctly  
**Solution:** Check function definition and user role assignments

### Issue 4: Duplicate key error on slug
**Cause:** Slug must be unique across all departments  
**Solution:** Use department prefix in slug (e.g., `glam-makeup`, `charmbar-accessories`)

## Related Documentation

- `docs/architecture.md` - Overall system architecture
- `docs/runbooks/admin-product-entry.md` - Product admin data-entry rules
- `RETAIL_PRODUCT_MIGRATION_SUMMARY.md` - Product retail migration details
- `RETAIL_PRODUCT_FILTERS_FEATURE.md` - Category filter implementation

## Support

If you encounter issues with RLS:
1. Check PostgreSQL logs for detailed error messages
2. Verify user roles in `user_role_assignments` table
3. Test policies using the SQL test queries above
4. Review `is_admin()` function definition

---

**Last Updated:** 2026-06-12  
**Maintainer:** Development Team
