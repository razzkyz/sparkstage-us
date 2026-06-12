# 🎯 NEXT STEPS - Data Cleanup & Production Sync

## ✅ Apa yang sudah siap

Semua tools sudah dibuat dan siap digunakan:

### Scripts
✅ `scripts/identify-dummy-data.ts` - Scan dummy data  
✅ `scripts/cleanup-dummy-data.ts` - Delete with cascade  
✅ `scripts/validate-production-data.ts` - Validate integrity  
✅ `scripts/sync-dummy-to-production.ts` - Update format  

### Database
✅ `supabase/migrations/20260523000000_add_data_cleanup_functions.sql` - SQL functions  

### Documentation  
✅ `docs/runbooks/data-cleanup-sync.md` - Complete runbook  
✅ `DATA_CLEANUP_SUMMARY.md` - Quick reference  
✅ `SQL_CLEANUP_REFERENCE.sql` - SQL quick reference  

### Configuration
✅ `package.json` - 6 new NPM scripts added

---

## 🚀 Langkah-langkah Berikutnya

### 1️⃣ Push Database Migration

```bash
cd /path/to/sparkstage
npm run supabase:db:push
```

Ini akan apply migration yang berisi SQL functions untuk cleanup.

### 2️⃣ Identify Dummy Data

```bash
npm run data:identify-dummy
```

Review output untuk lihat berapa banyak dummy data ada.

### 3️⃣ Validate Production Data

```bash
npm run data:validate-production
```

Pastikan production data dari DOKU valid sebelum cleanup.

### 4️⃣ Choose Your Strategy

**PILIH SATU:**

#### Strategy A: CLEANUP (Recommended)
Hapus semua dummy data, keep hanya production:
```bash
npm run data:cleanup-dummy         # dry-run
npm run data:cleanup-dummy:confirm # execute
```

#### Strategy B: SYNC (Optional)  
Keep dummy untuk testing tapi update ke production format:
```bash
npm run data:sync-dummy-to-production         # dry-run
npm run data:sync-dummy-to-production:confirm # execute
```

### 5️⃣ Verify Results

```bash
npm run data:validate-production
```

Pastikan production data still intact.

---

## 📋 Safety Checklist

SEBELUM execute cleanup/sync:

- [ ] Database sudah di-backup
- [ ] Sudah read `docs/runbooks/data-cleanup-sync.md`
- [ ] Sudah run identify dan review output
- [ ] Sudah run validate-production
- [ ] Sudah run DRY-RUN (cleanup atau sync)
- [ ] Sudah understand apa yang akan didelete/update
- [ ] Supabase migration sudah di-push
- [ ] Environment sudah production atau staging (not local dev)

---

## 📁 File Reference

### Documentation (Read these first)
- `DATA_CLEANUP_SUMMARY.md` - Quick overview (you're reading now!)
- `docs/runbooks/data-cleanup-sync.md` - Detailed runbook with troubleshooting
- `SQL_CLEANUP_REFERENCE.sql` - SQL query reference

### Scripts
- `scripts/identify-dummy-data.ts` - Scan only, no changes
- `scripts/cleanup-dummy-data.ts` - Delete with dry-run option
- `scripts/validate-production-data.ts` - Validate only, no changes
- `scripts/sync-dummy-to-production.ts` - Update with dry-run option

### Database
- `supabase/migrations/20260523000000_add_data_cleanup_functions.sql` - RPC functions

---

## 💡 Tips

### If you have questions:
1. Check `docs/runbooks/data-cleanup-sync.md` - Complete guide
2. Check `SQL_CLEANUP_REFERENCE.sql` - SQL examples
3. Run identify/validate scripts first to understand data

### If something goes wrong:
1. Stop immediately - don't run execute command
2. Check backup database
3. Restore from backup if needed
4. Review troubleshooting in runbook

### For dry-runs:
- Always run dry-run first
- Read output carefully
- Only proceed to confirm if output looks correct

---

## 🔗 Database Functions Available

After migration is pushed, these RPC functions available in Supabase:

```sql
-- Get summary of dummy data
SELECT * FROM public.get_dummy_data_summary();

-- List dummy products
SELECT * FROM public.identify_dummy_products();

-- List test orders
SELECT * FROM public.identify_test_orders();

-- List orders missing DOKU
SELECT * FROM public.identify_orders_without_doku();

-- Execute cleanup (⚠️ only after backup!)
SELECT * FROM public.cleanup_dummy_data();
```

---

## ⏰ Estimated Time

- Identify: ~30 seconds
- Validate: ~30 seconds  
- Cleanup dry-run: ~1-2 minutes
- Cleanup execute: ~2-5 minutes (depends on data size)
- Cleanup verify: ~30 seconds

---

## ✅ When Done

After cleanup/sync is complete:

1. ✅ Verify production data is intact
2. ✅ Check DOKU webhook logs
3. ✅ Check audit_logs table for cleanup record
4. ✅ Commit this work to git
5. ✅ Document cleanup in team notes

---

**Ready? Let's go! 🚀**

Start with: `npm run supabase:db:push` and then `npm run data:identify-dummy`
