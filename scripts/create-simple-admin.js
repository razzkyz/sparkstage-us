#!/usr/bin/env node

/**
 * Create Simple Admin User with easy password
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const US_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const US_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnpraHV1bGJhenRvbG50dGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NTY0MywiZXhwIjoyMDk2ODcxNjQzfQ.p0cZ9p6zzjnOksb7Zvp-jJ5u0DoNXWZPIgDnVIX5apI';

const supabase = createClient(US_SUPABASE_URL, US_SERVICE_KEY);

async function createSimpleAdmin() {
  console.log('👤 Creating Simple Admin User...\n');

  const email = 'admin@test.com';
  const password = 'password123'; // Simple password untuk testing
  const fullName = 'Test Admin';

  try {
    // Check if user exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const userExists = existing?.users?.find(u => u.email === email);
    
    if (userExists) {
      console.log('ℹ️  User already exists, updating password...');
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userExists.id,
        { password: password }
      );
      
      if (updateError) {
        console.error('❌ Error updating password:', updateError);
        return;
      }
      
      console.log('✅ Password updated!');
      console.log('\n' + '='.repeat(60));
      console.log('📧 Email:    ', email);
      console.log('🔑 Password: ', password);
      console.log('🌐 Login at: http://localhost:5174/login');
      console.log('='.repeat(60));
      return;
    }

    // Create new user
    console.log('📧 Creating auth user:', email);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error('❌ Error creating user:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create profile
    await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: fullName
    });

    // Assign admin role
    await supabase.from('user_role_assignments').insert({
      user_id: authData.user.id,
      role: 'admin'
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Admin User Created!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📧 Email:    ', email);
    console.log('🔑 Password: ', password);
    console.log('');
    console.log('🌐 Login at: http://localhost:5174/login');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSimpleAdmin();
