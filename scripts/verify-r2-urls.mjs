#!/usr/bin/env node
/* eslint-disable */

/**
 * Verify R2 URLs are accessible
 * 
 * Samples random URLs from migration manifest and checks if they're accessible
 * 
 * Usage:
 *   node scripts/verify-r2-urls.mjs --manifest backups/r2-migration-manifest.jsonl --sample-size 20
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'r2-migration-manifest.jsonl');

function parseArgs(argv) {
  const args = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    sampleSize: 20,
    timeout: 10000,
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

    if (arg === '--manifest') {
      args.manifestPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--manifest=')) {
      args.manifestPath = path.resolve(cwd, arg.slice('--manifest='.length));
      continue;
    }
    if (arg === '--sample-size') {
      args.sampleSize = parseInt(nextValue(), 10);
      continue;
    }
    if (arg.startsWith('--sample-size=')) {
      args.sampleSize = parseInt(arg.slice('--sample-size='.length), 10);
      continue;
    }
    if (arg === '--timeout') {
      args.timeout = parseInt(nextValue(), 10);
      continue;
    }
    if (arg.startsWith('--timeout=')) {
      args.timeout = parseInt(arg.slice('--timeout='.length), 10);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function loadSuccessfulUrls(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/);
  const urls = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.status === 'success' && entry.new_image_url) {
        urls.push({
          id: entry.product_image_id,
          productId: entry.product_id,
          url: entry.new_image_url,
          oldUrl: entry.old_image_url,
        });
      }
    } catch {
      continue;
    }
  }

  return urls;
}

function randomSample(array, size) {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}

async function checkUrl(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      cacheControl: response.headers.get('cache-control'),
      duration,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('R2 URL Verification');
  console.log('='.repeat(50));
  console.log('');

  const allUrls = loadSuccessfulUrls(options.manifestPath);
  console.log(`Total successful migrations: ${allUrls.length}`);

  if (allUrls.length === 0) {
    console.log('No URLs to verify. Run migration first.');
    return;
  }

  const sample = randomSample(allUrls, Math.min(options.sampleSize, allUrls.length));
  console.log(`Testing ${sample.length} random URLs...`);
  console.log('');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const item of sample) {
    const result = await checkUrl(item.url, options.timeout);

    if (result.success) {
      passed += 1;
      console.log(`✅ [${result.status}] Product ${item.productId} (${result.duration}ms)`);
      console.log(`   ${item.url}`);
      if (result.contentType) {
        console.log(`   Type: ${result.contentType}, Size: ${result.contentLength || 'unknown'}`);
      }
    } else {
      failed += 1;
      failures.push(item);
      console.log(`❌ [FAIL] Product ${item.productId}`);
      console.log(`   ${item.url}`);
      console.log(`   Error: ${result.error || result.statusText}`);
    }
    console.log('');
  }

  console.log('='.repeat(50));
  console.log('Summary:');
  console.log(`  Tested: ${sample.length}`);
  console.log(`  Passed: ${passed} (${((passed / sample.length) * 100).toFixed(2)}%)`);
  console.log(`  Failed: ${failed} (${((failed / sample.length) * 100).toFixed(2)}%)`);
  console.log('');

  if (failed > 0) {
    console.log('⚠️  Failed URLs:');
    for (const item of failures) {
      console.log(`  - Product ${item.productId}: ${item.url}`);
    }
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Check R2 bucket public access is enabled');
    console.log('  2. Verify custom domain DNS is configured');
    console.log('  3. Check CORS settings if accessing from browser');
    console.log('  4. Wait a few minutes for DNS propagation');
    process.exitCode = 1;
  } else {
    console.log('✅ All sampled URLs are accessible!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Continue with larger sample if needed');
    console.log('  2. Proceed with soak period (24-48 hours)');
    console.log('  3. Run database cutover when ready');
  }
}

main().catch((error) => {
  console.error(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
