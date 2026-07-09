import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const envLocal = fs.existsSync('./.env.local') ? dotenv.parse(fs.readFileSync('./.env.local')) : {};
Object.assign(process.env, envLocal);

const supabaseUS = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const indoEnv = dotenv.parse(fs.readFileSync('C:/SparkDoku/sparkstage/.env.local'));
const supabaseIndo = createClient(
  indoEnv.VITE_SUPABASE_URL,
  indoEnv.SUPABASE_SERVICE_ROLE_KEY || indoEnv.VITE_SUPABASE_ANON_KEY
);

const DUMMY_IMAGE = '/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.webp';

// Indo retail_category_id for LUCKY-CHARM = 21
const INDO_RETAIL_CATEGORY_ID = 21;
// retail_subcategory_id = 33 (Pendants based on sample data)
const INDO_RETAIL_SUBCATEGORY_ID = 33;

async function migrateUSCharmsToIndo() {
  // Step 1: Get all US Lucky Charm products (category_id = 105)
  console.log("Fetching US Lucky Charm products...");
  let usCharms = [];
  let from = 0;
  while (true) {
    const { data } = await supabaseUS
      .from('products')
      .select('id, name, sku, description, product_images(image_url, is_primary, display_order), product_variants(name, price, stock, sku, is_active)')
      .eq('category_id', 105)
      .is('deleted_at', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    usCharms.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`US Lucky Charm products: ${usCharms.length}`);

  // Filter: only those with non-dummy images (real products)
  // Also include those with dummy - user wants all visible
  const withRealImages = usCharms.filter(p => 
    p.product_images?.some(img => img.image_url !== DUMMY_IMAGE)
  );
  const withDummy = usCharms.filter(p => 
    !p.product_images?.some(img => img.image_url !== DUMMY_IMAGE)
  );
  console.log(`  With real images: ${withRealImages.length}`);
  console.log(`  With dummy only:  ${withDummy.length}`);

  // Step 2: Get existing Indo product names to avoid duplicates
  console.log("\nFetching existing Indo product names...");
  let indoNames = new Set();
  let indoFrom = 0;
  while (true) {
    const { data } = await supabaseIndo.from('products').select('name').is('deleted_at', null).range(indoFrom, indoFrom + 999);
    if (!data || data.length === 0) break;
    data.forEach(p => indoNames.add(p.name.toLowerCase().trim()));
    indoFrom += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Existing Indo products: ${indoNames.size}`);

  // Step 3: Filter out duplicates - only migrate those not yet in Indo
  // Migrate ONLY those with real images first (priority)
  const toMigrate = withRealImages.filter(p => !indoNames.has(p.name.toLowerCase().trim()));
  // Also add those with dummy but not yet in Indo (they'll show with placeholder)
  const dummyToMigrate = withDummy.filter(p => !indoNames.has(p.name.toLowerCase().trim()));
  
  const allToMigrate = [...toMigrate, ...dummyToMigrate];
  console.log(`\nTo migrate (real images, new): ${toMigrate.length}`);
  console.log(`To migrate (dummy, new):       ${dummyToMigrate.length}`);
  console.log(`Total new to migrate:          ${allToMigrate.length}`);

  if (allToMigrate.length === 0) {
    console.log("\nAll products already exist in Indo! Nothing to do.");
    return;
  }

  // Step 4: Migrate to Indo
  let success = 0;
  let failed = 0;

  for (const usProd of allToMigrate) {
    try {
      // Generate slug
      const slug = usProd.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

      // Insert product to Indo
      const { data: newProd, error: prodErr } = await supabaseIndo.from('products').insert({
        name: usProd.name,
        slug,
        sku: usProd.sku?.includes('CHARM-') 
          ? `IND-${usProd.sku}` 
          : (usProd.sku || `CHARM-IND-${Date.now()}-${Math.floor(Math.random() * 9999)}`),
        description: usProd.description || '',
        category_id: 105,           // LUCKY CHARM category in Indo (same ID!)
        retail_category_id: INDO_RETAIL_CATEGORY_ID,
        retail_subcategory_id: INDO_RETAIL_SUBCATEGORY_ID,
        is_active: true,
      }).select('id').single();

      if (prodErr || !newProd) {
        failed++;
        continue;
      }

      const newId = newProd.id;

      // Insert variants
      const variants = usProd.product_variants || [];
      for (const v of variants) {
        await supabaseIndo.from('product_variants').insert({
          product_id: newId,
          name: v.name || 'Default',
          sku: v.sku ? `IND-${v.sku}` : `CHARM-V-IND-${newId}`,
          price: v.price || 30000,
          stock: v.stock || 10,
          is_active: v.is_active !== false,
        });
      }

      // Insert images (skip dummy)
      const realImages = (usProd.product_images || []).filter(img => img.image_url !== DUMMY_IMAGE);
      for (let i = 0; i < realImages.length; i++) {
        const img = realImages[i];
        await supabaseIndo.from('product_images').insert({
          product_id: newId,
          image_url: img.image_url,
          is_primary: i === 0,
          display_order: i,
        });
      }

      success++;
      if (success % 50 === 0) process.stdout.write(`\r  Progress: ${success}/${allToMigrate.length}...`);

    } catch (err) {
      failed++;
    }
  }

  console.log(`\n\n✅ Migration complete!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`\nNow check the Indo Charm Bar page - Lucky Charm should show more products!`);
}

migrateUSCharmsToIndo().catch(console.error);
