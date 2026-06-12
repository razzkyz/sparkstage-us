#!/usr/bin/env node
/**
 * Setup Dress Admin Role - Simple Version (like Kasir)
 * 
 * Usage: 
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-dress-admin-simple.js
 * 
 * This script:
 * 1. Finds or creates dress@gmail.com user
 * 2. Assigns dressing_room_admin role
 * 3. Shows login instructions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('');
  console.error('Usage:');
  console.error('  SUPABASE_URL=https://xxx.supabase.co \\');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=xxx \\');
  console.error('  node scripts/setup-dress-admin-simple.js');
  console.error('');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const email = 'dress@gmail.com';
  const role = 'dressing_room_admin';

  console.log('🔧 Setting up Dress Admin...\n');

  try {
    // Step 1: Find or create user
    console.log(`📧 Checking user: ${email}`);
    
    let userId;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const user = existingUsers?.users?.find(u => u.email === email);
    
    if (user) {
      userId = user.id;
      console.log(`✅ User found: ${userId}\n`);
    } else {
      console.log('❌ User not found in auth.users');
      console.log('');
      console.log('✋ STOP! Buat user dulu via Supabase Dashboard:');
      console.log('   1. Login: https://supabase.com/dashboard');
      console.log('   2. Go to: Authentication → Users');
      console.log(`   3. Click: "+ Add user"`);
      console.log(`   4. Email: ${email}`);
      console.log('   5. Set password');
      console.log('   6. Create user');
      console.log('');
      console.log('Setelah user di-create, jalankan script ini lagi.\n');
      process.exit(1);
    }

    // Step 2: Check current role
    console.log(`🔐 Checking role assignments...`);
    const { data: roles } = await supabase
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', userId);

    const hasRole = roles?.some(r => r.role_name === role);
    
    if (hasRole) {
      console.log(`✅ User already has role: ${role}\n`);
    } else {
      // Step 3: Assign role
      console.log(`📝 Assigning role: ${role}`);
      
      const { error } = await supabase
        .from('user_role_assignments')
        .insert({ user_id: userId, role_name: role });

      if (error) {
        console.error(`❌ Failed to assign role: ${error.message}\n`);
        process.exit(1);
      }
      console.log(`✅ Role assigned!\n`);
    }

    // Step 4: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 User Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   User ID: ${userId}`);
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Go to login: https://sparkstage.com/login');
    console.log(`   2. Email: ${email}`);
    console.log('   3. Password: [your password]');
    console.log('   4. After login → Dressing Room menu should appear');
    console.log('   5. Can now edit dressing room data without forbidden error');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
