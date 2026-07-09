import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const indoEnv = dotenv.parse(fs.readFileSync('C:/SparkDoku/sparkstage/.env.local'));
const supabaseIndo = createClient(
  indoEnv.VITE_SUPABASE_URL,
  indoEnv.SUPABASE_SERVICE_ROLE_KEY || indoEnv.VITE_SUPABASE_ANON_KEY
);

async function checkIndoCharmStructure() {
  // Check all categories in Indo
  const { data: cats } = await supabaseIndo.from('categories').select('id, name, slug').order('name');
  console.log("=== ALL Indo Categories ===");
  for (const c of cats || []) console.log(`  [${c.id}] ${c.name} (${c.slug})`);

  // Check retail_categories in Indo
  const { data: retailCats } = await supabaseIndo.from('retail_categories').select('id, name, slug, department').ilike('name', '%charm%').limit(20);
  console.log("\n=== Indo Retail Categories (charm-related) ===");
  for (const c of retailCats || []) console.log(`  [${c.id}] ${c.name} (${c.slug}) dept:${c.department}`);

  // Check a charm product's actual fields
  const { data: charm } = await supabaseIndo
    .from('products')
    .select('id, name, category_id, retail_category_id, retail_subcategory_id')
    .ilike('name', '%Pendants Charm%')
    .limit(5);
  console.log("\n=== Sample charm products in Indo ===");
  for (const p of charm || []) {
    console.log(`  [${p.id}] "${p.name}" cat:${p.category_id} retail_cat:${p.retail_category_id} retail_sub:${p.retail_subcategory_id}`);
  }

  // Count how many charm products have retail_category_id set
  const { data: charmsWithRetailCat } = await supabaseIndo
    .from('products')
    .select('id, name, retail_category_id')
    .ilike('name', '%Charm%')
    .not('retail_category_id', 'is', null)
    .is('deleted_at', null);
  console.log(`\nCharm products with retail_category_id set: ${charmsWithRetailCat?.length || 0}`);

  // Check specific retail_categories for charms
  const { data: allRetailCats } = await supabaseIndo
    .from('retail_categories')
    .select('id, name, slug, department, is_active')
    .order('name');
  console.log("\n=== ALL Indo Retail Categories ===");
  for (const c of allRetailCats || []) {
    const { count } = await supabaseIndo
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('retail_category_id', c.id)
      .is('deleted_at', null);
    if (count > 0) console.log(`  [${c.id}] ${c.name} (${c.slug}) dept:${c.department} → ${count} products`);
  }
}

checkIndoCharmStructure().catch(console.error);
