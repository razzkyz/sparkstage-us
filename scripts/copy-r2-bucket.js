#!/usr/bin/env node

/**
 * Copy R2 Bucket: Indonesia → US
 * 
 * This script copies product images from Indonesia R2 bucket to US R2 bucket
 * 
 * Usage:
 *   node scripts/copy-r2-bucket.js [--all|--sample|--limit=N]
 * 
 * Options:
 *   --all        Copy all files (default)
 *   --sample     Copy only first 50 files (for testing)
 *   --limit=N    Copy only first N files
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.r2-migration' });

// Parse command line arguments
const args = process.argv.slice(2);
let limit = null;

if (args.includes('--sample')) {
  limit = 50;
} else {
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    limit = parseInt(limitArg.split('=')[1]);
  }
}

// Validate environment variables
if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('❌ Error: Missing R2 credentials in .env.r2-migration');
  console.error('Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

// Create S3 client
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Bucket names
const SOURCE_BUCKET = 'sparkstage-public-assets';
const TARGET_BUCKET = 'sparkstage-us-assets';

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Copy files from source to target bucket
 */
async function copyBucket() {
  console.log('🚀 R2 Bucket Copy: Indonesia → US');
  console.log('━'.repeat(60));
  console.log(`📦 Source:      ${SOURCE_BUCKET}`);
  console.log(`📦 Target:      ${TARGET_BUCKET}`);
  console.log(`📁 Folder:      products/`);
  if (limit) {
    console.log(`🔢 Limit:       ${limit} files`);
  } else {
    console.log(`🔢 Limit:       All files`);
  }
  console.log('━'.repeat(60));
  console.log('');

  try {
    // List all objects in source bucket
    console.log(`📋 Listing files in ${SOURCE_BUCKET}...`);
    
    const listCommand = new ListObjectsV2Command({
      Bucket: SOURCE_BUCKET,
      Prefix: 'products/', // Only copy products folder
      MaxKeys: limit || 1000,
    });

    const { Contents } = await client.send(listCommand);

    if (!Contents || Contents.length === 0) {
      console.log('❌ No files found in source bucket!');
      return;
    }

    const filesToCopy = limit ? Contents.slice(0, limit) : Contents;
    
    console.log(`✅ Found ${Contents.length} files total`);
    console.log(`📊 Will copy ${filesToCopy.length} files\n`);

    // Copy each object
    let copied = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < filesToCopy.length; i++) {
      const object = filesToCopy[i];
      const progress = `[${i + 1}/${filesToCopy.length}]`;

      try {
        // Get object from source
        const getCommand = new GetObjectCommand({
          Bucket: SOURCE_BUCKET,
          Key: object.Key,
        });

        const { Body, ContentType, ContentLength } = await client.send(getCommand);

        // Convert stream to buffer
        const buffer = await streamToBuffer(Body);

        // Put object to target
        const putCommand = new PutObjectCommand({
          Bucket: TARGET_BUCKET,
          Key: object.Key,
          Body: buffer,
          ContentType: ContentType || 'image/jpeg',
        });

        await client.send(putCommand);

        copied++;
        
        // Show progress
        const sizeKB = (ContentLength / 1024).toFixed(1);
        console.log(`✅ ${progress} ${object.Key} (${sizeKB} KB)`);
        
      } catch (err) {
        failed++;
        console.error(`❌ ${progress} Failed: ${object.Key}`);
        console.error(`   Error: ${err.message}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('━'.repeat(60));
    console.log('🎉 Copy Complete!');
    console.log('━'.repeat(60));
    console.log(`✅ Copied:      ${copied} files`);
    if (failed > 0) {
      console.log(`❌ Failed:      ${failed} files`);
    }
    console.log(`⏱️  Duration:    ${duration}s`);
    console.log('━'.repeat(60));
    
    if (copied > 0) {
      console.log('');
      console.log('📋 Next Steps:');
      console.log('1. Setup custom domain: cdn.sparkstage-us.com');
      console.log('2. Update database URLs to new domain');
      console.log('3. Test image loading on frontend');
    }
    
  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run the copy
copyBucket();
