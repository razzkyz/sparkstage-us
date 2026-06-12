# Stock Opname Authorization Analysis

**Generated:** 2026-06-08  
**Scope:** Stock opname API endpoints, RLS policies, and authorization checks

---

## Summary

Stock Opname access is **heavily restricted to admins only**. The owner role can view stock opname records via RLS SELECT policy, but cannot create, update, delete, or import. All write operations are blocked at both RPC and frontend levels.

---

## 1. RPC Functions & Authorization

### Location
All RPC functions defined in `supabase/migrations/`:

| File | Function | Authorization Check |
|------|----------|---------------------|
| `20260608000000_add_stock_opname_system.sql` | `create_stock_opname()` | `is_admin() OR service_role` |
| `20260608000000_add_stock_opname_system.sql` | `get_stock_opname_list()` | `is_admin() OR service_role` |
| `20260608000000_add_stock_opname_system.sql` | `get_stock_opname_detail()` | `is_admin() OR service_role` |
| `20260608150000_drop_and_recreate_stock_opname_functions.sql` | `get_stock_opname_list()` (updated) | `is_admin() OR service_role` |
| `20260608150000_drop_and_recreate_stock_opname_functions.sql` | `get_stock_opname_detail()` (updated) | `is_admin() OR service_role` |
| `20260608170000_add_delete_stock_opname_function.sql` | `delete_stock_opname()` | `is_admin() OR service_role` |
| `20260608180000_add_bulk_import_stock_opname.sql` | `bulk_import_stock_opname()` | `is_admin() OR service_role` |

### Exact Authorization Code in RPC Functions

**Example from `create_stock_opname()`:**
```sql
IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
  RAISE EXCEPTION 'Not authorized to create stock opname';
END IF;
```

**Same pattern in:**
- `get_stock_opname_list()` - Line ~17
- `get_stock_opname_detail()` - Line ~84
- `delete_stock_opname()` - Line ~16
- `bulk_import_stock_opname()` - Line ~25

### GRANT Statements
```sql
GRANT EXECUTE ON FUNCTION public.get_stock_opname_list(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opname_detail(BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_stock_opname(BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_import_stock_opname(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_stock_opname(...) TO authenticated, service_role;
```

---

## 2. RLS Policies

### Tables Affected
- `public.stock_opname` (header table)
- `public.stock_opname_items` (detail/line items table)

### Policies for `stock_opname`

#### File: `20260608120000_ensure_stock_opname_tables.sql`

**1. Admin View Policy**
```sql
CREATE POLICY "Admin can view all stock opname" ON public.stock_opname
  FOR SELECT
  USING (public.is_admin() OR auth.role() = 'service_role');
```

**2. Admin Insert Policy**
```sql
CREATE POLICY "Admin can insert stock opname" ON public.stock_opname
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
```

**3. Admin Update Policy**
```sql
CREATE POLICY "Admin can update stock opname" ON public.stock_opname
  FOR UPDATE
  USING (public.is_admin() OR auth.role() = 'service_role')
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
```

**4. Owner View Policy (SELECT only)**
```sql
CREATE POLICY "Owner can view stock opname" ON public.stock_opname
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'super_admin')
    )
  );
```

### Policies for `stock_opname_items`

**1. Admin View Policy**
```sql
CREATE POLICY "Admin can view all stock opname items" ON public.stock_opname_items
  FOR SELECT
  USING (public.is_admin() OR auth.role() = 'service_role');
```

**2. Admin Insert Policy**
```sql
CREATE POLICY "Admin can insert stock opname items" ON public.stock_opname_items
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');
```

### Updated Owner Policy
File: `20260608190000_add_owner_stock_opname_permissions.sql`

```sql
CREATE POLICY "Owner can view stock opname" ON public.stock_opname
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin', 'super_admin')
    )
  );
```

---

## 3. Frontend Authorization Checks

### Main Page: [frontend/src/pages/admin/StockOpname.tsx](frontend/src/pages/admin/StockOpname.tsx)

