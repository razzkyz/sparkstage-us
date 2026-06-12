#!/usr/bin/env node
/**
 * Migrate ImageKit /public/ folder to Cloudflare R2
 * 
 * This script queries the database for all ImageKit /public/ URLs,
 * downloads them, and uploads to R2 maintaining folder structure.
 * 
 * Strategy: Query database tables that use ImageKit /public/ URLs instead of
 * using ImageKit SDK (which requires authentication we don't have working)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.r2-migration' });

// Configuration
const CONFIG = {
  imagekit: {
    urlEndpoint: 'https://ik.imagekit.io/hjnuyz1t3',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://hogzjapnkvsihvvbgcdb.supabase.co',
    // We'll use anon key since we don't have service role key in env
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1NDcwODEsImV4cCI6MjA0NDEyMzA4MX0.JV6xdS_ot8tRuQYfCeTPM5HJYFj9bT7GvPcz1hfA8lI',
  },
};

// Validate configuration
function validateConfig() {
  const required = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_BASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('   Check .env.r2-migration file');
    process.exit(1);
  }

  console.log('✅ Configuration validated');
}

// Initialize clients
const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
const s3Client = new S3Client({
  region: 'auto',
  endpoint: CONFIG.r2.endpoint,
  credentials: {
    accessKeyId: CONFIG.r2.accessKeyId,
    secretAccessKey: CONFIG.r2.secretAccessKey,
  },
});

// Manifest file
const MANIFEST_FILE = path.join(__dirname, '..', 'backups', 'r2-public-migration-manifest.jsonl');

// Track progress
let stats = {
  total: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Query database for all ImageKit /public/ URLs
 */
async function getAllPublicImageKitUrls() {
  console.log('📂 Querying database for ImageKit /public/ URLs...\n');

  const allUrls = [];

  // 1. Banners table
  console.log('   Checking: banners table');
  const { data: banners } = await supabase
    .from('banners')
    .select('id, image_url, title_image_url');
  
  if (banners) {
    banners.forEach(b => {
      if (b.image_url?.includes('imagekit.io') && b.image_url.includes('/public/')) {
        allUrls.push({
          table: 'banners',
          column: 'image_url',
          record_id: b.id,
          imagekit_url: b.image_url,
        });
      }
      if (b.title_image_url?.includes('imagekit.io') && b.title_image_url.includes('/public/')) {
        allUrls.push({
          table: 'banners',
          column: 'title_image_url',
          record_id: b.id,
          imagekit_url: b.title_image_url,
        });
      }
    });
    console.log(`     Found: ${banners.filter(b => 
      (b.image_url?.includes('imagekit.io') && b.image_url.includes('/public/')) ||
      (b.title_image_url?.includes('imagekit.io') && b.title_image_url.includes('/public/'))
    ).length} records`);
  }

  // 2. Beauty posters
  console.log('   Checking: beauty_posters table');
  const { data: beautyPosters } = await supabase
    .from('beauty_posters')
    .select('id, image_url');
  
  if (beautyPosters) {
    beautyPosters.forEach(p => {
      if (p.image_url?.includes('imagekit.io') && p.image_url.includes('/public/')) {
        allUrls.push({
          table: 'beauty_posters',
          column: 'image_url',
          record_id: p.id,
          imagekit_url: p.image_url,
        });
      }
    });
    console.log(`     Found: ${beautyPosters.filter(p => 
      p.image_url?.includes('imagekit.io') && p.image_url.includes('/public/')
    ).length} records`);
  }

  // 3. Glam page settings
  console.log('   Checking: glam_page_settings table');
  const { data: glamPages } = await supabase
    .from('glam_page_settings')
    .select('id, hero_image_url, look_model_image_url, look_star_links');
  
  if (glamPages) {
    glamPages.forEach(g => {
      if (g.hero_image_url?.includes('imagekit.io') && g.hero_image_url.includes('/public/')) {
        allUrls.push({
          table: 'glam_page_settings',
          column: 'hero_image_url',
          record_id: g.id,
          imagekit_url: g.hero_image_url,
        });
      }
      if (g.look_model_image_url?.includes('imagekit.io') && g.look_model_image_url.includes('/public/')) {
        allUrls.push({
          table: 'glam_page_settings',
          column: 'look_model_image_url',
          record_id: g.id,
          imagekit_url: g.look_model_image_url,
        });
      }
      // Check JSONB array for image URLs
      if (g.look_star_links && Array.isArray(g.look_star_links)) {
        g.look_star_links.forEach((link, idx) => {
          if (link.image_url?.includes('imagekit.io') && link.image_url.includes('/public/')) {
            allUrls.push({
              table: 'glam_page_settings',
              column: `look_star_links[${idx}].image_url`,
              record_id: g.id,
              imagekit_url: link.image_url,
            });
          }
        });
      }
    });
    console.log(`     Found: ${glamPages.filter(g => 
      (g.hero_image_url?.includes('imagekit.io') && g.hero_image_url.includes('/public/')) ||
      (g.look_model_image_url?.includes('imagekit.io') && g.look_model_image_url.includes('/public/')) ||
      (g.look_star_links && JSON.stringify(g.look_star_links).includes('imagekit.io'))
    ).length} records`);
  }

  // 4. Dressing room photos
  console.log('   Checking: dressing_room_look_photos table');
  const { data: dressingRoom } = await supabase
    .from('dressing_room_look_photos')
    .select('id, image_url');
  
  if (dressingRoom) {
    dressingRoom.forEach(d => {
      if (d.image_url?.includes('imagekit.io') && d.image_url.includes('/public/')) {
        allUrls.push({
          table: 'dressing_room_look_photos',
          column: 'image_url',
          record_id: d.id,
          imagekit_url: d.image_url,
        });
      }
    });
    console.log(`     Found: ${dressingRoom.filter(d => 
      d.image_url?.includes('imagekit.io') && d.image_url.includes('/public/')
    ).length} records`);
  }

  // Deduplicate URLs (same file might be referenced multiple times)
  const uniqueUrls = Array.from(new Map(allUrls.map(item => [item.imagekit_url, item])).values());
  
  console.log(`\n✅ Total unique URLs found: ${uniqueUrls.length}\n`);
  return uniqueUrls;
}

