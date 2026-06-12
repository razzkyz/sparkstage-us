#!/usr/bin/env node
/**
 * Create Dressing Room Admin Account
 * 
 * Usage: node scripts/create-dressing-room-admin.js
 * 
 * Requires environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Make sure your .env file has:')
  console.error('  SUPABASE_URL=https://...')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createDressingRoomAdmin() {
  const email = 'dress@gmail.com'
  const password = 'pin832295'
  const role = 'dressing_room_admin'

  console.log('📝 Creating dressing room admin account...')
  console.log(`   Email: ${email}`)
  console.log(`   Role: ${role}`)
  console.log('')

  try {
    // Step 1: Create auth user
    console.log('1️⃣  Creating authentication user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError || !authData?.user) {
      console.error('❌ Failed to create auth user:', authError?.message || 'Unknown error')
      return
    }

    const userId = authData.user.id
    console.log(`✅ Auth user created: ${userId}`)
    console.log('')

    // Step 2: Assign role
    console.log('2️⃣  Assigning dressing_room_admin role...')
    const { error: roleError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: userId,
        role_name: role,
      })

    if (roleError) {
      console.error('❌ Failed to assign role:', roleError.message)
      return
    }
    console.log(`✅ Role assigned: ${role}`)
    console.log('')

    // Step 3: Create/verify profile
    console.log('3️⃣  Creating user profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: 'Dressing Room Admin',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('⚠️  Warning - Failed to create profile:', profileError.message)
      // Don't fail the whole operation if profile creation has issues
    } else {
      console.log('✅ Profile created/updated')
    }
    console.log('')

    // Step 4: Summary
    console.log('🎉 Success! Dressing room admin account created')
    console.log('')
    console.log('Account Details:')
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Role: ${role}`)
    console.log(`  User ID: ${userId}`)
    console.log('')
    console.log('✨ The user can now log in at https://sparkstage.com/login')
    console.log('   After login, they will be redirected to /admin/dressing-room-dashboard')

  } catch (error) {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

createDressingRoomAdmin()
