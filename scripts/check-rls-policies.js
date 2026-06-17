#!/usr/bin/env node

/**
 * Check RLS Policies - See if public can access products
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// US Database with ANON key (public access)
const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const usSupabase = createClient(US_SUPABASE_URL, US_ANON_KEY);

async function checkPublicAccess() {
  console.log('🔍 Testing PUBLIC Access to US Database...\n');
  console.log('📍 Database URL:', US_SUPABASE_URL);
  console.log('🔑 Using ANON KEY (public access)');
  console.log('');

  try {
    // Try to access products as anonymous user
    console.log('━'.repeat(60));
    console.log('🛍️  PRODUCTS (Public Access):');
    const { data: products, error: prodError, count: prodCount } = await usSupabase
      .from('products')
      .select('*', { count: 'exact' })
      .limit(5);

    if (prodError) {
      console.error('❌ PUBLIC ACCESS BLOCKED!');
      console.error('Error:', prodError);
      console.log('');
      console.log('⚠️  RLS Policy kemungkinan memblokir akses public!');
      console.log('');
      console.log('Solusi:');
      console.log('1. Perlu tambahkan RLS policy untuk public SELECT');
      console.log('2. Atau disable RLS sementara untuk testing');
    } else {
      console.log(`✅ PUBLIC ACCESS WORKS! Found ${prodCount} products`);
      if (products && products.length > 0) {
        console.log('\n📝 Sample data:');
        products.forEach(prod => {
          console.log(`   - [${prod.id}] ${prod.name}`);
        });
      }
    }

    // Try to access product_variants
    console.log('\n' + '━'.repeat(60));
    console.log('📊 PRODUCT VARIANTS (Public Access):');
    const { data: variants, error: varError, count: varCount } = await usSupabase
      .from('product_variants')
      .select('*', { count: 'exact' })
      .limit(5);

    if (varError) {
      console.error('❌ PUBLIC ACCESS BLOCKED!');
      console.error('Error:', varError);
    } else {
      console.log(`✅ PUBLIC ACCESS WORKS! Found ${varCount} variants`);
      if (variants && variants.length > 0) {
        console.log('\n📝 Sample data:');
        variants.forEach(v => {
          console.log(`   - [${v.id}] ${v.variant_name} - SKU: ${v.sku}`);
        });
      }
    }

    // Try to access product_images
    console.log('\n' + '━'.repeat(60));
    console.log('🖼️  PRODUCT IMAGES (Public Access):');
    const { data: images, error: imgError, count: imgCount } = await usSupabase
      .from('product_images')
      .select('*', { count: 'exact' })
      .limit(5);

    if (imgError) {
      console.error('❌ PUBLIC ACCESS BLOCKED!');
      console.error('Error:', imgError);
    } else {
      console.log(`✅ PUBLIC ACCESS WORKS! Found ${imgCount} images`);
      if (images && images.length > 0) {
        console.log('\n📝 Sample data:');
        images.forEach(img => {
          console.log(`   - [${img.id}] Product ${img.product_id}: ${img.image_url.substring(0, 50)}...`);
        });
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPublicAccess();
