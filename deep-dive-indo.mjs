import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const envLocal = fs.existsSync('./.env.local') ? dotenv.parse(fs.readFileSync('./.env.local')) : {};
Object.assign(process.env, envLocal);

const indoEnv = dotenv.parse(fs.readFileSync('C:/SparkDoku/sparkstage/.env.local'));
const supabaseIndo = createClient(
  indoEnv.VITE_SUPABASE_URL,
  indoEnv.SUPABASE_SERVICE_ROLE_KEY || indoEnv.VITE_SUPABASE_ANON_KEY
);

async function deepDiveIndo() {
  const { count: total } = await supabaseIndo.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  const { count: noCat } = await supabaseIndo.from('products').select('*', { count: 'exact', head: true }).is('category_id', null).is('deleted_at', null);
  
  console.log(`Total Indo products: ${total}`);
  console.log(`With no category: ${noCat}`);
  console.log(`With category: ${total - noCat}`);

  // Images
  const { data: imgData } = await supabaseIndo.from('product_images').select('product_id');
  const imgProductIds = [...new Set((imgData || []).map(r => r.product_id))];
  console.log(`\nProducts with at least 1 image: ${imgProductIds.length}`);

  // Check a charm
  const { data: charms } = await supabaseIndo.from('products')
    .select('id, name, category_id, product_images(image_url), product_variants(name, price, stock)')
    .ilike('name', '%Charm%')
    .is('deleted_at', null)
    .limit(5);
  
  console.log(`\n=== Sample Charm Products in Indo ===`);
  for (const p of charms || []) {
    const imgs = p.product_images?.length || 0;
    const price = p.product_variants?.[0]?.price || 'N/A';
    console.log(`  [${p.id}] "${p.name}" cat:${p.category_id} → ${imgs} imgs, price: ${price}`);
    if (imgs > 0) console.log(`    URL: ${p.product_images[0].image_url}`);
  }

  // How many of the 901 US Lucky Charms can be matched by name to Indo products?
  console.log(`\n=== Testing name-based match ===`);
  const { data: sampleIndoCharm } = await supabaseIndo.from('products')
    .select('id, name')
    .ilike('name', '%Pendants Charm%')
    .limit(5);
  console.log('Indo products matching "Pendants Charm":');
  for (const p of sampleIndoCharm || []) {
    console.log(`  [${p.id}] ${p.name}`);
  }
}

deepDiveIndo().catch(console.error);
