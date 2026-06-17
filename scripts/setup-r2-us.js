/**
 * Setup Cloudflare R2 Bucket for SparkStage US
 * Creates new bucket: sparkstage-us-assets
 */

import { S3Client, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

// R2 Credentials (same account as Indonesia version)
const R2_ACCOUNT_ID = '58103a6169fd3011a58d558c15adb7c6';
const R2_ACCESS_KEY_ID = '2e5f3b814dfd2925e60bb5aad6f74483';
const R2_SECRET_ACCESS_KEY = 'fdb41bebbc3ae3f763bd9abb3bd1238402d6adf7e19422d08498ed9754e35f5c';
const NEW_BUCKET_NAME = 'sparkstage-us-assets';

// Configure S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function setupR2Bucket() {
  console.log('🚀 Setting up R2 bucket for SparkStage US...\n');

  try {
    // Step 1: List existing buckets
    console.log('📋 Checking existing buckets...');
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    
    const bucketExists = listResponse.Buckets?.some(
      bucket => bucket.Name === NEW_BUCKET_NAME
    );

    if (bucketExists) {
      console.log(`✅ Bucket "${NEW_BUCKET_NAME}" already exists!\n`);
    } else {
      // Step 2: Create new bucket
      console.log(`📦 Creating bucket: ${NEW_BUCKET_NAME}...`);
      const createCommand = new CreateBucketCommand({
        Bucket: NEW_BUCKET_NAME,
      });
      await s3Client.send(createCommand);
      console.log(`✅ Bucket "${NEW_BUCKET_NAME}" created successfully!\n`);
    }

    // Step 3: Instructions for custom domain setup
    console.log('📝 Next Steps:');
    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('1️⃣  Setup Custom Domain (Zero-Cost Egress):');
    console.log('   - Go to: https://dash.cloudflare.com → R2 → sparkstage-us-assets');
    console.log('   - Click "Settings" → "Public Access"');
    console.log('   - Click "Connect Domain"');
    console.log('   - Enter domain: cdn-us.sparkstage55.com');
    console.log('   - OR create new subdomain: cdn.sparkstage-us.com');
    console.log('');
    console.log('2️⃣  Enable Public Access:');
    console.log('   - In bucket settings, enable "Allow Access"');
    console.log('   - Objects will be accessible via custom domain');
    console.log('');
    console.log('3️⃣  Update Database Migration:');
    console.log('   - Update image URLs in migration file');
    console.log('   - Use new domain: https://cdn-us.sparkstage55.com/products/...');
    console.log('');
    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('✅ R2 Bucket setup complete!');
    console.log('📦 Bucket name: sparkstage-us-assets');
    console.log('🌍 Account ID: ' + R2_ACCOUNT_ID);

  } catch (error) {
    console.error('❌ Error setting up R2 bucket:', error.message);
    if (error.$metadata) {
      console.error('Status:', error.$metadata.httpStatusCode);
    }
    process.exit(1);
  }
}

setupR2Bucket();
