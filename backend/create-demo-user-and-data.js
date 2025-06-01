require('dotenv').config();
const express = require('express');
const { supabase, supabaseAdmin } = require('./src/config/supabase');

const createDemoUserAndData = async () => {
  try {
    console.log('🚀 Setting up demo user and test data...');

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available. Please set SUPABASE_SERVICE_KEY.');
    }

    // Step 1: Create demo user in Supabase Auth
    console.log('📝 Creating demo user in Supabase Auth...');
    
    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById('550e8400-e29b-41d4-a716-446655440000');
      
      if (existingUser.user) {
        console.log('✅ Demo user already exists in auth');
      } else {
        throw new Error('User not found'); // Trigger user creation
      }
    } catch (error) {
      // Create the demo user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'demo@influencerflow.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          name: 'Demo User',
          role: 'brand',
          company: 'InfluencerFlow Demo'
        }
      });

      if (createError) {
        throw new Error('Error creating demo user: ' + createError.message);
      }

      console.log('✅ Created demo user in Supabase auth');
    }

    // Step 2: Create test creators data
    console.log('📝 Adding test creators...');

    const testCreators = [
      {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        channel_name: 'Tech Reviewer Pro',
        youtube_channel_url: 'https://youtube.com/c/techreviewerpro',
        subscriber_count: '2.5M',
        categories: ['Technology', 'Reviews', 'Gadgets'],
        contact_email: 'contact@techreviewerpro.com',
        avatar_url: 'https://yt3.ggpht.com/a/default-user=s100-c-k-c0x00ffffff-no-rj',
        stats: {
          viewCount: '150M',
          videoCount: '500',
          typicalViews: '100K-500K',
          engagementRate: '4.2%',
          bio: 'Tech enthusiast reviewing the latest gadgets and technology trends.',
          dataSource: 'Demo Data'
        },
        notes: 'Great engagement with tech-savvy audience',
        tags: ['tech', 'reviews', 'premium'],
        status: 'active'
      },
      {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        channel_name: 'Lifestyle Guru',
        youtube_channel_url: 'https://youtube.com/c/lifestyleguru',
        instagram_url: 'https://instagram.com/lifestyleguru',
        subscriber_count: '1.8M',
        follower_count: '800K',
        categories: ['Lifestyle', 'Fashion', 'Travel'],
        contact_email: 'hello@lifestyleguru.com',
        avatar_url: 'https://yt3.ggpht.com/a/default-user=s100-c-k-c0x00ffffff-no-rj',
        stats: {
          viewCount: '80M',
          videoCount: '300',
          typicalViews: '50K-200K',
          engagementRate: '6.8%',
          bio: 'Sharing lifestyle tips, fashion trends, and travel adventures.',
          dataSource: 'Demo Data'
        },
        notes: 'High engagement, great for lifestyle brands',
        tags: ['lifestyle', 'fashion', 'travel'],
        status: 'active'
      },
      {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        channel_name: 'Gaming Central',
        youtube_channel_url: 'https://youtube.com/c/gamingcentral',
        tiktok_url: 'https://tiktok.com/@gamingcentral',
        subscriber_count: '3.2M',
        categories: ['Gaming', 'Entertainment', 'Esports'],
        contact_email: 'business@gamingcentral.com',
        avatar_url: 'https://yt3.ggpht.com/a/default-user=s100-c-k-c0x00ffffff-no-rj',
        stats: {
          viewCount: '200M',
          videoCount: '800',
          typicalViews: '200K-1M',
          engagementRate: '5.5%',
          bio: 'Gaming content creator covering the latest games and esports events.',
          dataSource: 'Demo Data'
        },
        notes: 'Perfect for gaming brand partnerships',
        tags: ['gaming', 'esports', 'entertainment'],
        status: 'active'
      },
      {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        channel_name: 'Fitness Motivation',
        youtube_channel_url: 'https://youtube.com/c/fitnessmotivation',
        instagram_url: 'https://instagram.com/fitnessmotivation',
        subscriber_count: '950K',
        follower_count: '1.2M',
        categories: ['Fitness', 'Health', 'Motivation'],
        contact_email: 'partnerships@fitnessmotivation.com',
        avatar_url: 'https://yt3.ggpht.com/a/default-user=s100-c-k-c0x00ffffff-no-rj',
        stats: {
          viewCount: '45M',
          videoCount: '250',
          typicalViews: '30K-150K',
          engagementRate: '7.2%',
          bio: 'Helping people achieve their fitness goals with workout routines and motivation.',
          dataSource: 'Demo Data'
        },
        notes: 'Great for health and fitness brand collaborations',
        tags: ['fitness', 'health', 'motivation'],
        status: 'active'
      }
    ];

    // Check if creators already exist
    const { data: existingCreators } = await supabaseAdmin
      .from('creators')
      .select('channel_name')
      .eq('user_id', '550e8400-e29b-41d4-a716-446655440000');

    if (existingCreators && existingCreators.length > 0) {
      console.log('⚠️ Test creators already exist. Skipping...');
      console.log('Existing creators:', existingCreators.map(c => c.channel_name));
      return {
        success: true,
        message: 'Demo user exists, creators already seeded',
        data: { existingCreators: existingCreators.length }
      };
    }

    // Insert test creators using admin client (bypasses RLS)
    const { data: newCreators, error } = await supabaseAdmin
      .from('creators')
      .insert(testCreators)
      .select();

    if (error) {
      throw new Error('Error inserting test creators: ' + error.message);
    }

    console.log(`✅ Successfully added ${newCreators.length} test creators`);
    newCreators.forEach(creator => {
      console.log(`   - ${creator.channel_name} (${creator.categories.join(', ')})`);
    });

    return {
      success: true,
      message: 'Demo user and test data created successfully',
      data: {
        creatorsAdded: newCreators.length,
        creators: newCreators.map(c => ({
          id: c.id,
          channel_name: c.channel_name,
          categories: c.categories
        }))
      }
    };

  } catch (error) {
    console.error('❌ Error setting up demo data:', error.message);
    return {
      success: false,
      message: error.message,
      suggestions: [
        'Ensure SUPABASE_SERVICE_KEY is set correctly',
        'Check Supabase project permissions',
        'Verify RLS policies allow admin operations'
      ]
    };
  }
};

// Export for use in other modules
module.exports = { createDemoUserAndData };

// Run directly if called as script
if (require.main === module) {
  createDemoUserAndData()
    .then(result => {
      console.log('\n📊 Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} 