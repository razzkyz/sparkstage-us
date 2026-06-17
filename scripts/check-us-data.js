#!/usr/bin/env node

/**
 * Check US Database - Verify data was actually inserted
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// US Database
const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnpraHV1bGJhenRvbG50dGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NTY0MywiZXhwIjoyMDk2ODcxNjQzfQ.p0cZ9p6zzjnOksb7Zvp-jJ5u0DoNXWZPIgDnVIX5apI';

const usSupabase = createClient(US_SUPABASE_URL, US_SUPABASE_KEY);

async function checkData() {
  console.log('🔍 Checking US Database Data...\n');
  console.log('📍 Database URL:', US_SUPABASE_URL);
  console.log('');

  try {
    // Check categories
    console.log('━'.repeat(60));
    console.log('📂 CATEGORIES:');
    const { data: categories, error: catError, count: catCount } = await usSupabase
      .from('categories')
      .select('*', { count: 'exact' })
      .limit(5);

    if (catError) {
      console.error('❌ Error:', catError);
    } else {
      console.log(`✅ Total: ${catCount} categories`);
      if (categories && categories.length > 0) {
        console.log('\n📝 Sample data (first 5):');
        categories.forEach(cat => {
          console.log(`   - [${cat.id}] ${cat.name} (${cat.slug})`);
        });
      } else {
        console.log('⚠️  No categories found!');
      }
    }

    // Check products
    console.log('\n' + '━'.repeat(60));
    console.log('🛍️  PRODUCTS:');
    const { data: products, error: prodError, count: prodCount } = await usSupabase
      .from('products')
      .select('*', { count: 'exact' })
      .limit(5);

    if (prodError) {
      console.error('❌ Error:', prodError);
    } else {
      console.log(`✅ Total: ${prodCount} products`);
      if (products && products.length > 0) {
        console.log('\n📝 Sample data (first 5):');
        products.forEach(prod => {
          console.log(`   - [${prod.id}] ${prod.name}`);
          if (prod.slug) console.log(`     Slug: ${prod.slug}`);
        });
      } else {
        console.log('⚠️  No products found!');
      }
    }

    // Check product_variants
    console.log('\n' + '━'.repeat(60));
    console.log('📊 PRODUCT VARIANTS:');
    const { data: variants, error: varError, count: varCount } = await usSupabase
      .from('product_variants')
      .select('*', { count: 'exact' })
      .limit(5);

    if (varError) {
      console.error('❌ Error:', varError);
    } else {
      console.log(`✅ Total: ${varCount} variants`);
      if (variants && variants.length > 0) {
        console.log('\n📝 Sample data (first 5):');
        variants.forEach(v => {
          console.log(`   - [${v.id}] ${v.variant_name} - SKU: ${v.sku} - Price: ${v.price} - Stock: ${v.stock}`);
        });
      } else {
        console.log('⚠️  No variants found!');
      }
    }

    // Check product_images
    console.log('\n' + '━'.repeat(60));
    console.log('🖼️  PRODUCT IMAGES:');
    const { data: images, error: imgError, count: imgCount } = await usSupabase
      .from('product_images')
      .select('*', { count: 'exact' })
      .limit(5);

    if (imgError) {
      console.error('❌ Error:', imgError);
    } else {
      console.log(`✅ Total: ${imgCount} images`);
      if (images && images.length > 0) {
        console.log('\n📝 Sample data (first 5):');
        images.forEach(img => {
          console.log(`   - [${img.id}] Product ${img.product_id}`);
          console.log(`     URL: ${img.image_url}`);
        });
      } else {
        console.log('⚠️  No images found!');
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('');

    // Summary
    if (catCount === 0 && prodCount === 0 && varCount === 0 && imgCount === 0) {
      console.log('❌ DATABASE KOSONG!');
      console.log('');
      console.log('Kemungkinan masalah:');
      console.log('1. Script tersambung ke database yang salah');
      console.log('2. Data gagal di-insert');
      console.log('3. RLS policy memblokir akses');
      console.log('');
      console.log('Solusi: Coba run ulang migration script');
    } else {
      console.log('✅ DATA DITEMUKAN!');
      console.log('');
      console.log('Summary:');
      console.log(`   Categories: ${catCount}`);
      console.log(`   Products: ${prodCount}`);
      console.log(`   Variants: ${varCount}`);
      console.log(`   Images: ${imgCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkData();
