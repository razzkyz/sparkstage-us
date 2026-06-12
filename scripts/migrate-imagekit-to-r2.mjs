#!/usr/bin/env node
/* eslint-disable */

/**
 * Migrate images from ImageKit to Cloudflare R2
 * 
 * This script:
 * 1. Fetches all product_images from database (provider = 'imagekit')
 * 2. Downloads each image from ImageKit
 * 3. Uploads to Cloudflare R2
 * 4. Records new R2 URL in migration manifest (does NOT update DB immediately for safety)
 * 
 * Usage:
 *   node scripts/migrate-imagekit-to-r2.mjs --env-file .env.r2-migration --dry-run
 *   node scripts/migrate-imagekit-to-r2.mjs --env-file .env.r2-migration --batch-size 50
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'r2-migration-manifest.jsonl');
const DEFAULT_SUMMARY_PATH = path.join(cwd, 'backups', 'r2-migration-summary.json');
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');
const SUPABASE_PAGE_SIZE = 1000;

// ============================================================================
// CLI Arguments Parser
// ============================================================================

function parseArgs(argv) {
  const args = {
    dryRun: false,
    batchSize: 25,
    limit: null,
    startAfterId: null,
    onlyProductId: null,
    concurrency: 3,
    envFile: DEFAULT_ENV_FILE,
    manifestPath: DEFAULT_MANIFEST_PATH,
    summaryPath: DEFAULT_SUMMARY_PATH,
    resume: true,
    failFast: false,
    skipDownload: false, // Use existing downloaded files if available
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
      continue;
    }
    if (arg === '--fail-fast') {
      args.failFast = true;
      continue;
    }
    if (arg === '--no-resume') {
      args.resume = false;
      continue;
    }
    if (arg === '--skip-download') {
      args.skipDownload = true;
      continue;
    }
    if (arg === '--batch-size') {
      args.batchSize = parsePositiveInteger(nextValue(), '--batch-size');
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      args.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), '--batch-size');
      continue;
    }
    if (arg === '--limit') {
      args.limit = parsePositiveInteger(nextValue(), '--limit');
      continue;
    }
    if (arg.startsWith('--limit=')) {
      args.limit = parsePositiveInteger(arg.slice('--limit='.length), '--limit');
      continue;
    }
    if (arg === '--start-after-id') {
      args.startAfterId = parsePositiveInteger(nextValue(), '--start-after-id');
      continue;
    }
    if (arg.startsWith('--start-after-id=')) {
      args.startAfterId = parsePositiveInteger(arg.slice('--start-after-id='.length), '--start-after-id');
      continue;
    }
    if (arg === '--only-product-id') {
      args.onlyProductId = parsePositiveInteger(nextValue(), '--only-product-id');
      continue;
    }
    if (arg.startsWith('--only-product-id=')) {
      args.onlyProductId = parsePositiveInteger(arg.slice('--only-product-id='.length), '--only-product-id');
      continue;
    }
    if (arg === '--concurrency') {
      args.concurrency = parsePositiveInteger(nextValue(), '--concurrency');
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      args.concurrency = parsePositiveInteger(arg.slice('--concurrency='.length), '--concurrency');
      continue;
    }
    if (arg === '--env-file') {
      args.envFile = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--env-file=')) {
      args.envFile = path.resolve(cwd, arg.slice('--env-file='.length));
      continue;
    }
    if (arg === '--manifest') {
      args.manifestPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--manifest=')) {
      args.manifestPath = path.resolve(cwd, arg.slice('--manifest='.length));
      continue;
    }
    if (arg === '--summary') {
      args.summaryPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--summary=')) {
      args.summaryPath = path.resolve(cwd, arg.slice('--summary='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  args.batchSize = Math.max(1, args.batchSize);
  args.concurrency = Math.max(1, args.concurrency);
  return args;
}

function parsePositiveInteger(rawValue, flagName) {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return parsed;
}

// ============================================================================
// Environment & Config
// ============================================================================

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

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getProjectRefFromSupabaseConfig() {
  const configPath = path.join(cwd, 'supabase', 'config.toml');
  if (!fs.existsSync(configPath)) {
    throw new Error('supabase/config.toml was not found, and SUPABASE_URL was not provided');
  }
  const configText = fs.readFileSync(configPath, 'utf8');
  const match = configText.match(/project_id\s*=\s*"([^"]+)"/);
  if (!match?.[1]) {
    throw new Error('Could not read project_id from supabase/config.toml');
  }
  return match[1].trim();
}

function isRedactedApiKey(value) {
  return typeof value === 'string' && value.includes('····');
}

function getServiceRoleKeyFromCli(projectRef) {
  try {
    const rawJson = execFileSync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', projectRef, '-o', 'json'],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    const apiKeys = JSON.parse(rawJson);
    const legacyServiceRole = apiKeys.find((item) => item?.id === 'service_role' && !isRedactedApiKey(item?.api_key));
    if (!legacyServiceRole?.api_key) {
      throw new Error('Legacy service_role key was not returned by the CLI');
    }
    return legacyServiceRole.api_key;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve service_role key via Supabase CLI: ${message}`);
  }
}

function resolveSupabaseCredentials() {
  const projectRef = getProjectRefFromSupabaseConfig();
  const url = process.env.SUPABASE_URL?.trim() || `https://${projectRef}.supabase.co`;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || getServiceRoleKeyFromCli(projectRef);
  return {
    projectRef,
    url,
    serviceRoleKey,
    source: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? 'env' : 'supabase_cli',
  };
}

// ============================================================================
// Resume State
// ============================================================================

function loadResumeState(manifestPath) {
  const latestById = new Map();
  if (!fs.existsSync(manifestPath)) {
    return latestById;
  }

  const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      const id = Number(entry.product_image_id);
      if (Number.isInteger(id) && id > 0) {
        latestById.set(id, entry);
      }
    } catch {
      continue;
    }
  }
  return latestById;
}

function appendJsonl(filePath, payload) {
  ensureParentDirectory(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// ============================================================================
// Database Queries
// ============================================================================

async function fetchCandidateRows(supabase, options) {
  const rows = [];
  let startIndex = 0;

  while (true) {
    let query = supabase
      .from('product_images')
      .select('id, product_id, image_url, image_provider, provider_file_id, provider_file_path, display_order, is_primary')
      .order('id', { ascending: true })
      .range(startIndex, startIndex + SUPABASE_PAGE_SIZE - 1);

    // Only migrate ImageKit files
    query = query.eq('image_provider', 'imagekit');

    if (options.startAfterId != null) {
      query = query.gt('id', options.startAfterId);
    }
    if (options.onlyProductId != null) {
      query = query.eq('product_id', options.onlyProductId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch product_images: ${error.message}`);
    }

    if (!data?.length) break;
    rows.push(...data);

    if (data.length < SUPABASE_PAGE_SIZE) break;
    startIndex += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

// ============================================================================
// Cloudflare R2 Upload (using S3-compatible API)
// ============================================================================

async function uploadToR2({ accountId, accessKeyId, secretAccessKey, bucketName, key, buffer, contentType }) {
  // Cloudflare R2 uses S3-compatible API
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto'; // R2 uses 'auto' as region
  const service = 's3';
  
  const url = `${endpoint}/${bucketName}/${key}`;
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  // Create canonical request
  const method = 'PUT';
  const canonicalUri = `/${bucketName}/${key}`;
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
    key,
    url: `${endpoint}/${bucketName}/${key}`,
    etag: response.headers.get('etag'),
  };
}

// AWS Signature V4 helpers
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
// Download from ImageKit
// ============================================================================

async function downloadFromImageKit(imageUrl, localPath) {
  ensureParentDirectory(localPath);
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download from ImageKit: ${response.status} ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(localPath, buffer);
  
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  
  return {
    buffer,
    contentType,
    size: buffer.length,
  };
}

// ============================================================================
// Work Queue & Batch Processing
// ============================================================================

function buildWorkQueue(rows, resumeState, options) {
  const queue = [];

  for (const row of rows) {
    const latestResult = resumeState.get(row.id);
    if (options.resume && latestResult?.status === 'success') {
      continue;
    }

    queue.push(row);
  }

  if (options.limit != null) {
    return queue.slice(0, options.limit);
  }
  return queue;
}

async function runBatch(items, worker, concurrency) {
  const results = [];
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) break;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

// ============================================================================
// Summary
// ============================================================================

function writeSummary(summaryPath, summary) {
  ensureParentDirectory(summaryPath);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

function printPlan(options, totalRows, queueLength, supabaseCredentials, r2Config) {
  console.log('ImageKit → Cloudflare R2 migration plan');
  console.log(`- dry_run: ${options.dryRun}`);
  console.log(`- batch_size: ${options.batchSize}`);
  console.log(`- concurrency: ${options.concurrency}`);
  console.log(`- resume: ${options.resume}`);
  console.log(`- skip_download: ${options.skipDownload}`);
  console.log(`- manifest: ${options.manifestPath}`);
  console.log(`- supabase_project_ref: ${supabaseCredentials.projectRef}`);
  console.log(`- supabase_credentials_source: ${supabaseCredentials.source}`);
  console.log(`- r2_bucket: ${r2Config.bucketName}`);
  console.log(`- r2_public_base_url: ${r2Config.publicBaseUrl}`);
  console.log(`- total_imagekit_rows: ${totalRows}`);
  console.log(`- queue_after_resume_limit: ${queueLength}`);
  if (options.onlyProductId != null) {
    console.log(`- only_product_id: ${options.onlyProductId}`);
  }
  if (options.startAfterId != null) {
    console.log(`- start_after_id: ${options.startAfterId}`);
  }
  if (options.limit != null) {
    console.log(`- limit: ${options.limit}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(options.envFile);

  const supabaseCredentials = resolveSupabaseCredentials();
  
  // R2 Configuration
  const r2Config = {
    accountId: options.dryRun ? process.env.R2_ACCOUNT_ID?.trim() ?? '' : requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: options.dryRun ? process.env.R2_ACCESS_KEY_ID?.trim() ?? '' : requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: options.dryRun ? process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '' : requireEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: options.dryRun ? process.env.R2_BUCKET_NAME?.trim() ?? 'sparkstage-assets' : requireEnv('R2_BUCKET_NAME'),
    publicBaseUrl: options.dryRun ? process.env.R2_PUBLIC_BASE_URL?.trim() ?? '' : requireEnv('R2_PUBLIC_BASE_URL'),
    basePath: process.env.R2_BASE_PATH?.trim() || 'products',
  };

  const supabase = createClient(supabaseCredentials.url, supabaseCredentials.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const resumeState = options.resume ? loadResumeState(options.manifestPath) : new Map();
  const sourceRows = await fetchCandidateRows(supabase, options);
  const queue = buildWorkQueue(sourceRows, resumeState, options);

  printPlan(options, sourceRows.length, queue.length, supabaseCredentials, r2Config);

  if (queue.length === 0) {
    const summary = {
      generated_at: new Date().toISOString(),
      dry_run: options.dryRun,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: sourceRows.length,
      queue_after_resume_limit: 0,
      manifest_path: options.manifestPath,
    };
    writeSummary(options.summaryPath, summary);
    console.log('No rows matched the current migration filters.');
    return;
  }

  const startedAt = Date.now();
  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  const failures = [];

  // Create temp download directory
  const downloadDir = path.join(cwd, 'backups', 'r2-migration-temp');
  fs.mkdirSync(downloadDir, { recursive: true });

  for (let batchStart = 0; batchStart < queue.length; batchStart += options.batchSize) {
    const batch = queue.slice(batchStart, batchStart + options.batchSize);
    const batchNumber = Math.floor(batchStart / options.batchSize) + 1;
    console.log(`\nBatch ${batchNumber}: processing ${batch.length} row(s)`);

    const batchResults = await runBatch(
      batch,
      async (row) => {
        const startedRowAt = Date.now();
        attempted += 1;

        // Determine R2 key (path in bucket)
        const fileName = path.basename(new URL(row.image_url).pathname);
        const r2Key = `${r2Config.basePath}/${row.product_id}/${fileName}`;
        const newPublicUrl = `${r2Config.publicBaseUrl}/${r2Key}`;
        
        const localDownloadPath = path.join(downloadDir, `${row.id}_${fileName}`);

        const baseResult = {
          timestamp: new Date().toISOString(),
          dry_run: options.dryRun,
          product_image_id: row.id,
          product_id: row.product_id,
          display_order: row.display_order,
          is_primary: row.is_primary,
          old_image_url: row.image_url,
          old_provider: row.image_provider,
          old_provider_file_id: row.provider_file_id,
          old_provider_file_path: row.provider_file_path,
          r2_key: r2Key,
          new_image_url: newPublicUrl,
        };

        if (options.dryRun) {
          return {
            ...baseResult,
            status: 'dry_run',
            duration_ms: Date.now() - startedRowAt,
          };
        }

        try {
          let fileBuffer;
          let contentType;
          
          // Check if file already downloaded
          if (options.skipDownload && fs.existsSync(localDownloadPath)) {
            console.log(`  Using cached file for product_images.id=${row.id}`);
            fileBuffer = await fs.promises.readFile(localDownloadPath);
            contentType = 'image/jpeg'; // Default, can be improved
          } else {
            // Download from ImageKit
            const downloadResult = await downloadFromImageKit(row.image_url, localDownloadPath);
            fileBuffer = downloadResult.buffer;
            contentType = downloadResult.contentType;
          }

          // Upload to R2
          const r2Result = await uploadToR2({
            accountId: r2Config.accountId,
            accessKeyId: r2Config.accessKeyId,
            secretAccessKey: r2Config.secretAccessKey,
            bucketName: r2Config.bucketName,
            key: r2Key,
            buffer: fileBuffer,
            contentType,
          });

          const result = {
            ...baseResult,
            status: 'success',
            duration_ms: Date.now() - startedRowAt,
            r2_etag: r2Result.etag,
            file_size: fileBuffer.length,
            content_type: contentType,
          };
          
          appendJsonl(options.manifestPath, result);
          succeeded += 1;
          
          // Clean up downloaded file after successful upload
          try {
            await fs.promises.unlink(localDownloadPath);
          } catch {}
          
          return result;
        } catch (error) {
          const result = {
            ...baseResult,
            status: 'failed',
            duration_ms: Date.now() - startedRowAt,
            error: error instanceof Error ? error.message : String(error),
          };
          appendJsonl(options.manifestPath, result);
          failed += 1;
          failures.push(result);
          if (options.failFast) {
            throw new Error(result.error);
          }
          return result;
        }
      },
      options.concurrency
    );

    for (const result of batchResults) {
      if (result.status === 'success') {
        console.log(`  [ok] product_images.id=${result.product_image_id} -> ${result.new_image_url}`);
      } else if (result.status === 'dry_run') {
        console.log(`  [plan] product_images.id=${result.product_image_id} -> ${result.new_image_url}`);
      } else {
        console.log(`  [fail] product_images.id=${result.product_image_id}: ${result.error}`);
      }
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    dry_run: options.dryRun,
    attempted,
    succeeded,
    failed,
    failures: failures.slice(0, 20),
    queue_after_resume_limit: queue.length,
    manifest_path: options.manifestPath,
  };

  writeSummary(options.summaryPath, summary);

  console.log('\nMigration summary');
  console.log(`- attempted: ${attempted}`);
  console.log(`- succeeded: ${succeeded}`);
  console.log(`- failed: ${failed}`);
  console.log(`- summary: ${options.summaryPath}`);
  console.log('\nNOTE: This script does NOT update the database automatically.');
  console.log('Review the manifest file and use the cutover script when ready.');

  if (failed > 0 && !options.dryRun) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Migration aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
