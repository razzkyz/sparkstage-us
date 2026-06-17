#!/usr/bin/env node

/**
 * Copy ALL R2 Bucket Files: Indonesia → US (with pagination)
 * 
 * This script copies ALL product images from Indonesia R2 bucket to US R2 bucket
 * using pagination to handle more than 1000 files
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.r2-migration' });

// Validate environment variables
if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('❌ Error: Missing R2 credentials in .env.r2-migration');
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
 * List all objects with pagination
 */
async function listAllObjects() {
  const allObjects = [];
  let continuationToken = null;

  do {
    const command = new ListObjectsV2Command({
      Bucket: SOURCE_BUCKET,
      Prefix: 'products/',
      ContinuationToken: continuationToken,
    });

    const response = await client.send(command);
    
    if (response.Contents) {
      allObjects.push(...response.Contents);
    }

    continuationToken = response.NextContinuationToken;
    
    if (continuationToken) {
      console.log(`📋 Fetched ${allObjects.length} files so far...`);
    }
  } while (continuationToken);

  return allObjects;
}

/**
 * Copy files from source to target bucket
 */
async function copyAllFiles() {
  console.log('🚀 R2 Bucket Copy: Indonesia → US (ALL FILES)');
  console.log('━'.repeat(60));
  console.log(`📦 Source:      ${SOURCE_BUCKET}`);
  console.log(`📦 Target:      ${TARGET_BUCKET}`);
  console.log(`📁 Folder:      products/`);
  console.log('━'.repeat(60));
  console.log('');

  try {
    // List all objects with pagination
    console.log(`📋 Listing ALL files in ${SOURCE_BUCKET}...`);
    const allObjects = await listAllObjects();

    console.log(`✅ Found ${allObjects.length} files total\n`);

    // Copy each object
    let copied = 0;
    let failed = 0;
    let skipped = 0;
    const startTime = Date.now();

    for (let i = 0; i < allObjects.length; i++) {
      const object = allObjects[i];
      const progress = `[${i + 1}/${allObjects.length}]`;

      try {
        // Check if file already exists in target (optional - skip for speed)
        // For now, we'll copy all files (overwrite if exists)

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
        
        // Show progress every 10 files
        if (copied % 10 === 0 || i === allObjects.length - 1) {
          const sizeKB = (ContentLength / 1024).toFixed(1);
          const percent = ((copied / allObjects.length) * 100).toFixed(1);
          console.log(`✅ ${progress} ${percent}% - Copied ${copied} files (${object.Key} - ${sizeKB} KB)`);
        }
        
      } catch (err) {
        failed++;
        if (err.message.includes('NoSuchKey')) {
          skipped++;
          console.log(`⏭️  ${progress} Skipped: ${object.Key} (already exists)`);
        } else {
          console.error(`❌ ${progress} Failed: ${object.Key}`);
          console.error(`   Error: ${err.message}`);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const minutes = (duration / 60).toFixed(1);

    console.log('');
    console.log('━'.repeat(60));
    console.log('🎉 Copy Complete!');
    console.log('━'.repeat(60));
    console.log(`✅ Copied:      ${copied} files`);
    if (skipped > 0) {
      console.log(`⏭️  Skipped:     ${skipped} files (already exist)`);
    }
    if (failed > 0) {
      console.log(`❌ Failed:      ${failed} files`);
    }
    console.log(`⏱️  Duration:    ${duration}s (${minutes} minutes)`);
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
copyAllFiles();
