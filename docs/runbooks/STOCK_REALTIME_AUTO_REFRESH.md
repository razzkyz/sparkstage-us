# Stock Management Realtime Auto-Refresh

## Overview

Ketiga halaman stock management (**Stock Opening**, **Stock Adjustments**, **Stock Opname**) sekarang memiliki fitur **realtime auto-refresh**. Setiap perubahan di database akan langsung terlihat di UI tanpa perlu reload manual.

## Fitur yang Diaktifkan

### ✅ Auto-Refresh Events

Semua halaman akan auto-refresh ketika terjadi:

1. **CREATE** - Ada data baru ditambahkan
2. **UPDATE** - Data diupdate (edit, confirm, finalize)
3. **DELETE** - Data dihapus

### ✅ Halaman yang Mendukung Realtime

#### 1. Stock Opening (`/admin/stock-opening`)
- Auto-refresh saat opening baru dibuat
- Auto-refresh saat opening di-confirm
- Auto-refresh saat opening di-edit
- Auto-refresh saat opening dihapus

#### 2. Stock Adjustments (`/admin/stock-adjustments`)
- Auto-refresh saat adjustment baru dibuat
- Auto-refresh saat adjustment di-edit
- Auto-refresh saat adjustment dihapus

#### 3. Stock Opname (`/admin/stock-opname`)
- Auto-refresh saat opname baru dibuat
- Auto-refresh saat opname di-finalize
- Auto-refresh saat opname dihapus

## Teknologi

### Supabase Realtime

Menggunakan **Supabase Realtime** dengan PostgreSQL replication:

```typescript
supabase
  .channel('stock-openings-changes')
  .on('postgres_changes', {
    event: '*',  // Listen to INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'stock_openings',
  }, () => {
    // Auto-refresh data
    queryClient.invalidateQueries({ queryKey: ['stock-openings'] });
  })
  .subscribe();
```

### TanStack Query Integration

Menggunakan **Query Invalidation** untuk trigger refetch:

```typescript
queryClient.invalidateQueries({ queryKey: ['stock-openings'] });
```

## Cara Kerja

### Architecture Flow

```
┌─────────────────┐
│  Admin Action   │ ← User create/edit/delete
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database Write │ ← INSERT/UPDATE/DELETE
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Postgres Event  │ ← Replication event
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase        │ ← Broadcast via websocket
│ Realtime        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend Hook  │ ← useStockOpeningList, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query Refetch  │ ← Auto-fetch latest data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UI Update     │ ← Table updated automatically
└─────────────────┘
```

### Example Scenario

**Multi-User Environment:**

1. **Admin A** membuka `/admin/stock-opening` di browser
2. **Admin B** membuat stock opening baru
3. **Backend** insert data ke `stock_openings` table
4. **Postgres** trigger replication event
5. **Supabase Realtime** broadcast event ke semua subscribers
6. **Admin A's browser** receive event via websocket
7. **Query invalidate** trigger refetch data
8. **Admin A** langsung lihat opening baru tanpa reload page

## Console Logs

Saat ada perubahan, akan muncul log di browser console:

```
🔄 Stock opening changed, refreshing...
🔄 Stock adjustment changed, refreshing...
🔄 Stock opname changed, refreshing...
```

## Database Setup

### Migration File

File: `supabase/migrations/20260609070000_enable_realtime_stock_tables.sql`

```sql
-- Enable realtime for stock_openings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_openings;

-- Enable realtime for stock_adjustments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_adjustments;

-- Enable realtime for stock_opnames table
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_opnames;
```

### Permissions

```sql
-- Grant SELECT to authenticated users for realtime broadcast
GRANT SELECT ON public.stock_openings TO authenticated;
GRANT SELECT ON public.stock_adjustments TO authenticated;
GRANT SELECT ON public.stock_opnames TO authenticated;
```

## Frontend Implementation

### Hooks Location

File: `frontend/src/hooks/useStockOpnameNew.ts`

### Code Structure

```typescript
export const useStockOpeningList = (limit = 50, offset = 0) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stock-openings', limit, offset],
    queryFn: async () => {
      // Fetch data from RPC
      const { data, error } = await supabase.rpc('get_stock_opening_list', {
        p_limit: limit,
        p_offset: offset,
      });
      // ...
    },
  });

  // ✨ Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('stock-openings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stock_openings',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['stock-openings'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
```

## Benefits

### ✅ User Experience

