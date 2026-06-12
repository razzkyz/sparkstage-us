import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = '58103a6169fd3011a58d558c15adb7c6';
const accessKeyId = '2e5f3b814dfd2925e60bb5aad6f74483';
const secretAccessKey = 'fdb41bebbc3ae3f763bd9abb3bd1238402d6adf7e19422d08498ed9754e35f5c';
const bucketName = 'sparkstage-public-assets';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

console.log('Testing R2 connection...\n');
console.log('Config:');
console.log('  Account ID:', accountId);
console.log('  Bucket:', bucketName);
console.log('  Endpoint:', `https://${accountId}.r2.cloudflarestorage.com`);
console.log('  Access Key ID:', accessKeyId.substring(0, 8) + '...');
console.log('\n--- Test 1: List Buckets ---');

try {
  const listBucketsResponse = await client.send(new ListBucketsCommand({}));
  console.log('✅ SUCCESS: Can list buckets');
  console.log('Buckets found:', listBucketsResponse.Buckets?.length || 0);
  
  if (listBucketsResponse.Buckets?.length > 0) {
    console.log('\nBucket names:');
    for (const bucket of listBucketsResponse.Buckets) {
      console.log('  -', bucket.Name);
      if (bucket.Name === bucketName) {
        console.log('    ✅ Target bucket found!');
      }
    }
  }
} catch (error) {
  console.log('❌ FAILED:', error.message);
  console.log('Full error:', error);
}

console.log('\n--- Test 2: List Objects in Bucket ---');

try {
  const listObjectsResponse = await client.send(new ListObjectsV2Command({
    Bucket: bucketName,
    MaxKeys: 10,
  }));
  console.log('✅ SUCCESS: Can access bucket');
  console.log('Objects found:', listObjectsResponse.KeyCount || 0);
  
  if (listObjectsResponse.Contents?.length > 0) {
    console.log('\nFirst 10 objects:');
    for (const obj of listObjectsResponse.Contents.slice(0, 10)) {
      console.log('  -', obj.Key);
    }
  }
} catch (error) {
  console.log('❌ FAILED:', error.message);
  if (error.$metadata) {
    console.log('HTTP Status:', error.$metadata.httpStatusCode);
  }
}

console.log('\n--- Done ---');
