#!/usr/bin/env node
/* eslint-disable */

/**
 * Check migration status from ImageKit to Cloudflare R2
 * 
 * Usage:
 *   node scripts/r2-migration-status.mjs --env-file .env.r2-migration
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'r2-migration-manifest.jsonl');
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    manifestPath: DEFAULT_MANIFEST_PATH,
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

    throw new Error(`Unknown argument: ${arg}`);
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

function getProjectRefFromSupabaseConfig() {
  const configPath = path.join(cwd, 'supabase', 'config.toml');
  if (!fs.existsSync(configPath)) {
    throw new Error('supabase/config.toml was not found');
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
  return { projectRef, url, serviceRoleKey };
}

function loadManifestStats(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      dryRun: 0,
      byProductId: new Map(),
      successIds: new Set(),
      failedIds: new Set(),
    };
  }

  const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/);
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    dryRun: 0,
    byProductId: new Map(),
    successIds: new Set(),
    failedIds: new Set(),
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      stats.total += 1;

      if (entry.status === 'success') {
        stats.success += 1;
        stats.successIds.add(entry.product_image_id);
      } else if (entry.status === 'failed') {
        stats.failed += 1;
        stats.failedIds.add(entry.product_image_id);
      } else if (entry.status === 'dry_run') {
        stats.dryRun += 1;
      }

      const productId = entry.product_id;
      if (!stats.byProductId.has(productId)) {
        stats.byProductId.set(productId, { total: 0, success: 0, failed: 0 });
      }
      const productStats = stats.byProductId.get(productId);
      productStats.total += 1;
      if (entry.status === 'success') productStats.success += 1;
      if (entry.status === 'failed') productStats.failed += 1;
    } catch {
      continue;
    }
  }

  return stats;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(options.envFile);

  const supabaseCredentials = resolveSupabaseCredentials();
  const supabase = createClient(supabaseCredentials.url, supabaseCredentials.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('R2 Migration Status Report');
  console.log('='.repeat(50));
  console.log('');

  // Database stats
  const { data: imagekitRows, error: ikError } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('image_provider', 'imagekit');

  const { data: r2Rows, error: r2Error } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('image_provider', 'r2');

  if (ikError || r2Error) {
    console.error('Failed to fetch database stats');
    process.exitCode = 1;
    return;
  }

  console.log('Database Status:');
  console.log(`  ImageKit provider: ${imagekitRows || 0} rows`);
  console.log(`  R2 provider: ${r2Rows || 0} rows`);
  console.log('');

  // Manifest stats
  const manifestStats = loadManifestStats(options.manifestPath);

  console.log('Migration Manifest:');
  console.log(`  Total entries: ${manifestStats.total}`);
  console.log(`  Success: ${manifestStats.success}`);
  console.log(`  Failed: ${manifestStats.failed}`);
  console.log(`  Dry run: ${manifestStats.dryRun}`);
  console.log('');

  if (manifestStats.byProductId.size > 0) {
    console.log('By Product ID:');
    const sortedProducts = Array.from(manifestStats.byProductId.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    for (const [productId, stats] of sortedProducts) {
      console.log(`  Product ${productId}: ${stats.success}/${stats.total} success, ${stats.failed} failed`);
    }
    console.log('');
  }

  // Progress
  const totalImageKit = imagekitRows || 0;
  const migrated = manifestStats.success;
  const remaining = totalImageKit - migrated;
  const progress = totalImageKit > 0 ? ((migrated / totalImageKit) * 100).toFixed(2) : '0.00';

  console.log('Progress:');
  console.log(`  Migrated: ${migrated} / ${totalImageKit} (${progress}%)`);
  console.log(`  Remaining: ${remaining}`);
  console.log('');

  if (manifestStats.failed > 0) {
    console.log('⚠️  Warning: Some migrations failed. Check the manifest file for details.');
    console.log(`   Manifest: ${options.manifestPath}`);
  }

  if (remaining === 0 && migrated > 0) {
    console.log('✅ All images have been migrated to R2!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify images are accessible in production');
    console.log('  2. Run the database cutover script');
    console.log('  3. Monitor for 7-14 days');
    console.log('  4. Cancel ImageKit subscription');
  }
}

main().catch((error) => {
  console.error(`Status check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