1. **No Manual Refresh** - Data selalu up-to-date tanpa F5
2. **Multi-User Sync** - Semua admin lihat perubahan real-time
3. **Instant Feedback** - Lihat hasil aksi langsung

### ✅ Operational Efficiency

1. **Reduced Confusion** - Tidak ada data stale/outdated
2. **Better Collaboration** - Admin bisa kerja bareng tanpa konflik
3. **Faster Workflow** - Tidak perlu tunggu refresh manual

### ✅ Data Integrity

1. **Always Fresh** - Data di UI = data di database
2. **No Race Conditions** - Update langsung sync
3. **Audit Trail** - Semua perubahan langsung terlihat

## Performance

### Network Overhead

- **Websocket Connection**: 1 persistent connection per user
- **Data Transfer**: Minimal (hanya event trigger, bukan full data)
- **Bandwidth**: ~1-5 KB per event notification

### Optimization

- Channel subscription di-cleanup saat unmount
- Query cache prevent unnecessary refetch
- Debounced invalidation (via TanStack Query)

## Troubleshooting

### Problem: Realtime tidak bekerja

**Symptoms:** Perubahan tidak langsung terlihat di UI

**Possible Causes:**

1. ❌ Migration belum di-deploy
   ```bash
   # Solution
   npm run supabase:db:push
   ```

2. ❌ Realtime tidak enabled di Supabase project
   ```
   # Check di Supabase Dashboard
   Project Settings > Database > Enable Realtime
   ```

3. ❌ Browser console error websocket
   ```
   # Check console for:
   WebSocket connection failed
   ```

### Problem: Too many refetch

**Symptoms:** Table refresh terlalu sering

**Causes:** Multiple invalidation events

**Solution:** Already handled by TanStack Query debouncing

### Problem: Console log spam

**Symptoms:** Terlalu banyak log "refreshing..."

**Solution:** Remove console.log di production build:
```typescript
// Before
console.log('🔄 Stock opening changed, refreshing...');

// After (production)
if (import.meta.env.DEV) {
  console.log('🔄 Stock opening changed, refreshing...');
}
```

## Testing Realtime

### Manual Testing Steps

1. **Open 2 browser windows** (or 2 different browsers)
2. **Window A**: Masuk ke `/admin/stock-opening`
3. **Window B**: Masuk ke `/admin/stock-opening`
4. **Window A**: Buat opening baru → Klik "Buat Stock Opening"
5. **Window B**: **Automatically refresh** - opening baru muncul tanpa reload
6. **Window B**: Klik "Finalize" pada opening
7. **Window A**: **Automatically refresh** - status berubah ke "Finalized"

### Multi-User Scenario

**Scenario 1: Create Collision**
- Admin A dan B sama-sama buka form create
- Admin A submit duluan → Stock opening #001 dibuat
- Admin B lihat auto-refresh, data updated
- Admin B submit → Stock opening #002 dibuat (no conflict)

**Scenario 2: Delete Race**
- Admin A dan B sama-sama lihat opening #001
- Admin A klik hapus → Success
- Admin B lihat auto-refresh, opening #001 hilang dari list
- Admin B tidak bisa hapus lagi (sudah tidak ada)

## Deployment

### Step 1: Deploy Migration

```bash
npm run supabase:db:push
```

### Step 2: Verify Realtime Enabled

Check Supabase Dashboard:
- Project Settings > Database > Publications
- Verify `supabase_realtime` includes stock tables

### Step 3: Deploy Frontend

```bash
npm run build
# Deploy dist/ folder
```

### Step 4: Test

Open 2 browser tabs, test create/edit/delete actions.

## Monitoring

### Supabase Dashboard

Check realtime connections:
- Database > Replication
- See active subscriptions
- Monitor event logs

### Browser DevTools

Check websocket in Network tab:
- Filter: WS (websocket)
- See heartbeat messages
- Monitor event broadcasts

## Related Docs

- [Stock Opname System](./stock-opname-system.md)
- [Stock Opname Finalize](./STOCK_OPNAME_FINALIZE.md)
- [Admin Product Entry](./admin-product-entry.md)

## Summary

✅ **3 halaman** sudah realtime (Stock Opening, Adjustments, Opname)
✅ **Auto-refresh** saat create/update/delete/finalize
✅ **Multi-user sync** untuk kolaborasi admin
✅ **Zero configuration** needed - langsung works setelah deploy
✅ **Performance optimized** dengan debounced invalidation

**No more manual refresh needed!** 🎉
