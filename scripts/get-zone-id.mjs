#!/usr/bin/env node
/* eslint-disable */

/**
 * Get Cloudflare Zone ID for a domain
 * 
 * Usage:
 *   node scripts/get-zone-id.mjs sparkstage55.com
 */

import { execFileSync } from 'node:child_process';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: node scripts/get-zone-id.mjs <domain>\n');
    console.log('Example:');
    console.log('  node scripts/get-zone-id.mjs sparkstage55.com\n');
    process.exit(1);
  }
  
  const domain = args[0];
  
  console.log(`🔍 Getting Zone ID for: ${domain}\n`);
  
  try {
    // Use wrangler to list zones
    const result = execFileSync('wrangler', ['zone', 'list'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log('✅ Zones found:\n');
    console.log(result);
    
    // Try to extract zone ID for specific domain
    const lines = result.split('\n');
    for (const line of lines) {
      if (line.includes(domain)) {
        console.log(`\n🎯 Found zone for ${domain}:`);
        console.log(line);
        
        // Try to extract ID (usually first column)
        const match = line.match(/([a-f0-9]{32})/);
        if (match) {
          console.log(`\n✅ Zone ID: ${match[1]}\n`);
          console.log('📝 Save this for connecting custom domain to R2!\n');
        }
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting zones:', error.message);
    console.log('\n💡 Alternative: Get Zone ID from Cloudflare Dashboard:');
    console.log('   1. Go to: https://dash.cloudflare.com');
    console.log(`   2. Click on domain: ${domain}`);
    console.log('   3. Scroll down right sidebar, find "Zone ID"');
    console.log('   4. Copy the ID\n');
    process.exit(1);
  }
}

main();
