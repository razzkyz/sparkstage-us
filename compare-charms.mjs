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

async function compareCharms() {
  // --- Indo: find charm-related categories ---
  console.log("=== Indo DB: Charm Categories ===");
  const { data: indoCats } = await supabaseIndo.from('categories').select('id, name, slug, parent_id').ilike('name', '%charm%');
  for (const cat of indoCats || []) {
    const { count } = await supabaseIndo.from('products').select('*', { count: 'exact', head: true }).eq('category_id', cat.id).is('deleted_at', null);
    console.log(`  [${cat.id}] ${cat.name} (slug: ${cat.slug}) → ${count} products`);
  }

  // --- US: find charm-related categories ---
  console.log("\n=== US DB: Charm Categories ===");
  const { data: usCats } = await supabaseUS.from('categories').select('id, name, slug, parent_id').ilike('name', '%charm%');
  for (const cat of usCats || []) {
    const { count } = await supabaseUS.from('products').select('*', { count: 'exact', head: true }).eq('category_id', cat.id).is('deleted_at', null);
    console.log(`  [${cat.id}] ${cat.name} (slug: ${cat.slug}) → ${count} products`);
  }

  // --- Check products in Indo that have images vs not ---
  console.log("\n=== Indo: Charm products WITH images ===");
  const indoCharmCatIds = (indoCats || []).map(c => c.id);
  if (indoCharmCatIds.length > 0) {
    const { data: indoCharmProducts } = await supabaseIndo
      .from('products')
      .select('id, name, category_id, product_images(image_url), product_variants(price, stock)')
      .in('category_id', indoCharmCatIds)
      .is('deleted_at', null)
      .limit(5);
    
    for (const p of indoCharmProducts || []) {
      const imgs = p.product_images?.length || 0;
      const variants = p.product_variants?.length || 0;
      const price = p.product_variants?.[0]?.price || 0;
      console.log(`  "${p.name}" → ${imgs} images, ${variants} variants, price: ${price}`);
    }
    
    const { count: withImg } = await supabaseIndo.from('product_images').select('*', { count: 'exact', head: true });
    console.log(`\n  Total Indo products checked. Images in db: ${withImg}`);
  }
}

compareCharms().catch(console.error);
