#!/usr/bin/env node
/* eslint-disable */

/**
 * Retry failed ImageKit to R2 migrations
 * 
 * Reads the migration manifest and retries all failed uploads
 * 
 * Usage:
 *   node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration
 *   node scripts/retry-failed-r2-migrations.mjs --env-file .env.r2-migration --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import https from 'node:https';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'r2-migration-manifest.jsonl');
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    envFile: DEFAULT_ENV_FILE,
    manifestPath: DEFAULT_MANIFEST_PATH,
    concurrency: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--env-file') {
      args.envFile = path.resolve(cwd, nextValue());
    } else if (arg.startsWith('--env-file=')) {
      args.envFile = path.resolve(cwd, arg.slice('--env-file='.length));
    } else if (arg === '--manifest') {
      args.manifestPath = path.resolve(cwd, nextValue());
    } else if (arg.startsWith('--manifest=')) {
      args.manifestPath = path.resolve(cwd, arg.slice('--manifest='.length));
    } else if (arg === '--concurrency') {
      args.concurrency = parseInt(nextValue(), 10);
    } else if (arg.startsWith('--concurrency=')) {
      args.concurrency = parseInt(arg.slice('--concurrency='.length), 10);
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

function downloadImageFromUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode} from ${imageUrl}`));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadToR2(s3Client, bucketName, key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'image/jpeg',
  });

  await s3Client.send(command);
}

function getContentTypeFromFilename(filename) {
  const extension = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

async function retryFailedMigration(s3Client, bucketName, publicBaseUrl, failedRecord) {
  const { product_image_id, old_image_url, r2_key } = failedRecord;
  
  try {
    // Download from ImageKit
    console.log(`  [${product_image_id}] Downloading from ImageKit...`);
    const imageBuffer = await downloadImageFromUrl(old_image_url);
    
    // Upload to R2
    console.log(`  [${product_image_id}] Uploading to R2 as ${r2_key}...`);
    const contentType = getContentTypeFromFilename(r2_key);
    await uploadToR2(s3Client, bucketName, r2_key, imageBuffer, contentType);
    
    // Build new URL
    const newImageUrl = `${publicBaseUrl}/${r2_key}`;
    
    console.log(`  [${product_image_id}] ✓ Success: ${newImageUrl}`);
    
    return {
      ...failedRecord,
      status: 'success',
      new_image_url: newImageUrl,
      retry_timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`  [${product_image_id}] ✗ Failed: ${error.message}`);
    return {
      ...failedRecord,
      status: 'failed',
      error: error.message,
      retry_timestamp: new Date().toISOString(),
    };
  }
}

async function processBatch(s3Client, bucketName, publicBaseUrl, batch) {
  return Promise.all(
    batch.map((record) => retryFailedMigration(s3Client, bucketName, publicBaseUrl, record))
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  console.log('🔄 Retry Failed R2 Migrations');
  console.log('================================\n');
  
  // Load environment
  loadEnvFile(args.envFile);
  
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    console.error('❌ Missing required environment variables in', args.envFile);
    console.error('   Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL');
    process.exit(1);
  }
  
  // Validate access key length
  if (accessKeyId.length !== 32) {
    console.error(`❌ Invalid R2_ACCESS_KEY_ID length: ${accessKeyId.length} (should be 32)`);
    console.error('   Make sure you are using R2 Access Keys, not Cloudflare API Token!');
    process.exit(1);
  }
  
  console.log('✓ Configuration loaded');
  console.log(`  Account ID: ${accountId}`);
  console.log(`  Access Key: ${accessKeyId.slice(0, 8)}...`);
  console.log(`  Bucket: ${bucketName}`);
  console.log(`  Public URL: ${publicBaseUrl}`);
  console.log();
  
  // Read manifest
  if (!fs.existsSync(args.manifestPath)) {
    console.error(`❌ Manifest file not found: ${args.manifestPath}`);
    process.exit(1);
  }
  
  console.log(`📄 Reading manifest from ${args.manifestPath}...`);
  const manifestContent = fs.readFileSync(args.manifestPath, 'utf8');
  const allRecords = manifestContent
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  
  const failedRecords = allRecords.filter((r) => r.status === 'failed');
  const successRecords = allRecords.filter((r) => r.status === 'success');
  
  console.log(`  Total records: ${allRecords.length}`);
  console.log(`  Previously succeeded: ${successRecords.length}`);
  console.log(`  Failed (to retry): ${failedRecords.length}`);
  console.log();
  
  if (failedRecords.length === 0) {
    console.log('✓ No failed migrations to retry!');
    return;
  }
  
  if (args.dryRun) {
    console.log('🔍 DRY RUN - Would retry the following:');
    failedRecords.slice(0, 10).forEach((r) => {
      console.log(`  - [${r.product_image_id}] ${r.old_image_url} → ${r.r2_key}`);
    });
    if (failedRecords.length > 10) {
      console.log(`  ... and ${failedRecords.length - 10} more`);
    }
    console.log('\nRun without --dry-run to execute the retry.');
    return;
  }
  
  // Initialize S3 client for R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  
  console.log('🚀 Starting retry process...\n');
  
  const results = [];
  const batchSize = args.concurrency;
  
  for (let i = 0; i < failedRecords.length; i += batchSize) {
    const batch = failedRecords.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(failedRecords.length / batchSize)} (${batch.length} images)...`);
    
    const batchResults = await processBatch(s3Client, bucketName, publicBaseUrl, batch);
    results.push(...batchResults);
    
    const succeeded = batchResults.filter((r) => r.status === 'success').length;
    const failed = batchResults.filter((r) => r.status === 'failed').length;
    console.log(`  Batch complete: ${succeeded} succeeded, ${failed} failed`);
  }
  
  // Write updated manifest
  const retryManifestPath = args.manifestPath.replace('.jsonl', '-retry.jsonl');
  console.log(`\n📝 Writing retry manifest to ${retryManifestPath}...`);
  
  const allUpdatedRecords = [
    ...successRecords, // Keep original successes
    ...results, // Add retry results
  ];
  
  fs.writeFileSync(
    retryManifestPath,
    allUpdatedRecords.map((r) => JSON.stringify(r)).join('\n') + '\n',
    'utf8'
  );
  
  // Summary
  const finalSuccess = allUpdatedRecords.filter((r) => r.status === 'success').length;
  const finalFailed = allUpdatedRecords.filter((r) => r.status === 'failed').length;
  
  console.log('\n📊 Final Summary');
  console.log('================================');
  console.log(`Total images: ${allUpdatedRecords.length}`);
  console.log(`✓ Succeeded: ${finalSuccess} (${((finalSuccess / allUpdatedRecords.length) * 100).toFixed(1)}%)`);
  console.log(`✗ Failed: ${finalFailed} (${((finalFailed / allUpdatedRecords.length) * 100).toFixed(1)}%)`);
  
  if (finalFailed > 0) {
    console.log('\n⚠️  Some migrations still failed. Check the manifest for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All migrations successful!');
    console.log('   Ready to proceed with database cutover.');
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