/**
 * Download file from ImageKit
 */
async function downloadFromImageKit(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Upload file to R2
 */
async function uploadToR2(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: CONFIG.r2.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });

  await s3Client.send(command);
}

/**
 * Get content type from file path
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Log migration result to manifest
 */
function logToManifest(record) {
  const line = JSON.stringify(record) + '\n';
  appendFileSync(MANIFEST_FILE, line);
}

/**
 * Migrate a single file
 */
async function migrateFile(urlRecord) {
  const imagekitUrl = urlRecord.imagekit_url;
  
  // Extract path from URL
  // e.g., "https://ik.imagekit.io/hjnuyz1t3/public/banners/banner-1.jpg" → "/public/banners/banner-1.jpg"
  const urlPath = imagekitUrl.replace(CONFIG.imagekit.urlEndpoint, '');
  
  // Remove leading "/public/" to get relative path for R2
  // e.g., "/public/banners/banner-1.jpg" → "banners/banner-1.jpg"
  const relativePath = urlPath.replace(/^\/public\//, '');
  
  // R2 key: "public/banners/banner-1.jpg" (keep "public/" prefix in R2)
  const r2Key = `public/${relativePath}`;
  
  const r2Url = `${CONFIG.r2.publicBaseUrl}/${r2Key}`;
  const filename = path.basename(urlPath);
  const contentType = getContentType(filename);

  try {
    // Download from ImageKit
    const buffer = await downloadFromImageKit(imagekitUrl);
    
    // Upload to R2
    await uploadToR2(r2Key, buffer, contentType);
    
    stats.succeeded++;
    console.log(`   ✓ ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    
    logToManifest({
      status: 'success',
      table: urlRecord.table,
      column: urlRecord.column,
      record_id: urlRecord.record_id,
      imagekit_url: imagekitUrl,
      imagekit_path: urlPath,
      r2_key: r2Key,
      r2_url: r2Url,
      size_bytes: buffer.length,
      content_type: contentType,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    stats.failed++;
    console.error(`   ✗ ${filename}: ${error.message}`);
    
    logToManifest({
      status: 'failed',
      table: urlRecord.table,
      column: urlRecord.column,
      record_id: urlRecord.record_id,
      imagekit_url: imagekitUrl,
      imagekit_path: urlPath,
      r2_key: r2Key,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 ImageKit /public/ to R2 Migration\n');
  console.log('='.repeat(80));
  
  // Validate config
  validateConfig();
  
  // Ensure backups directory exists
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!existsSync(backupsDir)) {
    await mkdir(backupsDir, { recursive: true });
  }

  // Initialize manifest file
  if (!existsSync(MANIFEST_FILE)) {
    writeFileSync(MANIFEST_FILE, '');
    console.log(`📄 Created manifest file: ${MANIFEST_FILE}\n`);
  } else {
    console.log(`📄 Appending to existing manifest: ${MANIFEST_FILE}\n`);
  }

  // List all files in /public/
  const urlRecords = await getAllPublicImageKitUrls();
  stats.total = urlRecords.length;

  if (urlRecords.length === 0) {
    console.log('⚠️  No ImageKit /public/ URLs found in database');
    return;
  }

  // Migrate each file
  console.log('📤 Starting migration...\n');
  const startTime = Date.now();

  for (let i = 0; i < urlRecords.length; i++) {
    const urlRecord = urlRecords[i];
    const progress = `[${i + 1}/${urlRecords.length}]`;
    
    const urlPath = urlRecord.imagekit_url.replace(CONFIG.imagekit.urlEndpoint, '');
    console.log(`${progress} ${urlRecord.table}.${urlRecord.column} → ${urlPath}`);
    await migrateFile(urlRecord);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files:     ${stats.total}`);
  console.log(`✓ Succeeded:     ${stats.succeeded} (${((stats.succeeded / stats.total) * 100).toFixed(1)}%)`);
  console.log(`✗ Failed:        ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`⏱ Duration:      ${duration}s`);
  console.log(`📄 Manifest:     ${MANIFEST_FILE}`);
  console.log('='.repeat(80));

  if (stats.failed > 0) {
    console.log('\n⚠️  Some files failed to migrate. Check manifest file for details.');
    console.log('   You can retry failed files with: node scripts/retry-failed-public-migrations.mjs');
  } else {
    console.log('\n✅ All files migrated successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify URLs work: node scripts/verify-r2-public-urls.mjs');
    console.log('   2. Update database: node scripts/cutover-public-to-r2.mjs');
  }
}

// Run migration
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
