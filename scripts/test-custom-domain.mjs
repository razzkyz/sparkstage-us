#!/usr/bin/env node
/* eslint-disable */

/**
 * Test custom domain DNS and R2 accessibility
 * 
 * Usage:
 *   node scripts/test-custom-domain.mjs cdn.yourdomain.com
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import https from 'node:https';

const execAsync = promisify(exec);

async function checkDNS(domain) {
  console.log(`🔍 Checking DNS for: ${domain}\n`);
  
  try {
    const { stdout } = await execAsync(`nslookup ${domain}`);
    console.log('✅ DNS Lookup Result:');
    console.log(stdout);
    
    // Check if CNAME points to R2
    if (stdout.includes('r2.cloudflarestorage.com')) {
      console.log('✅ CNAME correctly points to R2 storage!\n');
      return true;
    } else if (stdout.includes('cloudflare')) {
      console.log('⚠️  Points to Cloudflare but not R2 storage endpoint\n');
      return false;
    } else {
      console.log('❌ CNAME does not point to R2 storage\n');
      return false;
    }
  } catch (error) {
    console.log('❌ DNS lookup failed:');
    console.log(error.message);
    console.log('\n💡 This means DNS record not propagated yet or domain not configured.\n');
    return false;
  }
}

async function testHTTPS(url) {
  return new Promise((resolve) => {
    console.log(`🌐 Testing HTTPS access: ${url}\n`);
    
    const req = https.get(url, { timeout: 10000 }, (res) => {
      console.log(`✅ HTTP Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      console.log(`   Content-Length: ${res.headers['content-length']}`);
      console.log(`   Server: ${res.headers['server'] || 'N/A'}\n`);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS! URL is accessible!\n');
        resolve(true);
      } else if (res.statusCode === 403) {
        console.log('❌ 403 Forbidden - Check R2 bucket public access\n');
        resolve(false);
      } else if (res.statusCode === 404) {
        console.log('❌ 404 Not Found - File does not exist in R2\n');
        resolve(false);
      } else {
        console.log(`⚠️  Unexpected status code: ${res.statusCode}\n`);
        resolve(false);
      }
      
      // Consume response to free up socket
      res.resume();
    });
    
    req.on('error', (error) => {
      console.log('❌ HTTPS request failed:');
      console.log(`   ${error.message}\n`);
      
      if (error.code === 'ENOTFOUND') {
        console.log('💡 DNS not resolved. Wait a few minutes and try again.\n');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('💡 Connection refused. Check domain configuration.\n');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('💡 Connection timeout. DNS might be wrong or firewall blocking.\n');
      }
      
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ Request timeout (10s)\n');
      resolve(false);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: node scripts/test-custom-domain.mjs <domain>\n');
    console.log('Example:');
    console.log('  node scripts/test-custom-domain.mjs cdn.sparkstage.com\n');
    process.exit(1);
  }
  
  const domain = args[0];
  const testPath = 'products/38/80d25736-aa02-44cd-9d06-c026040e89f8.png';
  const testUrl = `https://${domain}/${testPath}`;
  
  console.log('🧪 Custom Domain Test\n');
  console.log('================================\n');
  console.log(`Domain: ${domain}`);
  console.log(`Test File: ${testPath}\n`);
  console.log('================================\n');
  
  // Step 1: Check DNS
  const dnsOk = await checkDNS(domain);
  
  if (!dnsOk) {
    console.log('⏸️  Cannot proceed with HTTPS test - DNS not configured correctly\n');
    console.log('🔧 What to check:');
    console.log('   1. DNS record created at domain registrar?');
    console.log('   2. CNAME points to: sparkstage-public-assets.r2.cloudflarestorage.com');
    console.log('   3. Wait 5-10 minutes for DNS propagation\n');
    console.log('💡 Try running this script again in 5 minutes.\n');
    process.exit(1);
  }
  
  // Step 2: Test HTTPS
  const httpsOk = await testHTTPS(testUrl);
  
  // Summary
  console.log('================================\n');
  console.log('📊 Test Summary\n');
  console.log(`DNS Configuration: ${dnsOk ? '✅ OK' : '❌ FAIL'}`);
  console.log(`HTTPS Access:      ${httpsOk ? '✅ OK' : '❌ FAIL'}\n`);
  
  if (dnsOk && httpsOk) {
    console.log('🎉 SUCCESS! Custom domain is working!\n');
    console.log('🎯 Next steps:');
    console.log(`   1. Update .env.r2-migration:`);
    console.log(`      R2_PUBLIC_BASE_URL=https://${domain}`);
    console.log('   2. Run verification:');
    console.log('      node scripts/verify-r2-urls.mjs --manifest backups\\r2-migration-manifest-retry.jsonl --sample-size 10');
    console.log('   3. Proceed with database cutover\n');
    process.exit(0);
  } else {
    console.log('⚠️  Custom domain not ready yet\n');
    console.log('💡 Common issues:');
    console.log('   - DNS propagation delay (wait 5-10 minutes)');
    console.log('   - Wrong CNAME target');
    console.log('   - R2 bucket public access not enabled');
    console.log('   - Firewall blocking access\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
