# 🧹 Data Cleanup & Production Sync - Summary

## ✅ Apa yang sudah saya buat

### 1. **Identification Tools** (Untuk scanning dummy data)

Script untuk find semua dummy products, tickets, dan test orders:

```bash
npm run data:identify-dummy
```

Output akan show:
- 📦 Berapa banyak dummy products
- 🎫 Berapa banyak dummy tickets  
- 📋 Berapa banyak test orders
- 🔗 Berapa order_products linked ke dummy data

### 2. **Validation Tools** (Untuk check production data)

Script untuk validate production data integrity:

```bash
npm run data:validate-production
```

Output akan show:
- ✓ Valid products dengan variants
- ✓ Valid tickets
- ✓ Valid orders dengan DOKU reference
- ⚠️ Orphaned products (tanpa variants)
- ⚠️ Orders missing DOKU sync

### 3. **Cleanup Tools** (Untuk delete dummy data)

**DRY RUN** (lihat apa yang akan didelete):
```bash
npm run data:cleanup-dummy
```

**EXECUTE** (actually delete):
```bash
npm run data:cleanup-dummy:confirm
```

Akan delete dengan cascade yang aman:
1. order_products linked ke dummy data
2. test orders
3. product_variants dari dummy products
4. dummy products
5. dummy tickets

### 4. **Sync Tools** (Opsional - untuk keep dummy data)

**DRY RUN** (lihat apa yang akan di-sync):
```bash
npm run data:sync-dummy-to-production
```

**EXECUTE** (actually sync):
```bash
npm run data:sync-dummy-to-production:confirm
```

Akan update:
- Dummy product prices ke range realistic
- Dummy ticket availability match production
- Clear test order payment references

### 5. **Database Functions** (SQL RPC)

Migration baru add helper functions:
- `get_dummy_data_summary()` - Quick summary
- `identify_dummy_products()` - Detailed product list
- `identify_test_orders()` - Detailed order list
- `identify_orders_without_doku()` - Find sync issues
- `cleanup_dummy_data()` - Atomic cleanup function

---

## 🚀 Quick Start

### Option 1: CLEANUP (Recommended)

```bash
# 1. Identify semua dummy data
npm run data:identify-dummy

# 2. Validate production data
npm run data:validate-production

# 3. Dry run cleanup
npm run data:cleanup-dummy

# 4. Jika OK, execute cleanup
npm run data:cleanup-dummy:confirm

# 5. Validate lagi
npm run data:validate-production
```

### Option 2: SYNC (Jika keep dummy)

```bash
# 1. Identify semua dummy data
npm run data:identify-dummy

# 2. Validate production data
npm run data:validate-production

# 3. Dry run sync
npm run data:sync-dummy-to-production

# 4. Jika OK, execute sync
npm run data:sync-dummy-to-production:confirm
```

---

## 📋 Checklist Sebelum Execute

- [ ] Database sudah di-backup
- [ ] Sudah read `docs/runbooks/data-cleanup-sync.md`
- [ ] Sudah run `npm run data:identify-dummy` dan review output
- [ ] Sudah run `npm run data:validate-production`
- [ ] Sudah run DRY RUN (cleanup atau sync)
- [ ] Sudah understand apa yang akan didelete/update
- [ ] Ada access ke admin dashboard jika ada issues

---

## 📚 Documentation

**Full runbook**: `docs/runbooks/data-cleanup-sync.md`

Berisi:
- Detailed step-by-step instructions
- Troubleshooting guide
- Safety checklist
- SQL functions reference
- DOKU sync documentation

---

## 🔧 Files Modified/Created

### Scripts
- `scripts/identify-dummy-data.ts` - Scan dummy data
- `scripts/cleanup-dummy-data.ts` - Delete with cascade  
- `scripts/validate-production-data.ts` - Validate integrity
- `scripts/sync-dummy-to-production.ts` - Update format

### Database
- `supabase/migrations/20260523000000_add_data_cleanup_functions.sql` - Helper functions

### Docs
- `docs/runbooks/data-cleanup-sync.md` - Complete runbook

### Config
- `package.json` - Added 6 new NPM scripts

---

## ⚠️ Important Notes

1. **Backup dulu** - Jangan lupa backup database sebelum cleanup
2. **Dry-run first** - Selalu jalankan dry-run sebelum execute
3. **Production data** - Pastikan production data valid sebelum cleanup
4. **DOKU sync** - Check webhook logs setelah cleanup
5. **Atomic** - Cleanup function atomic transaction, jadi aman dari partial deletes

---

## 🎯 Next Steps

1. ✅ Review files yang sudah di-create
2. ✅ Push migration ke database: `npm run supabase:db:push`
3. ✅ Run `npm run data:identify-dummy` untuk lihat dummy data
4. ✅ Decide: cleanup atau sync?
5. ✅ Follow langkah-langkah di runbook
6. ✅ Validate production data setelah selesai

---

**Untuk questions atau issues**, lihat `docs/runbooks/data-cleanup-sync.md` Troubleshooting section.

Good luck! 🚀