**Role Detection:**
```typescript
const { role } = useUserRole();
const isOwner = role === 'owner';
```

**Create Button - Hidden from Owner:**
```typescript
{!isOwner && (
  <button
    onClick={() => setShowFormModal(true)}
    className="... bg-[#ff4b86] ..."
  >
    Buat Stock Opname
  </button>
)}
```

**Delete Permission - Passed to Table:**
```typescript
<StockOpnameTable
  data={stockOpnameList}
  onViewDetail={handleViewDetail}
  onDelete={(id) => { ... }}
  canDelete={!isOwner}  // ← Owner cannot delete
/>
```

**Empty State Message - Role-based:**
```typescript
<p>
  {isOwner
    ? 'Gunakan fitur import untuk menambah stock opname'
    : 'Mulai dengan membuat stock opname pertama Anda'}
</p>
```

### Detail Page: [frontend/src/pages/admin/StockOpnameDetail.tsx](frontend/src/pages/admin/StockOpnameDetail.tsx)

Uses `useStockOpnameDetail()` hook which calls `get_stock_opname_detail()` RPC.

---

## 4. Data Access Flow

### Read Operations (View)

```
Owner User
  ↓
Frontend: StockOpname.tsx (useStockOpnameList)
  ↓
RPC: get_stock_opname_list()
  ├─ Checks: is_admin() OR service_role
  ├─ Result: ❌ DENIED (owner role not explicitly allowed here)
  │
  └─ [FALLBACK via RLS]
     └─ RLS Policy: "Owner can view stock opname"
        ├─ Checks: user has 'owner'/'admin'/'super_admin' in user_role_assignments
        ├─ Result: ✅ ALLOWED for SELECT operations
```

**Issue:** The RPC function `get_stock_opname_list()` checks `is_admin()` directly and doesn't allow owner to EXECUTE the function. However, if owner role user could bypass the RPC check, RLS would allow SELECT.

### Write Operations (Create/Update/Delete)

```
Owner User
  ↓
Frontend: UI hides buttons for !isOwner
  ├─ Create button: ❌ Hidden
  ├─ Delete button: ❌ Hidden (canDelete={!isOwner})
  └─ Import button: ✅ Visible (always shown)
  ↓
If owner tries to call RPC directly:
  ├─ RPC: create_stock_opname() → ❌ DENIED (is_admin() check fails)
  ├─ RPC: delete_stock_opname() → ❌ DENIED (is_admin() check fails)
  └─ RPC: bulk_import_stock_opname() → ❌ DENIED (is_admin() check fails)
```

---

## 5. Current Role Permissions

### Admin Role
✅ CREATE stock opname  
✅ READ (list/detail) stock opname  
✅ UPDATE stock opname (no explicit UPDATE RPC, only via SQL)  
✅ DELETE stock opname  
✅ BULK IMPORT stock opname  

