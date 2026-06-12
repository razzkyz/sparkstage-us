#!/usr/bin/env node
/* eslint-disable */

/**
 * Database cutover script: Update product_images URLs from ImageKit to R2
 * 
 * WARNING: This updates the database. Run with --dry-run first!
 * 
 * Usage:
 *   node scripts/r2-cutover-database.mjs --env-file .env.r2-migration --dry-run
 *   node scripts/r2-cutover-database.mjs --env-file .env.r2-migration --confirm
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
    dryRun: true,
    confirm: false,
    batchSize: 100,
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
      args.confirm = true;
      args.dryRun = false;
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
    if (arg === '--batch-size') {
      args.batchSize = parseInt(nextValue(), 10);
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      args.batchSize = parseInt(arg.slice('--batch-size='.length), 10);
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

function loadSuccessfulMigrations(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/);
  const migrations = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.status === 'success' && entry.product_image_id && entry.new_image_url) {
        migrations.set(entry.product_image_id, {
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  
  if (!options.confirm && !options.dryRun) {
    console.error('ERROR: You must specify either --dry-run or --confirm');
    process.exitCode = 1;
    return;
  }

  loadEnvFile(options.envFile);

  const supabaseCredentials = resolveSupabaseCredentials();
  const supabase = createClient(supabaseCredentials.url, supabaseCredentials.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('R2 Database Cutover');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log('');

  // Load successful migrations from manifest
  const migrations = loadSuccessfulMigrations(options.manifestPath);
  console.log(`Found ${migrations.size} successful migrations in manifest`);
  console.log('');

  if (migrations.size === 0) {
    console.log('No successful migrations found. Run the migration script first.');
    return;
  }

  // Show sample of what will be updated
  const sampleSize = Math.min(5, migrations.size);
  const samples = Array.from(migrations.entries()).slice(0, sampleSize);
  
  console.log('Sample updates:');
  for (const [id, data] of samples) {
    console.log(`  ID ${id}:`);
    console.log(`    FROM: ${data.oldUrl}`);
    console.log(`    TO:   ${data.newUrl}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('✅ Dry run completed successfully.');
    console.log('');
    console.log('To perform the actual update, run:');
    console.log('  node scripts/r2-cutover-database.mjs --env-file .env.r2-migration --confirm');
    return;
  }

  // Actual update
  console.log('⚠️  Starting database update...');
  console.log('');

  let updated = 0;
  let failed = 0;
  const migrationArray = Array.from(migrations.entries());

  for (let i = 0; i < migrationArray.length; i += options.batchSize) {
    const batch = migrationArray.slice(i, i + options.batchSize);
    
    for (const [productImageId, data] of batch) {
      try {
        const { error } = await supabase
          .from('product_images')
          .update({
            image_url: data.newUrl,
            image_provider: 'r2',
            provider_file_path: data.r2Key,
            migrated_at: new Date().toISOString(),
          })
          .eq('id', productImageId);

        if (error) {
          console.error(`  [fail] ID ${productImageId}: ${error.message}`);
          failed += 1;
        } else {
          updated += 1;
          if (updated % 50 === 0) {
            console.log(`  Updated ${updated} / ${migrations.size} rows...`);
          }
        }
      } catch (error) {
        console.error(`  [fail] ID ${productImageId}: ${error instanceof Error ? error.message : String(error)}`);
        failed += 1;
      }
    }
  }

  console.log('');
  console.log('Cutover Summary:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('✅ Database cutover completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify images are loading correctly on the website');
    console.log('  2. Monitor for 7-14 days');
    console.log('  3. Keep ImageKit subscription active as backup');
    console.log('  4. After monitoring period, cancel ImageKit');
  } else {
    console.log('⚠️  Some updates failed. Review errors above.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Cutover failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
