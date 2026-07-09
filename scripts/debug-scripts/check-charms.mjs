import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCharms() {
  console.log("Fetching categories...");
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, slug, name');
    
  if (catError) {
    console.error("Error fetching categories:", catError);
    return;
  }
  
  const charmBarSlugs = [
    "charm", "holiday", "hobby", "italian-bracket", "pendant-charm", 
    "welded-charm", "edgy-soul", "foodie", "island-vibes", "love", "pets", 
    "pop-icon", "sky-dream", "soft-muse", "the-icon", "zodiac", "lucky", 
    "lucky-charm", "golden-charm-pendant", "golden-charm-welded", 
    "silver-charm-pendant", "silver-charm-welded"
  ];
  
  const charmCategories = categories.filter(c => charmBarSlugs.includes(c.slug));
  const charmCategoryIds = charmCategories.map(c => c.id);
  
  console.log(`Found ${charmCategoryIds.length} Charm Bar categories.`);
  
  if (charmCategoryIds.length === 0) {
    console.log("No charm categories found.");
    return;
  }

  console.log("Fetching products...");
  // Using paginated fetch to get all products if there are many
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select(`
      id, 
      name, 
      category_id,
      product_variants (id, price, is_active),
      product_images (id, image_url)
    `)
    .in('category_id', charmCategoryIds)
    .is('deleted_at', null);

  if (prodError) {
    console.error("Error fetching products:", prodError);
    return;
  }
  
  let noPriceCount = 0;
  let noImageCount = 0;
  let noBothCount = 0;
  
  const badProducts = [];

  for (const product of products) {
    const activeVariants = (product.product_variants || []).filter(v => v.is_active !== false);
    const hasImages = (product.product_images || []).length > 0;
    
    const noPrice = activeVariants.length === 0;
    const noImage = !hasImages;
    
    if (noPrice) noPriceCount++;
    if (noImage) noImageCount++;
    if (noPrice && noImage) noBothCount++;
    
    if (noPrice || noImage) {
      badProducts.push({
        id: product.id,
        name: product.name,
        missing: []
      });
      if (noPrice) badProducts[badProducts.length - 1].missing.push("PRICE (0 variants)");
      if (noImage) badProducts[badProducts.length - 1].missing.push("IMAGE");
    }
  }

  console.log("=========================================");
  console.log(`Total Charm Bar Products: ${products.length}`);
  console.log(`Products without Price/Variants: ${noPriceCount}`);
  console.log(`Products without Images: ${noImageCount}`);
  console.log(`Products without Both: ${noBothCount}`);
  console.log("=========================================");
  
  if (badProducts.length > 0) {
    console.log("Sample of products with issues (showing up to 15):");
    badProducts.slice(0, 15).forEach(p => {
      console.log(`- [${p.id}] ${p.name} -> Missing: ${p.missing.join(', ')}`);
    });
  }
}

checkCharms();
