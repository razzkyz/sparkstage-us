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
const INDO_SUPABASE_URL = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const INDO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3OTI1NiwiZXhwIjoyMDgzODU1MjU2fQ.vvgQz9vOECs75P5ZY2wPHWW08DYXxviyaHLU9oxQyh4';

const indoSupabase = createClient(INDO_SUPABASE_URL, INDO_SUPABASE_KEY);

// US Database (target)
const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnpraHV1bGJhenRvbG50dGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NTY0MywiZXhwIjoyMDk2ODcxNjQzfQ.p0cZ9p6zzjnOksb7Zvp-jJ5u0DoNXWZPIgDnVIX5apI';

const usSupabase = createClient(US_SUPABASE_URL, US_SUPABASE_KEY);

async function copyProducts() {
  console.log('🚀 Starting product migration: Indonesia → US');
  console.log('━'.repeat(60));
  console.log('');

  try {
    // 1. Copy Categories
    console.log('📂 Step 1: Copying categories...');
    const { data: categories, error: catError } = await indoSupabase
      .from('categories')
      .select('id, name, slug, description, color, is_active, parent_id, created_at, updated_at')
      .order('id');

    if (catError) {
      console.error('❌ Error fetching categories:', catError);
      throw catError;
    }
    
    if (categories && categories.length > 0) {
      const { error: catInsertError } = await usSupabase
        .from('categories')
        .upsert(categories, { onConflict: 'id' });

      if (catInsertError) {
        console.error('❌ Error inserting categories:', catInsertError);
        throw catInsertError;
      }
      console.log(`✅ Copied ${categories.length} categories`);
    } else {
      console.log('⚠️  No categories found');
    }
    console.log('');

    // 2. Copy Products
    console.log('🛍️  Step 2: Copying products...');
    const { data: products, error: prodError } = await indoSupabase
      .from('products')
      .select('id, name, slug, description, category_id, is_active, created_at, updated_at')
      .is('deleted_at', null)  // Only active products
      .order('id');

    if (prodError) {
      console.error('❌ Error fetching products:', prodError);
      throw prodError;
    }

    if (products && products.length > 0) {
      // Include slug in mapping
      const mappedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,  // Now US table has slug column
        description: p.description,
        category_id: p.category_id,
        is_active: p.is_active,
        created_at: p.created_at,
        updated_at: p.updated_at
      }));

      const { error: prodInsertError } = await usSupabase
        .from('products')
        .upsert(mappedProducts, { onConflict: 'id' });

      if (prodInsertError) {
        console.error('❌ Error inserting products:', prodInsertError);
        throw prodInsertError;
      }
      console.log(`✅ Copied ${products.length} products`);
    } else {
      console.log('⚠️  No products found');
    }
    console.log('');

    // 3. Copy Product Variants (with pagination for >1000 rows)
    console.log('📊 Step 3: Copying product variants...');
    
    // Delete existing variants first
    console.log('   Deleting existing variants...');
    await usSupabase.from('product_variants').delete().neq('id', 0);
    
    let allVariants = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: variants, error: varError } = await indoSupabase
        .from('product_variants')
        .select('id, product_id, name, sku, price, stock, is_active, attributes, created_at, updated_at')
        .order('id')
        .range(from, to);

      if (varError) {
        console.error('❌ Error fetching variants:', varError);
        throw varError;
      }

      if (!variants || variants.length === 0) break;
      
      allVariants = allVariants.concat(variants);
      console.log(`   Fetched ${variants.length} variants (total: ${allVariants.length})`);
      
      if (variants.length < pageSize) break; // Last page
      page++;
    }

    if (allVariants.length > 0) {
      // Map Indonesia columns to US columns
      const mappedVariants = allVariants.map(v => ({
        id: v.id,
        product_id: v.product_id,
        variant_name: v.name,  // Indo uses 'name', US uses 'variant_name'
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        is_active: v.is_active,
        attributes: v.attributes,
        created_at: v.created_at,
        updated_at: v.updated_at
      }));

      // Remove duplicates by SKU (keep first occurrence)
      // Also remove variants whose products don't exist in US DB
      const seenSkus = new Set();
      const uniqueVariants = [];
      let skippedCount = 0;
      let orphanedCount = 0;
      
      // Get list of valid product IDs from what we just copied
      const validProductIds = new Set(products.map(p => p.id));
      
      for (const variant of mappedVariants) {
        // Skip if product doesn't exist in US
        if (!validProductIds.has(variant.product_id)) {
          orphanedCount++;
          continue;
        }
        
        // Skip duplicates by SKU
        if (!variant.sku || !seenSkus.has(variant.sku)) {
          uniqueVariants.push(variant);
          if (variant.sku) seenSkus.add(variant.sku);
        } else {
          skippedCount++;
        }
      }
      
      if (skippedCount > 0) {
        console.log(`   ⚠️  Skipped ${skippedCount} duplicate SKUs`);
      }
      if (orphanedCount > 0) {
        console.log(`   ⚠️  Skipped ${orphanedCount} variants with missing products`);
      }

      const { error: varInsertError } = await usSupabase
        .from('product_variants')
        .insert(uniqueVariants);

      if (varInsertError) {
        console.error('❌ Error inserting variants:', varInsertError);
        throw varInsertError;
      }
      console.log(`✅ Copied ${allVariants.length} variants`);
    } else {
      console.log('⚠️  No variants found');
    }
    console.log('');

    // 4. Copy Product Images (with pagination for >1000 rows)
    console.log('🖼️  Step 4: Copying product images...');
    
    // Delete existing images first
    console.log('   Deleting existing images...');
    await usSupabase.from('product_images').delete().neq('id', 0);
    
    let allImages = [];
    page = 0;
    
    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: images, error: imgError } = await indoSupabase
        .from('product_images')
        .select('id, product_id, image_url, display_order, created_at')
        .order('product_id, display_order')
        .range(from, to);

      if (imgError) {
        console.error('❌ Error fetching images:', imgError);
        throw imgError;
      }

      if (!images || images.length === 0) break;
      
      allImages = allImages.concat(images);
      console.log(`   Fetched ${images.length} images (total: ${allImages.length})`);
      
      if (images.length < pageSize) break; // Last page
      page++;
    }

    if (allImages.length > 0) {
      // Update image URLs: cdn.sparkstage55.com → cdn-us.sparkstage55.com
      // Also filter out images for products that don't exist in US
      const validProductIds = new Set(products.map(p => p.id));
      let orphanedCount = 0;
      
      const updatedImages = allImages
        .filter(img => {
          if (validProductIds.has(img.product_id)) {
            return true;
          } else {
            orphanedCount++;
            return false;
          }
        })
        .map(img => ({
          id: img.id,
          product_id: img.product_id,
          image_url: img.image_url.replace('cdn.sparkstage55.com', 'cdn-us.sparkstage55.com'),
          display_order: img.display_order,
          created_at: img.created_at
        }));
      
      if (orphanedCount > 0) {
        console.log(`   ⚠️  Skipped ${orphanedCount} images with missing products`);
      }

      // Delete existing images first
      await usSupabase.from('product_images').delete().neq('id', 0);

      const { error: imgInsertError } = await usSupabase
        .from('product_images')
        .insert(updatedImages);

      if (imgInsertError) {
        console.error('❌ Error inserting images:', imgInsertError);
        throw imgInsertError;
      }
      console.log(`✅ Copied ${allImages.length} images`);
      console.log(`📝 URLs updated: cdn.sparkstage55.com → cdn-us.sparkstage55.com`);
    } else {
      console.log('⚠️  No images found');
    }
    console.log('');

    // 5. Reset Sequences
    console.log('🔧 Step 5: Resetting sequences...');
    const { error: seqError } = await usSupabase.rpc('exec_sql', {
      sql: `
        SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
        SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
        SELECT setval('product_variants_id_seq', (SELECT MAX(id) FROM product_variants));
        SELECT setval('product_images_id_seq', (SELECT MAX(id) FROM product_images));
      `
    });

    if (seqError) {
      console.log('⚠️  Could not reset sequences (non-critical)');
    } else {
      console.log('✅ Sequences reset');
    }
    console.log('');

    console.log('━'.repeat(60));
    console.log('🎉 Migration Complete!');
    console.log('━'.repeat(60));
    console.log(`✅ Categories:       ${categories?.length || 0}`);
    console.log(`✅ Products:         ${products?.length || 0}`);
    console.log(`✅ Variants:         ${allVariants?.length || 0}`);
    console.log(`✅ Images:           ${allImages?.length || 0}`);
    console.log(`📝 CDN URL Updated:  cdn-us.sparkstage55.com`);
    console.log('━'.repeat(60));
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Refresh your browser (F5)');
    console.log('2. Check shop page - products should appear');
    console.log('3. Images should load from cdn-us.sparkstage55.com');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('━'.repeat(60));
    console.error('❌ Migration Failed!');
    console.error('━'.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// Run migration
copyProducts();
