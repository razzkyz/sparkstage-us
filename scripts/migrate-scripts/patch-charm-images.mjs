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

async function patchMissingImages() {
  // Step 1: Get all Indo products with "Charm" in name that have images
  console.log("Fetching Indo charm products with images...");
  let allIndoCharms = [];
  let from = 0;
  while (true) {
    const { data } = await supabaseIndo
      .from('products')
      .select('id, name, product_images(image_url, is_primary, display_order), product_variants(name, price, stock)')
      .ilike('name', '%Charm%')
      .is('deleted_at', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allIndoCharms.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }

  const withImgs = allIndoCharms.filter(p => p.product_images?.length > 0);
  console.log(`Indo products with "Charm" and images: ${withImgs.length}`);

  // Step 2: Build a name→images map from Indo
  const indoImageMap = {};
  for (const p of withImgs) {
    indoImageMap[p.name.toLowerCase().trim()] = p.product_images;
  }

  // Step 3: Get US Lucky Charm products that still have the dummy/placeholder image
  const DUMMY = '/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.webp';
  const { data: usCat } = await supabaseUS.from('categories').select('id').eq('slug', 'lucky-charm').single();
  
  // Fetch all US lucky charm products in batches
  let usCharmProds = [];
  let usFrom = 0;
  while (true) {
    const { data } = await supabaseUS
      .from('products')
      .select('id, name, product_images(id, image_url)')
      .eq('category_id', usCat.id)
      .is('deleted_at', null)
      .range(usFrom, usFrom + 999);
    if (!data || data.length === 0) break;
    usCharmProds.push(...data);
    usFrom += 1000;
    if (data.length < 1000) break;
  }
  console.log(`US Lucky Charm products total: ${usCharmProds.length}`);

  // Filter: only those with dummy placeholder image
  const withDummy = usCharmProds.filter(p => p.product_images?.some(img => img.image_url === DUMMY));
  console.log(`US products still with dummy image: ${withDummy.length}`);

  // Step 4: For each US product with dummy, check if Indo has matching name
  let patched = 0;
  let noMatch = 0;

  for (const usProd of withDummy) {
    const key = usProd.name.toLowerCase().trim();
    const indoImgs = indoImageMap[key];

    if (!indoImgs || indoImgs.length === 0) {
      noMatch++;
      continue;
    }

    // Delete the dummy image
    const dummyImgIds = usProd.product_images.filter(img => img.image_url === DUMMY).map(img => img.id);
    if (dummyImgIds.length > 0) {
      await supabaseUS.from('product_images').delete().in('id', dummyImgIds);
    }

    // Insert the real images from Indo
    for (let i = 0; i < indoImgs.length; i++) {
      const img = indoImgs[i];
      await supabaseUS.from('product_images').insert({
        product_id: usProd.id,
        image_url: img.image_url,
        is_primary: img.is_primary ?? (i === 0),
        display_order: img.display_order ?? i,
      });
    }

    patched++;
    if (patched % 20 === 0) console.log(`  Patched ${patched} products...`);
  }

  console.log(`\n✅ Done!`);
  console.log(`  Patched with real images: ${patched}`);
  console.log(`  No Indo match found:      ${noMatch}`);
}

patchMissingImages().catch(console.error);
