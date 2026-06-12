# Safe R2 Cutover - Step by Step Guide

**Date:** 2026-06-10
**Status:** Ready to Execute

---

## 🎯 OVERVIEW

You will run 3 SQL scripts in Supabase SQL Editor:
1. **Backup** → Creates safety backup
2. **Test Batch** → Test 10 products first
3. **Full Cutover** → Migrate all 2,227 images

**Total Time:** 15-20 minutes

---

## ✅ STEP 1: BACKUP (5 minutes)

### Open Supabase SQL Editor:
1. Login: https://supabase.com/dashboard
2. Click project: **SparkStage**
3. Sidebar: **SQL Editor**
4. Click: **"New query"**

### Run Backup Script:
1. Open file in VS Code: `scripts/backup-before-cutover.sql`
2. **Copy ALL** (Ctrl+A, Ctrl+C)
3. **Paste** in Supabase SQL Editor (Ctrl+V)
4. **Click "Run"** button (or press Ctrl+Enter)

### Expected Output:
```
Row 1: "BACKUP SUCCESSFUL!" | 2227
Row 2: "Original table" | 2227
Row 3: "Backup table" | 2227
```

### ✅ If output matches → PROCEED to Step 2
### ❌ If error → Tell me the error message

---

## ✅ STEP 2: TEST BATCH (10 products) (5 minutes)

### Run Test Batch Script:
1. **New query** in Supabase SQL Editor
2. Open file: `scripts/cutover-test-batch.sql`
3. **Copy ALL** (Ctrl+A, Ctrl+C)
4. **Paste** in Supabase SQL Editor (Ctrl+V)
5. **Click "Run"** button

### Expected Output:
```
-- Shows 10 products with old/new URLs (preview)
-- UPDATE 10 (confirmation)
-- Shows 10 updated products with new cdn.sparkstage55.com URLs
```

### Test on Website:
1. Open: `www.sparkstage55.com`
2. Find products with IDs from SQL output
3. Verify images load correctly
4. Press F12 → Network tab
5. Verify images load from `cdn.sparkstage55.com`

### ✅ If 10 products work → PROCEED to Step 3
### ❌ If images broken → STOP, run rollback script

---

## ✅ STEP 3: FULL CUTOVER (10 minutes)

### Run Full Cutover Script:
1. **New query** in Supabase SQL Editor
2. Open file: `scripts/cutover-products-to-r2.sql`
3. **Copy ALL** (Ctrl+A, Ctrl+C)
4. **Paste** in Supabase SQL Editor (Ctrl+V)
5. **Click "Run"** button

### Expected Output:
```
NOTICE: ================================================
NOTICE: CUTOVER VERIFICATION
NOTICE: ================================================
NOTICE: Total product images: 2227
NOTICE: R2 provider: 2227 (100.0%)
NOTICE: ImageKit provider: 0 (0.0%)
NOTICE: ================================================
NOTICE: ✅ Cutover verification passed!

-- Shows 5 sample URLs (old vs new)
```

### IMPORTANT: Manual COMMIT Required!

**Script stops before COMMIT.** You must manually decide:

#### If verification looks good:
```sql
COMMIT;
```
Type `COMMIT;` in SQL Editor and run.

#### If something looks wrong:
```sql
ROLLBACK;
```
Type `ROLLBACK;` in SQL Editor and run.

---

## ✅ STEP 4: VERIFY WEBSITE (5 minutes)

### Test After COMMIT:

1. **Open website:** `www.sparkstage55.com`
2. **Browse 20+ random products**
3. **Check images loading correctly**
4. **Open DevTools (F12) → Console tab**
5. **Look for errors:** Should be NO 404 errors
6. **Check Network tab:** Images load from `cdn.sparkstage55.com`

### Test Different Devices:
- [ ] Laptop
- [ ] HP (WiFi)
- [ ] HP (data seluler)

### ✅ If all tests pass → MIGRATION COMPLETE! 🎉
### ❌ If images broken → Run rollback script

---

## 🔄 ROLLBACK (If Needed)

### If cutover has issues, run rollback:

1. **New query** in Supabase SQL Editor
2. Open file: `scripts/rollback-to-imagekit.sql`
3. **Copy ALL** and paste
4. **Click "Run"**

This restores all URLs back to ImageKit immediately.

---

## 📊 SUCCESS CRITERIA

Migration successful if:
- ✅ All product images loading
- ✅ Images from `cdn.sparkstage55.com`
- ✅ No 404 errors in console
- ✅ Works on all devices
- ✅ No customer complaints

---

## 💰 AFTER SUCCESS

**Congratulations!** You now have:
- ✅ Zero-cost egress (bandwidth FREE)
- ✅ Monthly saving: Rp 50K - 200K
- ✅ Annual saving: Rp 600K - 2.4M
- ✅ Faster image delivery via Cloudflare CDN

---

## 📞 IF YOU NEED HELP

**At any step, if you see error or something wrong:**
1. STOP immediately
2. Take screenshot of error
3. Tell me what step you're on
4. I'll help troubleshoot

---

## 🎯 READY TO START?

**Start with Step 1: Backup**

Open Supabase SQL Editor and run:
- `scripts/backup-before-cutover.sql`

Then tell me the output! 🚀
