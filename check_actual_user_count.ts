import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserCounts() {
  try {
    console.log('Checking actual user counts in database...\n');

    // 1. Count from auth.users via RPC (simulates what dashboard uses)
    const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_all_users_for_admin');
    if (!rpcError) {
      console.log(`✓ Users via get_all_users_for_admin RPC: ${rpcUsers?.length || 0}`);
    } else {
      console.log(`✗ RPC Error: ${rpcError.message}`);
    }

    // 2. Count from profiles table
    const { data: profiles, error: profilesError, count: profilesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (!profilesError) {
      console.log(`✓ Profiles (registered users): ${profilesCount}`);
    } else {
      console.log(`✗ Error fetching profiles: ${profilesError.message}`);
    }

    // 3. Count from customer_loyalty_points
    const { count: loyaltyCount, error: loyaltyError } = await supabase
      .from('customer_loyalty_points')
      .select('*', { count: 'exact', head: true });

    if (!loyaltyError) {
      console.log(`✓ Users in loyalty_points table: ${loyaltyCount}`);
    } else {
      console.log(`✗ Error fetching loyalty points: ${loyaltyError.message}`);
    }

    // 4. Get email types distribution
    const { data: emailData, error: emailError } = await supabase.rpc('get_all_users_for_admin');
    if (!emailError && emailData) {
      const googleEmails = emailData.filter((u: any) => u.email?.includes('@googleusercontent')).length;
      const regularEmails = emailData.length - googleEmails;
      console.log(`\nEmail Distribution:`);
      console.log(`  - Regular emails: ${regularEmails}`);
      console.log(`  - Google OAuth emails: ${googleEmails}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserCounts();
