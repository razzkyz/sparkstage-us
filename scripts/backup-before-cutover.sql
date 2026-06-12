-- ============================================================================
-- BACKUP SCRIPT - Run This FIRST Before Cutover
-- ============================================================================
-- This creates a complete backup of product_images table
-- Date: 2026-06-10
-- ============================================================================

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS product_images_backup_r2_migration AS
SELECT * FROM product_images;

-- Step 2: Verify backup created
SELECT 
  'BACKUP SUCCESSFUL!' as status,
  COUNT(*) as total_images_backed_up
FROM product_images_backup_r2_migration;

-- Step 3: Compare counts (should be identical)
SELECT 
  'Original table' as source,
  COUNT(*) as count
FROM product_images
UNION ALL
SELECT 
  'Backup table' as source,
  COUNT(*) as count
FROM product_images_backup_r2_migration;

-- ============================================================================
-- EXPECTED OUTPUT:
-- Row 1: "BACKUP SUCCESSFUL!" | 2227 (or similar count)
-- Row 2: "Original table" | 2227
-- Row 3: "Backup table" | 2227
-- ============================================================================
