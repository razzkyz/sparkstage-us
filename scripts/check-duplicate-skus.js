#!/usr/bin/env node

/**
 * Check for duplicate SKUs in Indonesia database
 */

import { createClient } from '@supabase/supabase-js';

const INDO_SUPABASE_URL = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const INDO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3OTI1NiwiZXhwIjoyMDgzODU1MjU2fQ.vvgQz9vOECs75P5ZY2wPHWW08DYXxviyaHLU9oxQyh4';

const indoSupabase = createClient(INDO_SUPABASE_URL, INDO_SUPABASE_KEY);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate SKUs in Indonesia database...\n');

  const { data, error } = await indoSupabase.rpc('exec_sql', {
    sql: `
      SELECT sku, COUNT(*) as count
      FROM product_variants
      WHERE sku IS NOT NULL
      GROUP BY sku
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `
  });

  if (error) {
    console.error('❌ Error:', error);
    
    // Fallback: fetch all and check manually
    console.log('\nFallback: Checking manually...');
    const { data: variants } = await indoSupabase
      .from('product_variants')
      .select('id, sku, name')
      .not('sku', 'is', null)
      .order('sku');
    
    const skuMap = new Map();
    variants.forEach(v => {
      if (!skuMap.has(v.sku)) {
        skuMap.set(v.sku, []);
      }
      skuMap.get(v.sku).push(v);
    });
    
    console.log('\n📋 Duplicate SKUs found:');
    let duplicateCount = 0;
    skuMap.forEach((variants, sku) => {
      if (variants.length > 1) {
        duplicateCount++;
        console.log(`\n❌ SKU: ${sku} (${variants.length} variants)`);
        variants.forEach(v => {
          console.log(`   - ID ${v.id}: ${v.name}`);
        });
      }
    });
    
    console.log(`\n✅ Total duplicate SKUs: ${duplicateCount}`);
    
  } else {
    console.log('📋 Duplicate SKUs:', data);
  }
}

checkDuplicates();
