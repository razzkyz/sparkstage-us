#!/usr/bin/env node

/**
 * Debug Product Data - Check why price & stock are 0
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const usSupabase = createClient(US_SUPABASE_URL, US_ANON_KEY);

async function debugProductData() {
  console.log('🔍 Debugging Product Data...\n');

  try {
    // Get one product with all its data
    const { data: product, error } = await usSupabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        product_variants(id, variant_name, sku, price, stock, reserved_stock, is_active),
        product_images(image_url, display_order)
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('📦 Product:', product.name);
    console.log('   ID:', product.id);
    console.log('   Slug:', product.slug);
    console.log('');

    console.log('📊 Variants:');
    if (product.product_variants && product.product_variants.length > 0) {
      product.product_variants.forEach(v => {
        console.log(`   - [${v.id}] ${v.variant_name}`);
        console.log(`     SKU: ${v.sku}`);
        console.log(`     Price: ${v.price}`);
        console.log(`     Stock: ${v.stock}`);
        console.log(`     Reserved: ${v.reserved_stock}`);
        console.log(`     Available: ${v.stock - v.reserved_stock}`);
        console.log(`     Active: ${v.is_active}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No variants found!');
    }

    console.log('🖼️  Images:');
    if (product.product_images && product.product_images.length > 0) {
      product.product_images.forEach(img => {
        console.log(`   - ${img.image_url}`);
        console.log(`     Order: ${img.display_order}`);
      });
    } else {
      console.log('   ⚠️  No images found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugProductData();
