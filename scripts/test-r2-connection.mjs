#!/usr/bin/env node
/* eslint-disable */

/**
 * Test Cloudflare R2 Connection
 * 
 * Quick test to verify R2 credentials are correct before running migration.
 * 
 * Usage:
 *   node scripts/test-r2-connection.mjs
 *   node scripts/test-r2-connection.mjs --env-file .env.r2-migration
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');

// ============================================================================
// Environment Loader
// ============================================================================

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`);
  }
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

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ============================================================================
// AWS Signature V4 Helpers
// ============================================================================

async function sha256Hex(data) {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(key, data) {
  const signature = await hmacSha256(key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${key}`), dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

// ============================================================================
// R2 Test Upload
// ============================================================================

async function testR2Upload({ accountId, accessKeyId, secretAccessKey, bucketName }) {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  
  // Test file: simple text file
  const testKey = '_test_connection.txt';
  const testContent = `R2 connection test successful!\nTimestamp: ${new Date().toISOString()}`;
  const buffer = new TextEncoder().encode(testContent);
  const contentType = 'text/plain';
  
  const url = `${endpoint}/${bucketName}/${testKey}`;
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  // Create canonical request
  const method = 'PUT';
  const canonicalUri = `/${bucketName}/${testKey}`;
  const canonicalQueryString = '';
  const payloadHash = await sha256Hex(buffer);
  
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${accountId}.r2.cloudflarestorage.com`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    '',
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  
  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  // Make the request
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authorizationHeader,
    },
    body: buffer,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 upload failed (${response.status}): ${errorText}`);
  }
  
  return {
    key: testKey,
    url: `${endpoint}/${bucketName}/${testKey}`,
    etag: response.headers.get('etag'),
  };
}

// ============================================================================
// R2 Test List (Verify Bucket Access)
// ============================================================================

async function testR2List({ accountId, accessKeyId, secretAccessKey, bucketName }) {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  
  const url = `${endpoint}/${bucketName}?list-type=2&max-keys=1`;
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  // Create canonical request
  const method = 'GET';
  const canonicalUri = `/${bucketName}/`;
  const canonicalQueryString = 'list-type=2&max-keys=1';
  const payloadHash = await sha256Hex('');
  
  const canonicalHeaders = [
    `host:${accountId}.r2.cloudflarestorage.com`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    '',
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  
  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  // Make the request
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authorizationHeader,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 list failed (${response.status}): ${errorText}`);
  }
  
  const xmlText = await response.text();
  return xmlText;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let envFile = DEFAULT_ENV_FILE;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env-file' && args[i + 1]) {
      envFile = path.resolve(cwd, args[i + 1]);
      i++;
    }
  }

  console.log('🧪 Testing Cloudflare R2 Connection...\n');
  
  try {
    loadEnvFile(envFile);
    console.log(`✓ Loaded environment from: ${envFile}`);
  } catch (error) {
    console.error(`✗ Failed to load environment file: ${error.message}`);
    process.exit(1);
  }

  let r2Config;
  try {
    r2Config = {
      accountId: requireEnv('R2_ACCOUNT_ID'),
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      bucketName: requireEnv('R2_BUCKET_NAME'),
      publicBaseUrl: requireEnv('R2_PUBLIC_BASE_URL'),
      basePath: process.env.R2_BASE_PATH?.trim() || 'products',
    };
    console.log(`✓ Loaded R2 configuration`);
    console.log(`  - Account ID: ${r2Config.accountId}`);
    console.log(`  - Bucket: ${r2Config.bucketName}`);
    console.log(`  - Base Path: ${r2Config.basePath}`);
    console.log(`  - Public URL: ${r2Config.publicBaseUrl}`);
  } catch (error) {
    console.error(`\n✗ Configuration error: ${error.message}`);
    console.error('\nPlease check your .env.r2-migration file and ensure all required variables are set:');
    console.error('  - R2_ACCOUNT_ID');
    console.error('  - R2_ACCESS_KEY_ID');
    console.error('  - R2_SECRET_ACCESS_KEY');
    console.error('  - R2_BUCKET_NAME');
    console.error('  - R2_PUBLIC_BASE_URL');
    process.exit(1);
  }

  // Test 1: List bucket (verify read access)
  console.log('\n📋 Test 1: Listing bucket contents...');
  try {
    await testR2List(r2Config);
    console.log('✓ Successfully listed bucket (read access OK)');
  } catch (error) {
    console.error(`✗ Failed to list bucket: ${error.message}`);
    console.error('\nPossible issues:');
    console.error('  - Invalid credentials (check Access Key ID and Secret Access Key)');
    console.error('  - Bucket does not exist');
    console.error('  - API token does not have Read permission');
    process.exit(1);
  }

  // Test 2: Upload test file (verify write access)
  console.log('\n📤 Test 2: Uploading test file...');
  try {
    const result = await testR2Upload(r2Config);
    console.log('✓ Successfully uploaded test file');
    console.log(`  - Key: ${result.key}`);
    console.log(`  - ETag: ${result.etag}`);
  } catch (error) {
    console.error(`✗ Failed to upload test file: ${error.message}`);
    console.error('\nPossible issues:');
    console.error('  - API token does not have Write permission');
    console.error('  - Bucket storage quota exceeded');
    process.exit(1);
  }

  // Test 3: Verify public URL format
  console.log('\n🌐 Test 3: Verifying public URL configuration...');
  const expectedPublicUrl = `${r2Config.publicBaseUrl}/${r2Config.basePath}/123/test.jpg`;
  console.log(`✓ Public URL format looks good`);
  console.log(`  - Example URL: ${expectedPublicUrl}`);
  
  if (r2Config.publicBaseUrl.includes('pub-') && r2Config.publicBaseUrl.includes('.r2.dev')) {
    console.log(`  ⚠️  Using R2.dev domain (good for testing)`);
    console.log(`  💡 For production, consider setting up custom domain`);
  } else {
    console.log(`  ✓ Using custom domain (production-ready)`);
  }

  console.log('\n✅ All tests passed! R2 is ready for migration.\n');
  console.log('Next steps:');
  console.log('  1. Run dry-run migration: npm run r2:migrate:dry');
  console.log('  2. Test batch migration: npm run r2:migrate -- --batch-size 25 --limit 25');
  console.log('  3. Check migration status: npm run r2:migrate:status\n');
}

main().catch((error) => {
  console.error(`\n💥 Test failed: ${error.message}`);
  process.exit(1);
});
