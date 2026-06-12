#!/usr/bin/env node

/**
 * Validate and display app URL configuration for notifications
 * Usage: node scripts/validate-app-url.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '═'.repeat(60), 'blue');
  log(title, 'bold');
  log('═'.repeat(60), 'blue');
}

function validateUrl(url, name = 'URL') {
  if (!url) {
    log(`❌ ${name} is missing`, 'red');
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      log(`❌ ${name} has invalid protocol: ${urlObj.protocol}`, 'red');
      return false;
    }

    // Warn if localhost in production context
    if (['localhost', '127.0.0.1'].includes(urlObj.hostname)) {
      log(`⚠️  ${name} is using localhost: ${url}`, 'yellow');
      log('   This is OK for local development but NOT for production!', 'yellow');
      return false;
    }

    // Warn if not HTTPS in production
    if (urlObj.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(urlObj.hostname)) {
      log(`⚠️  ${name} is using HTTP instead of HTTPS: ${url}`, 'yellow');
      log('   DOKU payment gateway requires HTTPS for production!', 'yellow');
      return false;
    }

    log(`✅ ${name} is valid: ${url}`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name} is not a valid URL: ${url}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvironmentFiles() {
  logSection('📋 Checking Environment Configuration Files');

  const filesToCheck = [
    { path: '.env.local', description: 'Local development env' },
    { path: '.env.production', description: 'Production env' },
    { path: 'frontend/.env.local', description: 'Frontend local env' },
    { path: 'frontend/.env.production', description: 'Frontend production env' },
  ];

  const appUrls = new Set();

  filesToCheck.forEach(({ path: filePath, description }) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Look for app URL patterns
      const patterns = [
        /VITE_PUBLIC_APP_URL\s*=\s*(.+)/i,
        /VITE_APP_URL\s*=\s*(.+)/i,
        /PUBLIC_APP_URL\s*=\s*(.+)/i,
        /APP_URL\s*=\s*(.+)/i,
      ];

      let found = false;
      patterns.forEach(pattern => {
        const match = content.match(pattern);
        if (match) {
          const url = match[1].trim();
          appUrls.add(url);
          log(`  📄 ${description} (${filePath}):`, 'blue');
          log(`     ${url}`, 'green');
          found = true;
        }
      });

      if (!found) {
        log(`  📄 ${description} (${filePath}): No app URL found`, 'yellow');
      }
    }
  });

  return appUrls;
}

function getProductionUrl() {
  // Try to detect from git remote or common patterns
  const commonDomains = [
    'sparkstage.co',
    'spark-stage.app',
    'sparkdoku.app',
    process.env.PRODUCTION_DOMAIN,
  ].filter(Boolean);

  logSection('🔍 Production URL Detection');
  log('Common production domains to check:', 'blue');
  commonDomains.forEach(domain => {
    log(`  • https://${domain}`, 'yellow');
  });

  return commonDomains[0] ? `https://${commonDomains[0]}` : null;
}

function showSupabaseInstructions() {
  logSection('🚀 How to Update Supabase PUBLIC_APP_URL');

  log('You need to set these in Supabase Project Settings:', 'blue');
  log('', 'reset');
  log('1. Go to Supabase Dashboard', 'bold');
  log('   → Your Project → Settings → Environment', 'yellow');
  log('', 'reset');
  log('2. Set or update these secrets:', 'bold');
  log('   • PUBLIC_APP_URL = https://your-production-domain.com', 'yellow');
  log('   • SITE_URL = https://your-production-domain.com', 'yellow');
  log('', 'reset');
  log('3. For DOKU WhatsApp notifications, ensure:', 'bold');
  log('   • DOKU_WHATSAPP_CLIENT_ID is set', 'yellow');
  log('   • DOKU_WHATSAPP_SECRET_KEY is set', 'yellow');
  log('   • DOKU_WHATSAPP_PRODUCTION = true (for live)', 'yellow');
  log('', 'reset');
  log('4. Restart functions:', 'bold');
  log('   npm run supabase:functions:serve', 'yellow');
}

function showValidationChecklist() {
  logSection('✓ Production Readiness Checklist');

  const checks = [
    {
      item: 'PUBLIC_APP_URL is set to production domain (not localhost)',
      command: 'Check Supabase Settings → Environment',
    },
    {
      item: 'SITE_URL matches PUBLIC_APP_URL',
      command: 'Verify in Supabase Settings',
    },
    {
      item: 'App uses HTTPS (required for DOKU payments)',
      command: 'Check that production domain uses SSL certificate',
    },
    {
      item: 'DOKU environment variables are configured',
      command: 'Check DOKU_WHATSAPP_* secrets are set',
    },
    {
      item: 'WhatsApp notifications will use correct callback URL',
      command: 'Test: npm run supabase:functions:serve',
    },
  ];

  checks.forEach((check, index) => {
    log(`${index + 1}. ${check.item}`, 'blue');
    log(`   → ${check.command}`, 'yellow');
  });
}

function main() {
  log('\n', 'reset');
  log('╔════════════════════════════════════════════════════════╗', 'blue');
  log('║     SPARK STAGE - App URL Validation & Fix Guide       ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  // Check environment files
  const appUrls = checkEnvironmentFiles();

  // Validate URLs
  logSection('🔐 URL Validation');
  
  const urlsToValidate = Array.from(appUrls);
  if (urlsToValidate.length === 0) {
    log('No app URLs found in environment files', 'yellow');
  } else {
    urlsToValidate.forEach((url, index) => {
      validateUrl(url, `App URL ${index + 1}`);
    });
  }

  // Suggest production URL
  const suggestedProdUrl = getProductionUrl();
  if (suggestedProdUrl) {
    log(`\n💡 Suggested production URL: ${suggestedProdUrl}`, 'green');
  }

  // Show instructions
  showSupabaseInstructions();

  // Show checklist
  showValidationChecklist();

  // Summary
  logSection('📌 Summary');
  log('To fix localhost issue in notifications:', 'bold');
  log('1. Go to Supabase Dashboard → Project Settings → Environment', 'yellow');
  log('2. Update PUBLIC_APP_URL to your production domain', 'yellow');
  log('3. Update SITE_URL to match', 'yellow');
  log('4. Verify DOKU WhatsApp secrets are configured', 'yellow');
  log('5. Restart edge functions (or redeploy)', 'yellow');
  log('', 'reset');
  log('After these changes, WhatsApp notifications will use correct URLs', 'green');
  log('', 'reset');
}

main();
