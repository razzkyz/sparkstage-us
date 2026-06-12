#!/usr/bin/env node
/* eslint-disable */

/**
 * Diagnose R2 upload issue - compare manifest vs actual R2 content
 * 
 * Usage:
 *   node scripts/diagnose-r2-upload-issue.mjs --env-file .env.r2-migration
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'r2-migration-manifest-retry.jsonl');
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

async function listAllR2Objects(s3Client, bucketName) {
  console.log('📋 Listing all objects in R2 bucket...\n');
  
  const allKeys = new Set();
  let continuationToken = null;
  let totalSize = 0;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });
    
    const response = await s3Client.send(command);
    
    if (response.Contents) {
      response.Contents.forEach((obj) => {
        allKeys.add(obj.Key);
        totalSize += obj.Size || 0;
      });
      process.stdout.write(`\r  Progress: ${allKeys.size} objects...`);
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  console.log(`\n  ✓ Found ${allKeys.size} objects (${(totalSize / 1024 / 1024).toFixed(2)} MB)\n`);
  
  return allKeys;
}

async function main() {
  console.log('🔍 R2 Upload Diagnosis\n');
  console.log('================================\n');
  
  // Load environment
  loadEnvFile(DEFAULT_ENV_FILE);
  
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }
  
  console.log('✓ Configuration loaded');
  console.log(`  Bucket: ${bucketName}\n`);
  
  // Initialize S3 client
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  
  // List all R2 objects
  const r2Keys = await listAllR2Objects(s3Client, bucketName);
  
  // Read retry manifest
  console.log('📄 Reading retry manifest...\n');
  
  if (!fs.existsSync(DEFAULT_MANIFEST_PATH)) {
    console.error(`❌ Manifest not found: ${DEFAULT_MANIFEST_PATH}`);
    process.exit(1);
  }
  
  const manifestContent = fs.readFileSync(DEFAULT_MANIFEST_PATH, 'utf8');
  const allRecords = manifestContent
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  
  const successRecords = allRecords.filter((r) => r.status === 'success');
  const retryRecords = successRecords.filter((r) => r.retry_timestamp);
  
  console.log(`  Total records: ${allRecords.length}`);
  console.log(`  Success: ${successRecords.length}`);
  console.log(`  From retry: ${retryRecords.length}\n`);
  
  // Compare
  console.log('🔎 Comparing manifest vs R2...\n');
  
  const manifestKeys = new Set(successRecords.map((r) => r.r2_key));
  const missingInR2 = [];
  const extraInR2 = [];
  
  // Check which manifest keys are missing in R2
  manifestKeys.forEach((key) => {
    if (!r2Keys.has(key)) {
      missingInR2.push(key);
    }
  });
  
  // Check which R2 keys are not in manifest
  r2Keys.forEach((key) => {
    if (!manifestKeys.has(key)) {
      extraInR2.push(key);
    }
  });
  
  // Summary
  console.log('📊 Diagnosis Summary');
  console.log('================================');
  console.log(`Manifest success records: ${successRecords.length}`);
  console.log(`Actual R2 objects:        ${r2Keys.size}`);
  console.log(`Missing in R2:            ${missingInR2.length}`);
  console.log(`Extra in R2:              ${extraInR2.length}\n`);
  
  if (missingInR2.length > 0) {
    console.log('⚠️  FILES MISSING IN R2 (claimed success but not uploaded):\n');
    missingInR2.slice(0, 20).forEach((key) => {
      console.log(`  - ${key}`);
    });
    if (missingInR2.length > 20) {
      console.log(`  ... and ${missingInR2.length - 20} more\n`);
    }
    
    // Group by retry vs original
    const missingFromRetry = [];
    const missingFromOriginal = [];
    
    successRecords.forEach((r) => {
      if (missingInR2.includes(r.r2_key)) {
        if (r.retry_timestamp) {
          missingFromRetry.push(r);
        } else {
          missingFromOriginal.push(r);
        }
      }
    });
    
    console.log(`\n  From original migration: ${missingFromOriginal.length}`);
    console.log(`  From retry script:       ${missingFromRetry.length}\n`);
    
    if (missingFromRetry.length > 0) {
      console.log('❌ PROBLEM: Retry script claimed success but files not in R2!');
      console.log('   This means the retry script had a bug or used wrong credentials.\n');
    }
  }
  
  if (missingInR2.length === 0) {
    console.log('✅ All manifest files exist in R2!');
    console.log('   Manifest is accurate.\n');
  }
  
  // Save missing list
  if (missingInR2.length > 0) {
    const missingListPath = path.join(cwd, 'backups', 'r2-missing-files.txt');
    fs.writeFileSync(missingListPath, missingInR2.join('\n'), 'utf8');
    console.log(`📝 Missing files list saved to: ${missingListPath}\n`);
  }
  
  console.log('🎯 Next Steps:');
  if (missingInR2.length > 0) {
    console.log('   1. Re-run retry script with correct credentials');
    console.log('   2. Filter manifest to only retry missing files');
    console.log('   3. Verify upload success by checking R2 object count\n');
  } else {
    console.log('   1. Public access should work if all files in R2');
    console.log('   2. Test URLs again');
    console.log('   3. Check DNS propagation or CORS settings\n');
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
