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

async function updateCharms() {
  console.log("Updating stock to 10 for newly inserted variants...");
  
  // Update stock to 10 for variants named 'Default' that have sku starting with 'CHARM-'
  const { data: updatedVariants, error: varError } = await supabase
    .from('product_variants')
    .update({ stock: 10 })
    .eq('name', 'Default')
    .like('sku', 'CHARM-%')
    .select('id');
    
  if (varError) {
    console.error("Error updating variants:", varError);
  } else {
    console.log(`Successfully updated stock to 10 for ${updatedVariants.length} variants.`);
  }

  console.log("Updating placeholder image URLs from .png to .webp...");
  
  // Fix the image URL from .png to .webp
  const { data: updatedImages, error: imgError } = await supabase
    .from('product_images')
    .update({ image_url: '/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.webp' })
    .eq('image_url', '/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png')
    .select('id');
    
  if (imgError) {
    console.error("Error updating images:", imgError);
  } else {
    console.log(`Successfully updated ${updatedImages.length} images to .webp format.`);
  }
}

updateCharms();
