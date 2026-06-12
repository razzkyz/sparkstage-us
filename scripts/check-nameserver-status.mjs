#!/usr/bin/env node
/* eslint-disable */

/**
 * Check nameserver propagation status
 * 
 * Usage:
 *   node scripts/check-nameserver-status.mjs sparkstage55.com
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function checkNameservers(domain) {
  console.log(`🔍 Checking nameservers for: ${domain}\n`);
  
  try {
    const { stdout } = await execAsync(`nslookup -type=NS ${domain}`);
    console.log('📋 Current Nameservers:\n');
    console.log(stdout);
    
    const isCloudflare = stdout.includes('cloudflare.com');
    const isDomainesia = stdout.includes('domainesia.com');
    
    console.log('\n📊 Status:\n');
    
    if (isCloudflare && !isDomainesia) {
      console.log('✅ SUCCESS! Domain now uses Cloudflare nameservers!');
      console.log('   Domain is ready for R2 custom domain setup.\n');
      return true;
    } else if (isDomainesia && !isCloudflare) {
      console.log('⏳ PENDING: Domain still uses Domainesia nameservers.');
      console.log('   Changes not propagated yet. Wait 10-30 minutes and try again.\n');
      return false;
    } else if (isCloudflare && isDomainesia) {
      console.log('🔄 PROPAGATING: Both nameservers detected (transition period).');
      console.log('   DNS is updating. Wait 10-30 minutes.\n');
      return false;
    } else {
      console.log('❓ UNKNOWN: Could not determine nameserver status.\n');
      return false;
    }
    
  } catch (error) {
    console.log('❌ DNS lookup failed:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: node scripts/check-nameserver-status.mjs <domain>\n');
    console.log('Example:');
    console.log('  node scripts/check-nameserver-status.mjs sparkstage55.com\n');
    process.exit(1);
  }
  
  const domain = args[0];
  
  console.log('🌐 Nameserver Status Check\n');
  console.log('================================\n');
  
  const ready = await checkNameservers(domain);
  
  console.log('================================\n');
  
  if (ready) {
    console.log('🎯 Next Steps:\n');
    console.log('   1. Go to Cloudflare Dashboard');
    console.log('   2. Verify domain status is "Active"');
    console.log('   3. Run: node scripts/connect-r2-custom-domain.mjs\n');
    process.exit(0);
  } else {
    console.log('⏰ Please wait and check again in 10-30 minutes.\n');
    console.log('💡 You can run this script periodically:');
    console.log(`   node scripts/check-nameserver-status.mjs ${domain}\n`);
    process.exit(1);
  }
}

main();
