#!/usr/bin/env node
/* eslint-disable */

/**
 * Database Cutover: Update product_images to use R2 URLs
 * 
 * ⚠️  DANGER ZONE ⚠️
 * This script updates the database to serve images from R2 instead of ImageKit.
 * This is the POINT OF NO RETURN for the migration.
 * 
 * Usage:
 *   node scripts/r2-cutover.mjs --dry-run --env-file .env.r2-migration
 *   node scripts/r2-cutover.mjs --confirm --env-file .env.r2-migration
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'r2-migration-manifest.jsonl');
const DEFAULT_ENV_FILE = path.join(cwd, '.env.r2-migration');

// ============================================================================
// CLI Arguments Parser
// ============================================================================

function parseArgs(argv) {
  const args = {
    dryRun: true, // Default to dry run for safety
    confirm: false,
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

    if (arg === '--dry-run') {
      args.dryRun = true;
      args.confirm = false;
      continue;
    }
    if (arg === '--confirm') {
      args.dryRun = false;
      args.confirm = true;
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
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

// ============================================================================
// Load Migration Manifest
// ============================================================================

function loadSuccessfulMigrations(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`);
  }

  const migrations = [];
  const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.status === 'success' && entry.product_image_id && entry.new_image_url) {
        migrations.push({
          id: entry.product_image_id,
          oldUrl: entry.old_image_url,
          newUrl: entry.new_image_url,
          r2Key: entry.r2_key,
        });
      }
    } catch {
      continue;
    }
  }

  return migrations;
}

// ============================================================================
// Database Update
// ============================================================================

async function updateProductImages(supabase, migrations, dryRun) {
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const migration of migrations) {
    try {
      if (dryRun) {
        console.log(`[DRY RUN] Would update product_images.id=${migration.id}`);
        console.log(`  From: ${migration.oldUrl}`);
        console.log(`  To:   ${migration.newUrl}`);
        updated += 1;
      } else {
        const { error } = await supabase
          .from('product_images')
          .update({
            image_url: migration.newUrl,
            image_provider: 'r2',
            provider_file_path: migration.r2Key,
            provider_original_url: migration.oldUrl, // Backup for rollback
            migrated_at: new Date().toISOString(),
          })
          .eq('id', migration.id)
          .eq('image_provider', 'imagekit'); // Safety: only update ImageKit rows

        if (error) {
          throw error;
        }

        updated += 1;
        
        if (updated % 100 === 0) {
          console.log(`  Updated ${updated} / ${migrations.length} rows...`);
        }
      }
    } catch (error) {
      failed += 1;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ id: migration.id, error: errorMsg });
      console.error(`  ✗ Failed to update product_images.id=${migration.id}: ${errorMsg}`);
    }
  }

  return { updated, failed, errors };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(options.envFile);

  console.log('🚨 R2 Database Cutover Script');
  console.log('='.repeat(50));
  console.log('');

  if (!options.confirm) {
    console.log('🧪 DRY RUN MODE - No database changes will be made');
  } else {
    console.log('⚠️  PRODUCTION MODE - Database WILL be updated!');
  }
  console.log('');

  const supabaseCredentials = resolveSupabaseCredentials();
  const supabase = createClient(supabaseCredentials.url, supabaseCredentials.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Load successful migrations from manifest
  console.log('📋 Loading migration manifest...');
  let migrations;
  try {
    migrations = loadSuccessfulMigrations(options.manifestPath);
    console.log(`✓ Loaded ${migrations.length} successful migrations from manifest`);
  } catch (error) {
    console.error(`✗ Failed to load manifest: ${error.message}`);
    console.error('\nPlease run the migration script first:');
    console.error('  npm run r2:migrate');
    process.exit(1);
  }

  if (migrations.length === 0) {
    console.log('\n⚠️  No successful migrations found in manifest.');
    console.log('Please run the migration script first:');
    console.log('  npm run r2:migrate');
    process.exit(1);
  }

  // Verify current database state
  console.log('\n🔍 Checking database state...');
  const { count: imagekitCount, error: ikError } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('image_provider', 'imagekit');

  const { count: r2Count, error: r2Error } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('image_provider', 'r2');

  if (ikError || r2Error) {
    console.error('✗ Failed to query database');
    process.exit(1);
  }

  console.log(`  ImageKit rows: ${imagekitCount || 0}`);
  console.log(`  R2 rows: ${r2Count || 0}`);

  // Safety checks
  if (options.confirm) {
    console.log('\n⚠️  SAFETY CHECK ⚠️');
    
    if ((imagekitCount || 0) === 0) {
      console.log('✗ No ImageKit rows found in database. Cutover may have already been done.');
      console.log('Aborting for safety.');
      process.exit(1);
    }

    if ((imagekitCount || 0) !== migrations.length) {
      console.log(`⚠️  Warning: Database has ${imagekitCount} ImageKit rows, but manifest has ${migrations.length} migrations.`);
      console.log('This may be expected if some images failed to migrate.');
    }

    console.log('\n🔴 FINAL WARNING 🔴');
    console.log('This will update the database to serve images from R2.');
    console.log('This is the POINT OF NO RETURN.');
    console.log('');
    console.log('Press Ctrl+C now to abort, or the script will continue in 5 seconds...');
    
    // Wait 5 seconds for user to abort
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('\nProceeding with cutover...\n');
  }

  // Perform update
  console.log('📝 Updating database...');
  const startTime = Date.now();
  const result = await updateProductImages(supabase, migrations, !options.confirm);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('='.repeat(50));
  console.log('Cutover Summary:');
  console.log(`  Updated: ${result.updated} rows`);
  console.log(`  Failed: ${result.failed} rows`);
  console.log(`  Duration: ${duration}s`);
  console.log('');

  if (result.failed > 0) {
    console.log('⚠️  Some updates failed. See errors above.');
    console.log('');
  }

  if (options.confirm && result.updated > 0) {
    console.log('✅ Database cutover complete!');
    console.log('');
    console.log('🚨 IMMEDIATE ACTION REQUIRED:');
    console.log('  1. Test the website NOW');
    console.log('  2. Check for broken images');
    console.log('  3. Monitor error logs');
    console.log('  4. Verify images load from R2 (DevTools → Network)');
    console.log('');
    console.log('Rollback command (if needed):');
    console.log('  UPDATE product_images');
    console.log('  SET image_url = provider_original_url, image_provider = \'imagekit\'');
    console.log('  WHERE image_provider = \'r2\' AND provider_original_url IS NOT NULL;');
    console.log('');
  } else if (!options.confirm) {
    console.log('🧪 Dry run complete. No changes were made.');
    console.log('');
    console.log('To perform the actual cutover, run:');
    console.log('  node scripts/r2-cutover.mjs --confirm --env-file .env.r2-migration');
    console.log('');
    console.log('Or use the npm script:');
    console.log('  npm run r2:cutover:confirm');
    console.log('');
  }

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\n💥 Cutover failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
