#!/usr/bin/env node
/**
 * Check which provider is used for public assets (banners, beauty, dressing room)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hogzjapnkvsihvvbgcdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZ3pqYXBua3ZzaWh2dmJnY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1NDcwODEsImV4cCI6MjA0NDEyMzA4MX0.JV6xdS_ot8tRuQYfCeTPM5HJYFj9bT7GvPcz1hfA8lI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('🔍 Checking public asset providers...\n');

  // 1. Banners
  console.log('1️⃣ Banners table:');
  const { data: banners } = await supabase
    .from('banners')
    .select('id, image_url, title_image_url');
  
  const bannerProviders = {
    supabase: 0,
    imagekit: 0,
    other: 0,
    total: 0,
  };

  banners?.forEach(b => {
    if (b.image_url) {
      bannerProviders.total++;
      if (b.image_url.includes('supabase.co')) bannerProviders.supabase++;
      else if (b.image_url.includes('imagekit.io')) bannerProviders.imagekit++;
      else bannerProviders.other++;
    }
    if (b.title_image_url) {
      bannerProviders.total++;
      if (b.title_image_url.includes('supabase.co')) bannerProviders.supabase++;
      else if (b.title_image_url.includes('imagekit.io')) bannerProviders.imagekit++;
      else bannerProviders.other++;
    }
  });

  console.log(`   Total URLs: ${bannerProviders.total}`);
  console.log(`   Supabase Storage: ${bannerProviders.supabase}`);
  console.log(`   ImageKit: ${bannerProviders.imagekit}`);
  console.log(`   Other: ${bannerProviders.other}`);
  if (banners && banners.length > 0) {
    console.log(`\n   Sample URLs:`);
    banners.slice(0, 2).forEach(b => {
      if (b.image_url) console.log(`     - ${b.image_url}`);
      if (b.title_image_url) console.log(`     - ${b.title_image_url}`);
    });
  }

  // 2. Beauty Posters
  console.log('\n2️⃣ Beauty Posters table:');
  const { data: beautyPosters } = await supabase
    .from('beauty_posters')
    .select('id, image_url');
  
  const beautyProviders = {
    supabase: 0,
    imagekit: 0,
    other: 0,
    total: beautyPosters?.length || 0,
  };

  beautyPosters?.forEach(p => {
    if (p.image_url) {
      if (p.image_url.includes('supabase.co')) beautyProviders.supabase++;
      else if (p.image_url.includes('imagekit.io')) beautyProviders.imagekit++;
      else beautyProviders.other++;
    }
  });

  console.log(`   Total: ${beautyProviders.total}`);
  console.log(`   Supabase Storage: ${beautyProviders.supabase}`);
  console.log(`   ImageKit: ${beautyProviders.imagekit}`);
  console.log(`   Other: ${beautyProviders.other}`);
  if (beautyPosters && beautyPosters.length > 0) {
    console.log(`\n   Sample URLs:`);
    beautyPosters.slice(0, 2).forEach(p => {
      console.log(`     - ${p.image_url}`);
    });
  }

  // 3. Glam Page Settings
  console.log('\n3️⃣ Glam Page Settings table:');
  const { data: glamPages } = await supabase
    .from('glam_page_settings')
    .select('id, hero_image_url, look_model_image_url, look_star_links');
  
  const glamProviders = {
    supabase: 0,
    imagekit: 0,
    other: 0,
    total: 0,
  };

  glamPages?.forEach(g => {
    if (g.hero_image_url) {
      glamProviders.total++;
      if (g.hero_image_url.includes('supabase.co')) glamProviders.supabase++;
      else if (g.hero_image_url.includes('imagekit.io')) glamProviders.imagekit++;
      else glamProviders.other++;
    }
    if (g.look_model_image_url) {
      glamProviders.total++;
      if (g.look_model_image_url.includes('supabase.co')) glamProviders.supabase++;
      else if (g.look_model_image_url.includes('imagekit.io')) glamProviders.imagekit++;
      else glamProviders.other++;
    }
  });

  console.log(`   Total URLs: ${glamProviders.total}`);
  console.log(`   Supabase Storage: ${glamProviders.supabase}`);
  console.log(`   ImageKit: ${glamProviders.imagekit}`);
  console.log(`   Other: ${glamProviders.other}`);
  if (glamPages && glamPages.length > 0) {
    console.log(`\n   Sample URLs:`);
    glamPages.slice(0, 1).forEach(g => {
      if (g.hero_image_url) console.log(`     - hero: ${g.hero_image_url}`);
      if (g.look_model_image_url) console.log(`     - model: ${g.look_model_image_url}`);
    });
  }

  // 4. Dressing Room Photos
  console.log('\n4️⃣ Dressing Room Look Photos table:');
  const { data: dressingRoom } = await supabase
    .from('dressing_room_look_photos')
    .select('id, image_url');
  
  const dressingProviders = {
    supabase: 0,
    imagekit: 0,
    other: 0,
    total: dressingRoom?.length || 0,
  };

  dressingRoom?.forEach(d => {
    if (d.image_url) {
      if (d.image_url.includes('supabase.co')) dressingProviders.supabase++;
      else if (d.image_url.includes('imagekit.io')) dressingProviders.imagekit++;
      else dressingProviders.other++;
    }
  });

  console.log(`   Total: ${dressingProviders.total}`);
  console.log(`   Supabase Storage: ${dressingProviders.supabase}`);
  console.log(`   ImageKit: ${dressingProviders.imagekit}`);
  console.log(`   Other: ${dressingProviders.other}`);
  if (dressingRoom && dressingRoom.length > 0) {
    console.log(`\n   Sample URLs:`);
    dressingRoom.slice(0, 2).forEach(d => {
      console.log(`     - ${d.image_url}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  const totalSupabase = bannerProviders.supabase + beautyProviders.supabase + glamProviders.supabase + dressingProviders.supabase;
  const totalImageKit = bannerProviders.imagekit + beautyProviders.imagekit + glamProviders.imagekit + dressingProviders.imagekit;
  const totalOther = bannerProviders.other + beautyProviders.other + glamProviders.other + dressingProviders.other;
  const grandTotal = totalSupabase + totalImageKit + totalOther;

  console.log(`Total public asset URLs: ${grandTotal}`);
  console.log(`  Supabase Storage: ${totalSupabase} (${((totalSupabase/grandTotal)*100).toFixed(1)}%)`);
  console.log(`  ImageKit: ${totalImageKit} (${((totalImageKit/grandTotal)*100).toFixed(1)}%)`);
  console.log(`  Other: ${totalOther}`);
  console.log('='.repeat(80));

  if (totalImageKit === 0 && totalSupabase > 0) {
    console.log('\n💡 FINDING: Public assets are still using Supabase Storage!');
    console.log('   This means the ImageKit /public/ folder is either:');
    console.log('   1. Mirror/backup of Supabase Storage (not used by app)');
    console.log('   2. Legacy files from previous migration attempt');
    console.log('   3. Test/staging files');
    console.log('\n   RECOMMENDATION: Skip /public/ folder migration for now.');
    console.log('   Focus on product images only (already migrated to R2).');
  } else if (totalImageKit > 0) {
    console.log('\n✅ Public assets ARE using ImageKit - migration needed!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
