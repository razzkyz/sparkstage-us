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

async function checkIndoAllCategories() {
  // Get ALL categories in Indo
  console.log("=== ALL Indo DB Categories ===");
  const { data: cats } = await supabaseIndo.from('categories').select('id, name, slug, parent_id').order('name');
  for (const cat of cats || []) {
    const { count } = await supabaseIndo
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', cat.id)
      .is('deleted_at', null);
    if (count > 0) {
      console.log(`  [${cat.id}] ${cat.name} (slug: ${cat.slug}, parent: ${cat.parent_id}) → ${count} products`);
    }
  }
  
  // Also check products that have images - what categories are they?
  console.log("\n=== Sample of Indo products WITH images (first 10) ===");
  const { data: prodsWithImg } = await supabaseIndo
    .from('product_images')
    .select('product_id')
    .limit(10);
  
  const ids = [...new Set((prodsWithImg || []).map(p => p.product_id))];
  const { data: prods } = await supabaseIndo
    .from('products')
    .select('id, name, category_id, categories(name, slug)')
    .in('id', ids);
  
  for (const p of prods || []) {
    console.log(`  [${p.id}] "${p.name}" → Category: ${p.categories?.name} (${p.categories?.slug})`);
  }
}

checkIndoAllCategories().catch(console.error);
