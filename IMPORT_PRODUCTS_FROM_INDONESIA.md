#!/usr/bin/env node

/**
 * Copy Products from Indonesia DB to US DB
 * 
 * This script:
 * 1. Connects to Indonesia database
 * 2. Exports all products, variants, images
 * 3. Updates image URLs (cdn.sparkstage55.com → cdn-us.sparkstage55.com)
 * 4. Imports to US database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });

// Indonesia Database (source)
const indoSupabase = createClient(
  'https://hogzjapnkvsihvvbgcdb.supabase.co',
  process.env.INDO_SUPABASE_SERVICE_ROLE_KEY || 'YOUR_INDO_SERVICE_ROLE_KEY'
);

// US Database (target)
const usSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.US_SUPABASE_SERVICE_ROLE_KEY || 'YOUR_US_SERVICE_ROLE_KEY'
);

async function copyProducts() {
  console.log('🚀 Starting product migration...\n');

  try {
    // 1. Copy Categories
    console.log('📂 Copying categories...');
    const { data: categories, error: catError } = await indoSupabase
      .from('categories')
      .select('*')
      .is('deleted_at', null);

    if (catError) throw catError;
    
    const { error: catInsertError } = await usSupabase
      .from('categories')
      .upsert(categories, { onConflict: 'id' });

    if (catInsertError) throw catInsertError;
    console.log(`✅ Copied ${categories.length} categories\n`);

    // 2. Copy Products
    console.log('🛍️  Copying products...');
    const { data: products, error: prodError } = await indoSupabase
      .from('products')
      .select('*')
      .is('deleted_at', null);

    if (prodError) throw prodError;

    const { error: prodInsertError } = await usSupabase
      .from('products')
      .upsert(products, { onConflict: 'id' });

    if (prodInsertError) throw prodInsertError;
    console.log(`✅ Copied ${products.length} products\n`);

    // 3. Copy Product Variants
    console.log('📊 Copying product variants...');
    const { data: variants, error: varError } = await indoSupabase
      .from('product_variants')
      .select('*')
      .is('deleted_at', null);

    if (varError) throw varError;

    const { error: varInsertError } = await usSupabase
      .from('product_variants')
      .upsert(variants, { onConflict: 'id' });

    if (varInsertError) throw varInsertError;
    console.log(`✅ Copied ${variants.length} variants\n`);

    // 4. Copy Product Images (with URL update)
    console.log('🖼️  Copying product images...');
    const { data: images, error: imgError } = await indoSupabase
      .from('product_images')
      .select('*');

    if (imgError) throw imgError;

    // Update image URLs
    const updatedImages = images.map(img => ({
      ...img,
      image_url: img.image_url.replace('cdn.sparkstage55.com', 'cdn-us.sparkstage55.com')
    }));

    const { error: imgInsertError } = await usSupabase
      .from('product_images')
      .insert(updatedImages);

    if (imgInsertError) throw imgInsertError;
    console.log(`✅ Copied ${updatedImages.length} images\n`);

    console.log('━'.repeat(60));
    console.log('🎉 Migration Complete!');
    console.log('━'.repeat(60));
    console.log(`✅ Categories: ${categories.length}`);
    console.log(`✅ Products: ${products.length}`);
    console.log(`✅ Variants: ${variants.length}`);
    console.log(`✅ Images: ${updatedImages.length}`);
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run migration
copyProducts();
