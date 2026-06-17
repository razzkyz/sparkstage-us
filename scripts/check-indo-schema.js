#!/usr/bin/env node

/**
 * Check Indonesia Database Schema
 * Query the actual column names in product_variants table
 */

import { createClient } from '@supabase/supabase-js';

// Indonesia Database
const INDO_SUPABASE_URL = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const INDO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI3OTI1NiwiZXhwIjoyMDgzODU1MjU2fQ.vvgQz9vOECs75P5ZY2wPHWW08DYXxviyaHLU9oxQyh4';

const indoSupabase = createClient(INDO_SUPABASE_URL, INDO_SUPABASE_KEY);

async function checkSchema() {
  console.log('🔍 Checking Indonesia Database Schema...\n');

  try {
    // Get first row to see actual columns
    console.log('📊 Product Variants Table:');
    const { data: variants, error: varError } = await indoSupabase
      .from('product_variants')
      .select('*')
      .limit(1);

    if (varError) {
      console.error('❌ Error:', varError);
    } else if (variants && variants.length > 0) {
      console.log('\n✅ Columns found:');
      Object.keys(variants[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log('\n📝 Sample row:');
      console.log(JSON.stringify(variants[0], null, 2));
    } else {
      console.log('⚠️  No data found');
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 Products Table:');
    const { data: products, error: prodError } = await indoSupabase
      .from('products')
      .select('*')
      .limit(1);

    if (prodError) {
      console.error('❌ Error:', prodError);
    } else if (products && products.length > 0) {
      console.log('\n✅ Columns found:');
      Object.keys(products[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 Product Images Table:');
    const { data: images, error: imgError } = await indoSupabase
      .from('product_images')
      .select('*')
      .limit(1);

    if (imgError) {
      console.error('❌ Error:', imgError);
    } else if (images && images.length > 0) {
      console.log('\n✅ Columns found:');
      Object.keys(images[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema();
