import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Load .env.local for service role key
const envLocalPath = './.env.local';
if (fs.existsSync(envLocalPath)) {
  const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
  Object.assign(process.env, envLocal);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCharms() {
  console.log("Fetching charm categories...");
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, slug');
    
  if (catError) throw catError;
  
  const charmBarSlugs = [
    "charm", "holiday", "hobby", "italian-bracket", "pendant-charm", 
    "welded-charm", "edgy-soul", "foodie", "island-vibes", "love", "pets", 
    "pop-icon", "sky-dream", "soft-muse", "the-icon", "zodiac", "lucky", 
    "lucky-charm", "golden-charm-pendant", "golden-charm-welded", 
    "silver-charm-pendant", "silver-charm-welded"
  ];
  
  const charmCategoryIds = categories.filter(c => charmBarSlugs.includes(c.slug)).map(c => c.id);
  
  if (charmCategoryIds.length === 0) {
    console.log("No charm categories found.");
    return;
  }

  console.log("Fetching products to fix...");
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select(`
      id, 
      name,
      product_variants (id, is_active),
      product_images (id)
    `)
    .in('category_id', charmCategoryIds)
    .is('deleted_at', null);

  if (prodError) throw prodError;
  
  console.log("Fetching max IDs to avoid sequence conflicts...");
  const { data: maxVar } = await supabase.from('product_variants').select('id').order('id', { ascending: false }).limit(1);
  const { data: maxImg } = await supabase.from('product_images').select('id').order('id', { ascending: false }).limit(1);
  
  let nextVariantId = (maxVar?.[0]?.id || 0) + 1;
  let nextImageId = (maxImg?.[0]?.id || 0) + 1;

  const variantsToInsert = [];
  const imagesToInsert = [];

  for (const product of products) {
    const activeVariants = (product.product_variants || []).filter(v => v.is_active !== false);
    const hasImages = (product.product_images || []).length > 0;
    
    // If no active variants, add a default one with IDR 30,000
    if (activeVariants.length === 0) {
      variantsToInsert.push({
        id: nextVariantId++,
        product_id: product.id,
        name: 'Default',
        sku: `CHARM-${product.id}`,
        price: 30000,
        stock: 100,
        is_active: true
      });
    }
    
    // If no image, add a placeholder image
    if (!hasImages) {
      imagesToInsert.push({
        id: nextImageId++,
        product_id: product.id,
        image_url: '/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png',
        display_order: 1
      });
    }
  }

  console.log(`Need to insert ${variantsToInsert.length} variants and ${imagesToInsert.length} images.`);
  
  // Insert variants in chunks of 500
  for (let i = 0; i < variantsToInsert.length; i += 500) {
    const chunk = variantsToInsert.slice(i, i + 500);
    const { error } = await supabase.from('product_variants').insert(chunk);
    if (error) {
      console.error("Error inserting variants:", error);
    } else {
      console.log(`Inserted variants chunk ${i} to ${i + chunk.length}`);
    }
  }

  // Insert images in chunks of 500
  for (let i = 0; i < imagesToInsert.length; i += 500) {
    const chunk = imagesToInsert.slice(i, i + 500);
    const { error } = await supabase.from('product_images').insert(chunk);
    if (error) {
      console.error("Error inserting images:", error);
    } else {
      console.log(`Inserted images chunk ${i} to ${i + chunk.length}`);
    }
  }

  console.log("✅ Done! Products should now have prices and placeholder images.");
}

fixCharms();
