#!/usr/bin/env node
/* eslint-disable */

/**
 * Check if ImageKit /public/ folder has any product images
 * 
 * Usage:
 *   node scripts/check-public-folder.mjs --env-file .env.r2-migration
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function getProjectRefFromSupabaseConfig() {
  const configPath = path.join(cwd, 'supabase', 'config.toml');
  if (!fs.existsSync(configPath)) {
    throw new Error('supabase/config.toml was not found');
  }
  const configText = fs.readFileSync(configPath, 'utf8');
  const match = configText.match(/project_id\s*=\s*"([^"]+)"/);
  if (!match?.[1]) {
    throw new Error('Could not read project_id from supabase/config.toml');
  }
  return match[1].trim();
}

function getServiceRoleKeyFromCli(projectRef) {
  try {
    const result = execFileSync(
      'supabase',
      ['secrets', 'list', '--project-ref', projectRef],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    for (const line of result.split(/\r?\n/)) {
      if (line.includes('SERVICE_ROLE_KEY')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts[2] && !parts[2].includes('····')) {
          return parts[2];
        }
      }
    }
  } catch (error) {
    // CLI command failed, will try next method
  }
  return null;
}

async function main() {
  console.log('🔍 Checking ImageKit /public/ folder\n');
  
  // Load environment
  loadEnvFile(DEFAULT_ENV_FILE);
  
  let supabaseUrl = process.env.SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Auto-detect if not provided
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('⚙️  Auto-detecting Supabase credentials...');
    const projectRef = getProjectRefFromSupabaseConfig();
    console.log(`   Project ref: ${projectRef}`);
    
    if (!supabaseUrl) {
      supabaseUrl = `https://${projectRef}.supabase.co`;
      console.log(`   Supabase URL: ${supabaseUrl}`);
    }
    
    if (!serviceRoleKey) {
      serviceRoleKey = getServiceRoleKeyFromCli(projectRef);
      if (!serviceRoleKey) {
        console.error('\n❌ Could not get service role key from Supabase CLI');
        console.error('   Run: supabase login');
        process.exit(1);
      }
      console.log('   ✓ Service role key obtained from CLI');
    }
    console.log();
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // Query 1: Count by folder
  console.log('📊 Query 1: Count images by folder path\n');
  
  const { data: folderCounts, error: error1 } = await supabase.rpc('count_images_by_folder');
  
  if (error1) {
    // Fallback to direct query if RPC doesn't exist
    const { data: allImages, error: error1b } = await supabase
      .from('product_images')
      .select('provider_file_path')
      .eq('provider', 'imagekit');
    
    if (error1b) {
      console.error('❌ Error querying database:', error1b.message);
      process.exit(1);
    }
    
    const counts = {
      public: 0,
      products: 0,
      other: 0,
    };
    
    allImages.forEach((img) => {
      if (img.provider_file_path?.startsWith('/public/')) {
        counts.public++;
      } else if (img.provider_file_path?.startsWith('/products/')) {
        counts.products++;
      } else {
        counts.other++;
      }
    });
    
    console.log(`   /public/   folder: ${counts.public} images`);
    console.log(`   /products/ folder: ${counts.products} images`);
    console.log(`   Other folders:     ${counts.other} images`);
    console.log(`   ─────────────────────────────────`);
    console.log(`   Total:             ${counts.public + counts.products + counts.other} images`);
    console.log();
    
    if (counts.public > 0) {
      console.log('⚠️  FOUND /public/ folder images!\n');
      
      // Query 2: Sample /public/ images
      console.log('📋 Sample /public/ folder images:\n');
      
      const { data: publicImages, error: error2 } = await supabase
        .from('product_images')
        .select('id, product_id, image_url, provider_file_path, is_primary, display_order')
        .eq('provider', 'imagekit')
        .like('provider_file_path', '/public/%')
        .order('product_id')
        .order('display_order')
        .limit(10);
      
      if (error2) {
        console.error('❌ Error:', error2.message);
      } else {
        publicImages.forEach((img) => {
          const marker = img.is_primary ? '🌟 PRIMARY' : '   ';
          console.log(`   ${marker} [ID: ${img.id}] Product ${img.product_id}`);
          console.log(`         Path: ${img.provider_file_path}`);
          console.log(`         URL:  ${img.image_url}`);
          console.log();
        });
        
        if (publicImages.length < counts.public) {
          console.log(`   ... and ${counts.public - publicImages.length} more\n`);
        }
      }
      
      // Query 3: Check primary images
      const { data: primaryCount, error: error3 } = await supabase
        .from('product_images')
        .select('id', { count: 'exact', head: true })
        .eq('provider', 'imagekit')
        .like('provider_file_path', '/public/%')
        .eq('is_primary', true);
      
      if (!error3) {
        console.log('📌 Primary images in /public/ folder:\n');
        console.log(`   Total /public/ images: ${counts.public}`);
        console.log(`   Primary images:        ${primaryCount.count || 0}`);
        console.log(`   Secondary images:      ${counts.public - (primaryCount.count || 0)}`);
        console.log();
      }
      
      console.log('⚠️  ACTION REQUIRED:');
      console.log('   /public/ folder contains product images!');
      console.log('   You need to migrate these too before cutover.\n');
      console.log('💡 Options:');
      console.log('   1. Update migration script to include /public/ folder');
      console.log('   2. Manually migrate /public/ folder images');
      console.log('   3. Investigate if these are legacy/unused images\n');
      
    } else {
      console.log('✅ Good news! No images in /public/ folder.');
      console.log('   All images are in /products/ folder.');
      console.log('   Safe to proceed with retry.\n');
    }
    
  } else {
    console.log(folderCounts);
  }
  
  console.log('🎯 Next step: Retry failed uploads');
  console.log('   node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration --dry-run\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
