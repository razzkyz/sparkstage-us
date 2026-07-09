import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const DUMMY_IMAGE = '/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.webp';
const R2_PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL || 'https://cdn-us.sparkstage55.com';
const BUCKET_NAME = 'sparkstage-public-assets'; // Products from Indo are usually here

async function getAllR2Keys(bucket) {
  let keys = [];
  let isTruncated = true;
  let continuationToken = undefined;

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'products/',
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(command);
    if (response.Contents) {
      keys.push(...response.Contents.map(c => c.Key));
    }
    isTruncated = response.IsTruncated;
    continuationToken = response.NextContinuationToken;
  }
  return keys;
}

async function recoverImages() {
  console.log("Fetching all image keys from R2 bucket...");
  const keys = await getAllR2Keys(BUCKET_NAME);
  console.log(`Found ${keys.length} image files in R2.`);

  // Group images by productId
  const imageMap = {};
  for (const key of keys) {
    // key format: products/1234/uuid.jpg
    const parts = key.split('/');
    if (parts.length === 3 && parts[0] === 'products') {
      const productId = parseInt(parts[1], 10);
      if (!isNaN(productId)) {
        if (!imageMap[productId]) imageMap[productId] = [];
        // Make sure we only add standard images
        if (key.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          imageMap[productId].push(key);
        }
      }
    }
  }

  // Fetch lucky charm category
  const { data: catData } = await supabase.from('categories').select('id').eq('slug', 'lucky-charm').single();
  if (!catData) {
    console.log("Lucky charm category not found");
    return;
  }
  const luckyCharmId = catData.id;

  // Fetch all lucky charm products
  console.log("Fetching lucky charm products from DB...");
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .eq('category_id', luckyCharmId)
    .is('deleted_at', null);
    
  console.log(`Found ${products.length} lucky charm products.`);

  let recoveredCount = 0;

  for (const product of products) {
    const imagesForProduct = imageMap[product.id] || [];
    
    if (imagesForProduct.length > 0) {
      // Sort to make the first one primary, or just use the array order
      
      // Delete the dummy image for this product
      await supabase.from('product_images').delete().eq('product_id', product.id).eq('image_url', DUMMY_IMAGE);
      
      // Insert the original images
      for (let i = 0; i < imagesForProduct.length; i++) {
        const key = imagesForProduct[i];
        const imageUrl = `${R2_PUBLIC_URL}/${key}`;
        
        // Check if it already exists
        const { data: existing } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', product.id)
          .eq('image_url', imageUrl)
          .single();
          
        if (!existing) {
          await supabase.from('product_images').insert({
            product_id: product.id,
            image_url: imageUrl,
            is_primary: i === 0,
            display_order: i
          });
        }
      }
      recoveredCount++;
      if (recoveredCount % 50 === 0) console.log(`Recovered images for ${recoveredCount} products...`);
    }
  }

  console.log(`✅ Success! Recovered original images for ${recoveredCount} products.`);
}

recoverImages().catch(console.error);
