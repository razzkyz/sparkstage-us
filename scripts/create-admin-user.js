#!/usr/bin/env node

/**
 * Create Admin User in US Database
 * 
 * This script creates an admin user for accessing the admin dashboard
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnpraHV1bGJhenRvbG50dGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NTY0MywiZXhwIjoyMDk2ODcxNjQzfQ.p0cZ9p6zzjnOksb7Zvp-jJ5u0DoNXWZPIgDnVIX5apI';

const supabase = createClient(US_SUPABASE_URL, US_SERVICE_KEY);

async function createAdminUser() {
  console.log('👤 Creating Admin User...\n');

  const email = 'admin@sparkstage.us';
  const password = 'Admin123!'; // Change this after first login!
  const fullName = 'Admin User';

  try {
    // 1. Create auth user
    console.log('📧 Creating auth user:', email);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error('❌ Error creating user:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // 2. Create profile
    console.log('\n👤 Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        phone: null,
        avatar_url: null
      });

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
    } else {
      console.log('✅ Profile created');
    }

    // 3. Assign admin role
    console.log('\n🔐 Assigning admin role...');
    const { error: roleError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: authData.user.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('❌ Error assigning role:', roleError);
    } else {
      console.log('✅ Admin role assigned');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Admin User Created Successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📧 Email:    ', email);
    console.log('🔑 Password: ', password);
    console.log('👤 User ID:  ', authData.user.id);
    console.log('');
    console.log('🌐 Login at: http://localhost:5174/login');
    console.log('');
    console.log('⚠️  IMPORTANT: Change password after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createAdminUser();
