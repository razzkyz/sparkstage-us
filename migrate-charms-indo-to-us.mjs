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

async function migrateCharms() {
  // Step 1: Get Lucky Charm category ID in US
  const { data: usCat } = await supabaseUS.from('categories').select('id').eq('slug', 'lucky-charm').single();
  const luckyCharmCatId = usCat?.id;
  console.log(`US Lucky Charm category ID: ${luckyCharmCatId}`);

  // Step 2: Get ALL Indo products that have images AND have "Charm" in name
  // Pull in batches
  let allIndoCharms = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data } = await supabaseIndo
      .from('products')
      .select('id, name, sku, description, product_images(image_url, is_primary, display_order), product_variants(name, price, stock, sku, is_active)')
      .ilike('name', '%Charm%')
      .is('deleted_at', null)
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    allIndoCharms.push(...data);
    from += batchSize;
    if (data.length < batchSize) break;
  }

  // Also get non-charm named products from Indo that have images and look like jewelry/charm items
  // Filter: must have at least 1 image AND at least 1 variant with price > 0
  const charmsWithImages = allIndoCharms.filter(p => 
    p.product_images?.length > 0 && 
    p.product_variants?.some(v => v.price > 0)
  );

  console.log(`\nTotal Indo products with "Charm" in name: ${allIndoCharms.length}`);
  console.log(`Of those, with images AND price: ${charmsWithImages.length}`);

  // Step 3: Get existing product names in US DB to avoid duplicates
  let usProductNames = new Set();
  let usFrom = 0;
  while (true) {
    const { data } = await supabaseUS.from('products').select('name').is('deleted_at', null).range(usFrom, usFrom + 999);
    if (!data || data.length === 0) break;
    data.forEach(p => usProductNames.add(p.name.toLowerCase().trim()));
    usFrom += 1000;
    if (data.length < 1000) break;
  }
  console.log(`\nExisting products in US: ${usProductNames.size}`);

  // Step 4: Filter out products already in US
  const toMigrate = charmsWithImages.filter(p => !usProductNames.has(p.name.toLowerCase().trim()));
  console.log(`Products to migrate (not yet in US): ${toMigrate.length}`);

  if (toMigrate.length === 0) {
    console.log("Nothing to migrate!");
    return;
  }

  // Step 5: Insert into US
  let success = 0;
  let failed = 0;

  for (const indoProd of toMigrate) {
    try {
      // Insert product
      const slug = indoProd.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      const { data: newProd, error: prodErr } = await supabaseUS.from('products').insert({
        name: indoProd.name,
        slug: `${slug}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sku: indoProd.sku || `CHARM-MIG-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        description: indoProd.description || '',
        category_id: luckyCharmCatId,
        is_active: true,
      }).select('id').single();

      if (prodErr || !newProd) {
        console.error(`  ✗ Failed to insert "${indoProd.name}":`, prodErr?.message);
        failed++;
        continue;
      }

      const newProductId = newProd.id;

      // Insert variants
      for (const v of (indoProd.product_variants || [])) {
        await supabaseUS.from('product_variants').insert({
          product_id: newProductId,
          name: v.name || 'Default',
          sku: v.sku ? `${v.sku}-US` : `CHARM-V-${newProductId}-${Date.now()}`,
          price: v.price || 0,
          stock: v.stock || 10,
          is_active: v.is_active !== false,
        });
      }

      // Insert images (using Indo URLs - they still work from cdn.sparkstage55.com)
      for (let i = 0; i < (indoProd.product_images || []).length; i++) {
        const img = indoProd.product_images[i];
        await supabaseUS.from('product_images').insert({
          product_id: newProductId,
          image_url: img.image_url, // Use Indo CDN URL directly
          is_primary: img.is_primary ?? (i === 0),
          display_order: img.display_order ?? i,
        });
      }

      success++;
      if (success % 20 === 0) console.log(`  Migrated ${success}/${toMigrate.length}...`);

    } catch (err) {
      console.error(`  ✗ Error for "${indoProd.name}":`, err.message);
      failed++;
    }
  }

  console.log(`\n✅ Migration done!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`\nAll migrated products are now under "Lucky Charm" category in US DB.`);
}

migrateCharms().catch(console.error);
