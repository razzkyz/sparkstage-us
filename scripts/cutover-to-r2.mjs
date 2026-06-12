#!/usr/bin/env node
/* eslint-disable */

/**
 * Database Cutover - Update product_images URLs from ImageKit to R2
 * 
 * Usage:
 *   node scripts/cutover-to-r2.mjs --env-file .env.r2-migration --dry-run
 *   node scripts/cutover-to-r2.mjs --env-file .env.r2-migration
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { exec FileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    envFile: DEFAULT_ENV_FILE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--env-file') {
      args.envFile = path.resolve(cwd, argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

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
    // CLI command failed
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  console.log('🔄 Database Cutover - ImageKit → R2\n');
  console.log('================================\n');
  
  if (args.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  LIVE MODE - Database will be updated!\n');
  }
  
  // Load environment
  loadEnvFile(args.envFile);
  
  const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  
  if (!r2PublicBaseUrl) {
    console.error('❌ R2_PUBLIC_BASE_URL not found in .env.r2-migration');
    process.exit(1);
  }
  
  console.log(`✓ R2 Public URL: ${r2PublicBaseUrl}\n`);
  
  // Get Supabase credentials
  let supabaseUrl = process.env.SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('⚙️  Auto-detecting Supabase credentials...');
    const projectRef = getProjectRefFromSupabaseConfig();
    
    if (!supabaseUrl) {
      supabaseUrl = `https://${projectRef}.supabase.co`;
    }
    
    if (!serviceRoleKey) {
      serviceRoleKey = getServiceRoleKeyFromCli(projectRef);
      if (!serviceRoleKey) {
        console.error('\n❌ Could not get service role key');
        console.error('   Add to .env.r2-migration: SUPABASE_SERVICE_ROLE_KEY=your_key');
        process.exit(1);
      }
    }
    console.log('   ✓ Credentials obtained\n');
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // Get ImageKit images count
  console.log('📊 Checking current database status...\n');
  
  const { count: imagekitCount, error: countError } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('provider', 'imagekit');
  
  if (countError) {
    console.error('❌ Error querying database:', countError.message);
    process.exit(1);
  }
  
  console.log(`   ImageKit images: ${imagekitCount}`);
  
  if (imagekitCount === 0) {
    console.log('\n✅ No ImageKit images found. Cutover already done or no images to migrate.\n');
    process.exit(0);
  }
  
  // Sample records
  const { data: sampleRecords, error: sampleError } = await supabase
    .from('product_images')
    .select('id, product_id, image_url, provider_file_path')
    .eq('provider', 'imagekit')
    .limit(5);
  
  if (sampleError) {
    console.error('❌ Error:', sampleError.message);
    process.exit(1);
  }
  
  console.log('\n📋 Sample ImageKit images (first 5):\n');
  sampleRecords.forEach((img) => {
    console.log(`   [ID: ${img.id}] Product ${img.product_id}`);
    console.log(`   Old: ${img.image_url}`);
    const newUrl = `${r2PublicBaseUrl}${img.provider_file_path}`;
    console.log(`   New: ${newUrl}`);
    console.log();
  });
  
  if (args.dryRun) {
    console.log('🔍 DRY RUN Complete - No changes made\n');
    console.log('📊 Summary:');
    console.log(`   Would update: ${imagekitCount} images`);
    console.log(`   New provider: r2`);
    console.log(`   New base URL: ${r2PublicBaseUrl}\n`);
    console.log('💡 Run without --dry-run to execute cutover.\n');
    process.exit(0);
  }
  
  // Confirm
  console.log('⚠️  WARNING: This will update the database!\n');
  console.log(`📊 Summary:`);
  console.log(`   Images to update: ${imagekitCount}`);
  console.log(`   From: ImageKit (https://ik.imagekit.io/...)`);
  console.log(`   To:   R2 (${r2PublicBaseUrl})`);
  console.log();
  console.log('💡 Make sure:');
  console.log('   ✓ R2 custom domain is working');
  console.log('   ✓ Test URLs are accessible');
  console.log('   ✓ Database backup exists (optional but recommended)\n');
  
  // Execute cutover
  console.log('🚀 Executing database cutover...\n');
  
  const { data, error } = await supabase.rpc('migrate_imagekit_to_r2', {
    r2_base_url: r2PublicBaseUrl
  });
  
  if (error) {
    // RPC might not exist, fallback to direct update
    console.log('   RPC function not found, using direct SQL update...\n');
    
    // Update via SQL
    const { data: updateData, error: updateError } = await supabase
      .from('product_images')
      .update({
        image_url: supabase.raw(`'${r2PublicBaseUrl}' || provider_file_path`),
        provider: 'r2',
        updated_at: new Date().toISOString()
      })
      .eq('provider', 'imagekit')
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      process.exit(1);
    }
    
    console.log(`✅ Updated ${updateData?.length || imagekitCount} images!\n`);
  } else {
    console.log(`✅ Cutover complete via RPC!\n`);
  }
  
  // Verify
  console.log('🔍 Verifying cutover...\n');
  
  const { count: r2Count } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('provider', 'r2');
  
  const { count: remainingImagekit } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true })
    .eq('provider', 'imagekit');
  
  console.log('📊 Final Status:');
  console.log(`   R2 images:       ${r2Count}`);
  console.log(`   ImageKit images: ${remainingImagekit}`);
  console.log();
  
  if (remainingImagekit === 0) {
    console.log('🎉 SUCCESS! All images migrated to R2!\n');
    console.log('🎯 Next steps:');
    console.log('   1. Test website: https://www.sparkstage55.com');
    console.log('   2. Check product pages load images correctly');
    console.log('   3. Monitor for broken images');
    console.log('   4. Keep ImageKit active for 7 days as backup');
    console.log('   5. Delete ImageKit images after verification\n');
  } else {
    console.log('⚠️  Some ImageKit images remain. Check for errors.\n');
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
