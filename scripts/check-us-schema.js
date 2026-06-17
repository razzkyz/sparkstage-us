#!/usr/bin/env node

/**
 * Check US Database Schema
 * Query the actual column names in product_variants table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// US Database
const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnpraHV1bGJhenRvbG50dGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NTY0MywiZXhwIjoyMDk2ODcxNjQzfQ.p0cZ9p6zzjnOksb7Zvp-jJ5u0DoNXWZPIgDnVIX5apI';

const usSupabase = createClient(US_SUPABASE_URL, US_SUPABASE_KEY);

async function checkSchema() {
  console.log('🔍 Checking US Database Schema...\n');

  try {
    // Get first row to see actual columns (may be empty)
    console.log('📊 Product Variants Table:');
    const { data: variants, error: varError } = await usSupabase
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
    } else {
      console.log('⚠️  Table is empty (expected). Checking schema via info_schema...');
      
      // Try to get column info via RPC
      const { data: cols, error: colError } = await usSupabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'product_variants'
          ORDER BY ordinal_position
        `
      });
      
      if (!colError && cols) {
        console.log('\n✅ Columns from schema:');
        cols.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema();
