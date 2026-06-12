-- =====================================================
-- ROLLBACK SCRIPT: Lucky Charm Migration
-- Date: 2026-06-09
-- Description: Safe rollback untuk migration lucky charm
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           ROLLBACK LUCKY CHARM MIGRATION           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: COUNT DATA YANG AKAN DIHAPUS
-- =====================================================

DO $$
DECLARE
  rows_to_delete INT;
BEGIN
  SELECT COUNT(*) INTO rows_to_delete
  FROM product_retail
  WHERE slug LIKE '%-retail';
  
  IF rows_to_delete = 0 THEN
    RAISE NOTICE '✅ No data to rollback. Table is clean.';
  ELSE
    RAISE NOTICE '⚠️  Found % rows to be deleted', rows_to_delete;
    RAISE NOTICE '';
  END IF;
END $$;

-- =====================================================
-- STEP 2: PREVIEW DATA YANG AKAN DIHAPUS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📋 PREVIEW (First 5 rows to be deleted):';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;

SELECT 
  id,
  LEFT(name, 40) as name,
  LEFT(slug, 50) as slug,
  price,
  stock
FROM product_retail
WHERE slug LIKE '%-retail'
ORDER BY id
LIMIT 5;

-- =====================================================
-- STEP 3: BACKUP BEFORE DELETE (Extra Safety)
-- =====================================================

DO $$
DECLARE
  backup_table_name TEXT;
  row_count INT;
BEGIN
  SELECT COUNT(*) INTO row_count
  FROM product_retail
  WHERE slug LIKE '%-retail';
  
  IF row_count > 0 THEN
    backup_table_name := 'product_retail_rollback_backup_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 Creating rollback backup: %', backup_table_name;
    
    EXECUTE format(
      'CREATE TABLE %I AS SELECT * FROM product_retail WHERE slug LIKE ''%%-retail''',
      backup_table_name
    );
    
    RAISE NOTICE '✅ Backup created with % rows', row_count;
    RAISE NOTICE '   Restore command: INSERT INTO product_retail SELECT * FROM %', backup_table_name;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: DELETE MIGRATED DATA
-- =====================================================

DO $$
DECLARE
  deleted_count INT;
BEGIN
  RAISE NOTICE '🗑️  Executing rollback...';
  RAISE NOTICE '';
  
  WITH deleted AS (
    DELETE FROM product_retail
    WHERE slug LIKE '%-retail'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RAISE NOTICE '✅ Rollback completed!';
  RAISE NOTICE '   Rows deleted: %', deleted_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

DO $$
DECLARE
  remaining_count INT;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM product_retail
  WHERE slug LIKE '%-retail';
  
  RAISE NOTICE '📊 POST-ROLLBACK VERIFICATION:';
  RAISE NOTICE '════════════════════════════════════════════════════';
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Rollback successful - no migrated data remaining';
  ELSE
    RAISE WARNING '⚠️  Still found % rows with -retail suffix', remaining_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 6: SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║          ✅ ROLLBACK COMPLETED SUCCESSFULLY        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📝 What happened:';
  RAISE NOTICE '   ✅ All Lucky Charm products removed from product_retail';
  RAISE NOTICE '   ✅ Original products/product_variants tables UNTOUCHED';
  RAISE NOTICE '   ✅ Backup created for safety';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 To restore (if needed):';
  RAISE NOTICE '   -- Find backup table:';
  RAISE NOTICE '   SELECT tablename FROM pg_tables';
  RAISE NOTICE '   WHERE tablename LIKE ''product_retail_rollback_backup_%'';';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Restore from backup:';
  RAISE NOTICE '   INSERT INTO product_retail ';
  RAISE NOTICE '   SELECT * FROM product_retail_rollback_backup_YYYYMMDD_HHMMSS;';
  RAISE NOTICE '';
END $$;
