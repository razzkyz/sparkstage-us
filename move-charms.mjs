import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const envLocalPath = './.env.local';
if (fs.existsSync(envLocalPath)) {
  const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
  Object.assign(process.env, envLocal);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function moveCharms() {
  console.log("Fetching 'lucky-charm' category...");
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', 'lucky-charm')
    .single();
    
  if (catError || !catData) {
    console.error("Could not find lucky-charm category:", catError);
    return;
  }
  
  const luckyCharmId = catData.id;
  console.log(`Found category: ${catData.name} (ID: ${luckyCharmId})`);

  console.log("Finding the products that we just fixed (with default sku CHARM-)...");
  
  // We can identify the products we fixed by checking the variants table for SKU starting with 'CHARM-'
  const { data: variants, error: varError } = await supabase
    .from('product_variants')
    .select('product_id')
    .like('sku', 'CHARM-%');
    
  if (varError) {
    console.error("Error fetching variants:", varError);
    return;
  }
  
  // Deduplicate product ids
  const productIds = [...new Set(variants.map(v => v.product_id))];
  console.log(`Found ${productIds.length} products to move.`);
  
  if (productIds.length === 0) {
    console.log("No products to move.");
    return;
  }

  // Update in chunks
  console.log("Updating category_id for these products...");
  
  let successCount = 0;
  for (let i = 0; i < productIds.length; i += 500) {
    const chunk = productIds.slice(i, i + 500);
    const { data: updated, error: updError } = await supabase
      .from('products')
      .update({ category_id: luckyCharmId })
      .in('id', chunk)
      .select('id');
      
    if (updError) {
      console.error("Error updating chunk:", updError);
    } else {
      successCount += updated?.length || 0;
      console.log(`Updated ${successCount} products...`);
    }
  }

  console.log("✅ Done! Products moved to Lucky Charm category.");
}

moveCharms();
