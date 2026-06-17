#!/usr/bin/env node

/**
 * Debug Frontend Query - Simulate exact frontend query
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const usSupabase = createClient(US_SUPABASE_URL, US_ANON_KEY);

async function debugFrontendQuery() {
  console.log('🔍 Simulating Frontend Query...\n');

  try {
    // Exact query from useProducts.ts
    const { data, error } = await usSupabase
      .from('products')
      .select(`
        id,
        name,
        description,
        categories(slug, is_active),
        product_images(image_url, display_order),
        product_variants(id, variant_name, price, is_active, stock, reserved_stock)
      `)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(0, 4); // Just first 5

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Found ${data.length} products\n`);

    data.forEach((product, idx) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Product #${idx + 1}: ${product.name}`);
      console.log(`${'='.repeat(60)}`);
      
      console.log('\n📊 Variants:');
      if (product.product_variants && product.product_variants.length > 0) {
        product.product_variants.forEach(v => {
          console.log(`  - ${v.variant_name}: ${v.price} (stock: ${v.stock}, reserved: ${v.reserved_stock})`);
        });
      } else {
        console.log('  ⚠️  No variants!');
      }

      console.log('\n🖼️  Images:');
      if (product.product_images && product.product_images.length > 0) {
        product.product_images.forEach(img => {
          const url = img.image_url.substring(0, 60);
          console.log(`  - ${url}... (order: ${img.display_order})`);
        });
      } else {
        console.log('  ⚠️  No images!');
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFrontendQuery();
