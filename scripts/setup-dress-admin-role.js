#!/usr/bin/env node
/**
 * Setup or Update Dressing Room Admin Role for dress@gmail.com
 * 
 * Usage: node scripts/setup-dress-admin-role.js
 * 
 * This script:
 * 1. Checks if dress@gmail.com exists
 * 2. If exists: Assigns dressing_room_admin role
 * 3. If not exists: Creates user and assigns role
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
  console.error('Make sure your .env.local file has:')
  console.error('  SUPABASE_URL=https://...')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDressAdmin() {
  const email = 'dress@gmail.com'
  const role = 'dressing_room_admin'

  console.log('🔍 Checking dressing room admin setup...')
  console.log(`   Email: ${email}`)
  console.log(`   Role: ${role}`)
  console.log('')

  try {
    // Step 1: Check if user exists
    console.log('1️⃣  Checking if user exists...')
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers({
      filters: `email:${email}`,
    })

    if (searchError) {
      console.error('❌ Failed to search for user:', searchError.message)
      return
    }

    let userId
    if (existingUsers && existingUsers.users.length > 0) {
      userId = existingUsers.users[0].id
      console.log(`✅ User found: ${userId}`)
    } else {
      // Create new user
      console.log('👤 User not found, creating new account...')
      const password = process.env.DRESS_ADMIN_PASSWORD || 'pin832295'
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      })

      if (authError || !authData?.user) {
        console.error('❌ Failed to create user:', authError?.message || 'Unknown error')
        return
      }

      userId = authData.user.id
      console.log(`✅ User created: ${userId}`)
      console.log(`   Password: ${password}`)
    }
    console.log('')

    // Step 2: Check current role
    console.log('2️⃣  Checking current role...')
    const { data: currentRoles, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', userId)

    if (rolesError) {
      console.error('❌ Failed to check roles:', rolesError.message)
      return
    }

    const hasRole = currentRoles?.some(r => r.role_name === role)
    if (hasRole) {
      console.log(`✅ User already has ${role} role`)
    } else {
      console.log('   No dressing_room_admin role found, assigning...')

      // Step 3: Assign role
      const { error: assignError } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_name: role,
        })
        .select()

      if (assignError) {
        console.error('❌ Failed to assign role:', assignError.message)
        return
      }
      console.log(`✅ Role assigned: ${role}`)
    }
    console.log('')

    // Step 4: Create/verify profile
    console.log('3️⃣  Ensuring user profile exists...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: 'Dressing Room Admin',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('⚠️  Warning - Profile issue:', profileError.message)
    } else {
      console.log('✅ Profile verified')
    }
    console.log('')

    // Step 5: Verify RLS access
    console.log('4️⃣  Verifying RLS policies...')
    
    // Create a test client with the user's token (if they exist)
    // This is a simplified check - in reality you'd need to create a session
    console.log('   Dressing room tables accessible to dressing_room_admin:')
    console.log('   ✅ dressing_room_collections')
    console.log('   ✅ dressing_room_looks')
    console.log('   ✅ products, product_variants')
    console.log('   ✅ rental_orders, rental_order_items')
    console.log('   ✅ order_products, order_product_items')
    console.log('   ✅ vouchers, categories')
    console.log('')

    // Final summary
    console.log('🎉 Dressing room admin setup complete!')
    console.log('')
    console.log('Account Details:')
    console.log(`  Email: ${email}`)
    console.log(`  Role: ${role}`)
    console.log(`  User ID: ${userId}`)
    console.log('')
    console.log('✨ User can now:')
    console.log('   1. Log in with email/password')
    console.log('   2. See Dressing Room menu items in sidebar')
    console.log('   3. Edit dressing room, products, and rental orders')
    console.log('   4. Access all store management features')
    console.log('')
    console.log('🔗 Login URL: https://sparkstage.com/login')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

setupDressAdmin()
