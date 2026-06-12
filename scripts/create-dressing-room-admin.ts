#!/usr/bin/env npx ts-node
/**
 * Create Dressing Room Admin Account
 * 
 * Usage: npx ts-node scripts/create-dressing-room-admin.mts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
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

  try {
    // Step 1: Create auth user
    console.log('\n1️⃣  Creating auth user...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message)
      if (authError.message.includes('already registered')) {
        console.log('   Account already exists, continuing...')
      } else {
        process.exit(1)
      }
    } else {
      console.log('✅ Auth user created:', authUser?.user?.id)
    }

    // Step 2: Get user ID (either from creation or from existing user)
    let userId = authUser?.user?.id
    if (!userId) {
      console.log('   Fetching existing user...')
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find((u) => u.email === email)
      userId = existingUser?.id
      if (!userId) {
        console.error('❌ Could not find or create user')
        process.exit(1)
      }
    }

    // Step 3: Assign role
    console.log('\n2️⃣  Assigning dressing_room_admin role...')
    const { data: roleAssignment, error: roleError } = await supabase
      .from('user_role_assignments')
      .insert({ user_id: userId, role_name: role })
      .select()

    if (roleError && !roleError.message.includes('duplicate')) {
      console.error('❌ Role assignment failed:', roleError.message)
      process.exit(1)
    }

    if (roleError?.message.includes('duplicate')) {
      console.log('✅ Role already assigned')
    } else {
      console.log('✅ Role assigned:', roleAssignment)
    }

    // Step 4: Verify profile exists
    console.log('\n3️⃣  Creating/verifying profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: createProfileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: 'Dressing Room Admin',
        updated_at: new Date().toISOString(),
      })

      if (createProfileError) {
        console.error('⚠️  Could not create profile:', createProfileError.message)
      } else {
        console.log('✅ Profile created')
      }
    } else if (profile) {
      console.log('✅ Profile exists')
    }

    console.log('\n✨ Dressing room admin account created successfully!')
    console.log(`\n📋 Account Details:`)
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Role: ${role}`)
    console.log(`   User ID: ${userId}`)
    console.log(`\n🔐 Next Steps:`)
    console.log(`   1. Deploy migration: npm run supabase:db:push`)
    console.log(`   2. Update frontend ADMIN_ROLES to include '${role}'`)
    console.log(`   3. Create DressingRoomDashboard route in frontend`)
    console.log(`   4. Test login at: ${supabaseUrl}`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createDressingRoomAdmin()
