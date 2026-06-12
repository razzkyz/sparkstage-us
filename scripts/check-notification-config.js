#!/usr/bin/env node

/**
 * Check notification configuration and test URLs
 * This helps debug why notifications might be using localhost
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  log('\n' + '═'.repeat(70), 'cyan');
  log(title, 'bold');
  log('═'.repeat(70), 'cyan');
}

function findInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = [];

    patterns.forEach(({ name, regex }) => {
      const matches = content.match(regex);
      if (matches) {
        results.push({
          name,
          value: matches[1]?.trim(),
          found: true,
        });
      }
    });

    return results;
  } catch (error) {
    return [];
  }
}

function analyzeNotificationCode() {
  section('🔍 Analyzing Notification Code');

  const files = [
    {
      path: 'supabase/functions/_shared/payment-effects.ts',
      name: 'Payment Effects (WhatsApp)',
    },
    {
      path: 'supabase/functions/_shared/env.ts',
      name: 'Environment Helper',
    },
    {
      path: 'supabase/functions/_shared/fonnte.ts',
      name: 'Fonnte/WhatsApp',
    },
  ];

  const patterns = [
    { name: 'PUBLIC_APP_URL', regex: /PUBLIC_APP_URL|getPublicAppUrl/g },
    { name: 'localhost', regex: /localhost|127\.0\.0\.1/g },
    { name: 'WhatsApp', regex: /sendWhatsApp|whatsapp/gi },
  ];

  files.forEach(({ path: filePath, name }) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const hasLocalhost = /localhost|127\.0\.0\.1/i.test(content);
      const hasPublicUrl = /PUBLIC_APP_URL|getPublicAppUrl/i.test(content);
      const hasWhatsApp = /whatsapp/i.test(content);

      log(`\n📄 ${name}:`, 'blue');
      if (hasPublicUrl) {
        log('   ✅ Uses PUBLIC_APP_URL helper', 'green');
      }
      if (hasWhatsApp) {
        log('   ✅ Handles WhatsApp notifications', 'green');
      }
      if (hasLocalhost) {
        log('   ⚠️  Contains localhost references (might be for development only)', 'yellow');
      }
    }
  });
}

function checkEnvVariables() {
  section('🔐 Environment Variables in Supabase');

  log('\nThese variables should be set in Supabase Project Settings:', 'blue');
  log('(Project → Settings → Environment)\n', 'yellow');

  const requiredVars = [
    {
      name: 'PUBLIC_APP_URL',
      example: 'https://sparkstage.co',
      description: 'Production domain for notification callbacks',
      production: true,
    },
    {
      name: 'SITE_URL',
      example: 'https://sparkstage.co',
      description: 'Supabase site URL (should match PUBLIC_APP_URL)',
      production: true,
    },
    {
      name: 'DOKU_WHATSAPP_PRODUCTION',
      example: 'true',
      description: 'Use production DOKU API or sandbox',
      production: true,
    },
    {
      name: 'DOKU_WHATSAPP_CLIENT_ID',
      example: 'your_client_id',
      description: 'DOKU WhatsApp client ID',
      production: false,
    },
    {
      name: 'DOKU_WHATSAPP_SECRET_KEY',
      example: '(hidden)',
      description: 'DOKU WhatsApp secret key',
      production: false,
    },
  ];

  requiredVars.forEach((variable) => {
    const icon = variable.production ? '🔴' : '🟡';
    log(`${icon} ${variable.name}`, 'blue');
    log(`   Example: ${variable.example}`, 'green');
    log(`   Purpose: ${variable.description}\n`, 'yellow');
  });
}

function showFixSteps() {
  section('✅ Steps to Fix Localhost Issue in Notifications');

  const steps = [
    {
      num: 1,
      title: 'Identify your production domain',
      details: 'What is your production URL? (e.g., https://sparkstage.co)',
    },
    {
      num: 2,
      title: 'Update Supabase Environment Variables',
      details: [
        'Go to Supabase Dashboard',
        'Select your project',
        'Go to Settings → Environment',
        'Set or update these values:',
        '  • PUBLIC_APP_URL = https://your-domain.com',
        '  • SITE_URL = https://your-domain.com',
        '  • Ensure it uses HTTPS (required for DOKU)',
      ],
    },
    {
      num: 3,
      title: 'Verify DOKU Configuration',
      details: [
        'Make sure DOKU WhatsApp environment is correct:',
        '  • DOKU_WHATSAPP_CLIENT_ID is set',
        '  • DOKU_WHATSAPP_SECRET_KEY is set',
        '  • DOKU_WHATSAPP_PRODUCTION = true (for live)',
      ],
    },
    {
      num: 4,
      title: 'Redeploy or Restart',
      details: [
        'Local: npm run supabase:functions:serve',
        'Production: Redeploy your functions or wait for cache refresh',
      ],
    },
    {
      num: 5,
      title: 'Test',
      details: [
        'Cancel a ticket order and check:',
        '  • No error on cancel button',
        '  • Order status changes to "cancelled"',
        '  • WhatsApp notification sent with correct URLs',
      ],
    },
  ];

  steps.forEach(({ num, title, details }) => {
    log(`\n${num}. ${title}`, 'blue');
    if (typeof details === 'string') {
      log(`   ${details}`, 'yellow');
    } else {
      details.forEach((detail) => {
        log(`   ${detail}`, 'yellow');
      });
    }
  });
}

function showCommonIssues() {
  section('⚠️  Common Issues & Solutions');

  const issues = [
    {
      issue: 'Notifications using localhost in production',
      cause:
        'PUBLIC_APP_URL not set or still points to http://localhost:5173',
      solution: 'Update PUBLIC_APP_URL in Supabase Environment variables',
    },
    {
      issue: 'DOKU payment fails with localhost error',
      cause: 'DOKU production mode rejects localhost origins',
      solution:
        'Set DOKU_PAYMENT_MODE=sandbox or fix production domain and HTTPS',
    },
    {
      issue: 'WhatsApp notifications not sending',
      cause: 'DOKU_WHATSAPP_* credentials missing or DOKU_WHATSAPP_PRODUCTION wrong',
      solution:
        'Verify all DOKU WhatsApp environment variables are set correctly',
    },
    {
      issue: 'Cancel order returns 500 error',
      cause: 'Could be related to notification service failing',
      solution: 'Check Supabase function logs for actual error message',
    },
  ];

  issues.forEach(({ issue, cause, solution }) => {
    log(`\n❌ Issue: ${issue}`, 'red');
    log(`   Cause: ${cause}`, 'yellow');
    log(`   Solution: ${solution}`, 'green');
  });
}

function showVerificationCommand() {
  section('🧪 Manual Verification Command');

  log('\nRun this to check your app URL in notifications:\n', 'blue');
  log('  npm run supabase:functions:serve\n', 'cyan');
  log(
    'Then check browser console when testing cancel order.',
    'yellow'
  );
  log(
    'Look for logs with "[sendTicketNotifications]" to see actual URLs being used.',
    'yellow'
  );
}

function main() {
  log('\n', 'reset');
  log(
    '╔══════════════════════════════════════════════════════════════════╗',
    'cyan'
  );
  log(
    '║     Spark Stage - Notification URL Configuration Checker        ║',
    'cyan'
  );
  log(
    '╚══════════════════════════════════════════════════════════════════╝',
    'cyan'
  );

  analyzeNotificationCode();
  checkEnvVariables();
  showFixSteps();
  showCommonIssues();
  showVerificationCommand();

  log('\n');
  log('For more details, see: docs/runbooks/WHATSAPP_README.md', 'green');
  log('', 'reset');
}

main();