### Owner Role
❌ CREATE stock opname  
⚠️ READ stock opname (RLS allows SELECT, but RPC doesn't - see issue below)  
❌ UPDATE stock opname  
❌ DELETE stock opname  
❌ BULK IMPORT stock opname  

### StarGuide Role
❌ No stock opname access mentioned

### Kasir (Cashier) Role
❌ No explicit stock opname access (comment in `create_stock_opname()` says "only admin or kasir" but check only tests for admin)

---

## 6. Authorization Conflict/Bug

### Issue: RPC vs RLS Mismatch

**RPC Authorization:**
- `get_stock_opname_list()`: `IF NOT (public.is_admin() OR service_role)`
- Only allows: `admin` and `service_role`
- Does NOT explicitly allow: `owner`

**RLS Authorization:**
- `"Owner can view stock opname"` policy: `role_name IN ('owner', 'admin', 'super_admin')`
- Allows: `owner`, `admin`, `super_admin`

**Result:** 
Owner role users cannot execute `get_stock_opname_list()` RPC function even though RLS would allow them to SELECT from the table. This is because the **RPC function has a stricter check** than the RLS policy.

**Test Case:**
```typescript
// Owner user calls:
const { data, error } = await supabase.rpc('get_stock_opname_list', {
  p_limit: 50,
  p_offset: 0,
});
// Result: error.message = 'Not authorized to view stock opname'
```

---

## 7. File Reference Summary

### Migrations (Source of Truth)
- [20260608000000_add_stock_opname_system.sql](supabase/migrations/20260608000000_add_stock_opname_system.sql) - Initial setup with RPC functions
- [20260608120000_ensure_stock_opname_tables.sql](supabase/migrations/20260608120000_ensure_stock_opname_tables.sql) - Tables and RLS policies
- [20260608150000_drop_and_recreate_stock_opname_functions.sql](supabase/migrations/20260608150000_drop_and_recreate_stock_opname_functions.sql) - Recreated RPC functions
- [20260608170000_add_delete_stock_opname_function.sql](supabase/migrations/20260608170000_add_delete_stock_opname_function.sql) - Delete function
- [20260608180000_add_bulk_import_stock_opname.sql](supabase/migrations/20260608180000_add_bulk_import_stock_opname.sql) - Bulk import function
- [20260608190000_add_owner_stock_opname_permissions.sql](supabase/migrations/20260608190000_add_owner_stock_opname_permissions.sql) - Updated RLS owner policy

### Frontend
- [frontend/src/pages/admin/StockOpname.tsx](frontend/src/pages/admin/StockOpname.tsx) - Main list page with role checks
- [frontend/src/pages/admin/StockOpnameDetail.tsx](frontend/src/pages/admin/StockOpnameDetail.tsx) - Detail page
- [frontend/src/hooks/useStockOpname.ts](frontend/src/hooks/useStockOpname.ts) - Hooks for calling RPC functions
- [frontend/src/app/routes/adminRoutes.ts](frontend/src/app/routes/adminRoutes.ts) - Routing (lines 80-82)

### Documentation
- [docs/runbooks/STOCK_OPNAME.md](docs/runbooks/STOCK_OPNAME.md) - API documentation

---

## 8. Recommendations to Fix Owner Access

If owner role should be able to VIEW stock opname records:

### Option A: Update RPC Functions (Recommended)
Modify all `get_stock_opname_*` functions to check for owner role:

```sql
-- BEFORE:
IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
  RAISE EXCEPTION 'Not authorized to view stock opname';
END IF;

-- AFTER:
IF NOT (public.is_admin() OR public.is_owner() OR auth.role() = 'service_role') THEN
  RAISE EXCEPTION 'Not authorized to view stock opname';
END IF;
```

Affected functions:
- `get_stock_opname_list()`
- `get_stock_opname_detail()`

### Option B: Keep RPC Restricted
If owner should NOT have programmatic access, ensure:
- RPC checks remain `is_admin() OR service_role` only
- RLS SELECT policy prevents direct table access from non-admin users
- Only admin-created views/materialized views show owner data

---

## 13. Test SQL

```sql
-- Check if owner user can execute RPC:
SELECT auth.uid(); -- Should return owner's UUID

-- Try to call RPC as owner:
SELECT * FROM public.get_stock_opname_list(50, 0);
-- Expected: 'Not authorized to view stock opname' error

-- Check RLS policies:
SELECT * FROM stock_opname WHERE auth.uid()::text = 'owner-uuid';
-- Result depends on RLS policy evaluation

-- Check user role:
SELECT user_id, role_name 
FROM public.user_role_assignments 
WHERE user_id = auth.uid();
-- Should show 'owner' in role_name column
```

---

## Key Takeaway

**Owner role is NOT officially supported for stock opname operations.** All RPC authorization checks explicitly whitelist only `admin` and `service_role`. The RLS SELECT policy for owner was added but the RPC functions were not updated to honor this policy. This creates a security/consistency gap where:
- Owner cannot execute RPC functions (blocked by function-level auth)
- Owner could theoretically SELECT from table directly (allowed by RLS)
- Frontend UI prevents owner from even attempting create/delete (UI-level restrictions)
