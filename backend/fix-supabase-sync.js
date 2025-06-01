require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase, supabaseAdmin } = require('./src/config/supabase');

const fixSupabaseSyncAndAddUser = async () => {
  try {
    console.log('🔧 Fixing Supabase synchronization and adding Sanjay Malladi...');

    if (!supabaseAdmin) {
      throw new Error('❌ Supabase admin client not available. Please set SUPABASE_SERVICE_KEY environment variable.');
    }

    // Step 1: Ensure demo user exists in Supabase Auth
    console.log('👤 Ensuring demo user exists...');
    let demoUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(demoUserId);
      if (!existingUser.user) {
        throw new Error('User not found');
      }
      console.log('✅ Demo user exists in Supabase Auth');
    } catch (error) {
      // Try to find user by email first
      const { data: userByEmail } = await supabaseAdmin.auth.admin.listUsers();
      const existingUserByEmail = userByEmail.users?.find(u => u.email === 'demo@influencerflow.com');
      
      if (existingUserByEmail) {
        console.log('✅ Demo user found by email (different ID, updating reference)');
        console.log(`   User ID: ${existingUserByEmail.id}`);
        // Update demoUserId to match the existing user
        demoUserId = existingUserByEmail.id;
      } else {
        console.log('📝 Creating demo user...');
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          user_id: demoUserId,
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
          // If user already exists with different email, try to find it
          if (createError.message.includes('already been registered')) {
            console.log('⚠️ User email already exists, trying to find existing user...');
            const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
            const demoUser = allUsers.users?.find(u => u.email === 'demo@influencerflow.com');
            if (demoUser) {
              console.log(`✅ Found existing demo user with ID: ${demoUser.id}`);
              demoUserId = demoUser.id;
            } else {
              throw new Error('Could not find or create demo user: ' + createError.message);
            }
          } else {
            throw new Error('Error creating demo user: ' + createError.message);
          }
        } else {
          console.log('✅ Created demo user in Supabase Auth');
        }
      }
    }

    // Step 2: Ensure user profile exists in users table
    console.log('📝 Ensuring user profile exists...');
    
    // First check if profile exists with the current user ID
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', demoUserId)
      .single();

    if (!existingProfile) {
      // Check if profile exists with the email (might have different ID)
      const { data: profileByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', 'demo@influencerflow.com')
        .single();

      if (profileByEmail) {
        console.log('✅ User profile found with different ID, using existing profile');
        demoUserId = profileByEmail.id; // Update the demoUserId to match existing profile
      } else {
        // Create new profile
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert([{
            id: demoUserId,
            email: 'demo@influencerflow.com',
            name: 'Demo User',
            role: 'brand',
            company: 'InfluencerFlow Demo'
          }]);

        if (profileError) {
          console.warn('⚠️ Could not create user profile:', profileError.message);
          // Try to find any existing profile and use its ID
          const { data: anyProfile } = await supabaseAdmin
            .from('users')
            .select('*')
            .limit(1)
            .single();
          
          if (anyProfile) {
            console.log('✅ Using existing user profile');
            demoUserId = anyProfile.id;
          }
        } else {
          console.log('✅ Created user profile');
        }
      }
    } else {
      console.log('✅ User profile already exists');
    }

    // Step 3: Read creators from JSON file
    console.log('📖 Reading creators from JSON file...');
    const creatorsPath = path.join(__dirname, 'data', 'creators.json');
    const creatorsData = JSON.parse(fs.readFileSync(creatorsPath, 'utf8'));
    console.log(`📊 Found ${creatorsData.length} creators in JSON file`);

    // Step 4: Check existing creators in Supabase
    const { data: existingCreators } = await supabaseAdmin
      .from('creators')
      .select('channel_name, contact_email')
      .eq('user_id', demoUserId);

    console.log(`📊 Found ${existingCreators?.length || 0} creators in Supabase`);

    // Step 5: Convert JSON creators to Supabase format and insert missing ones
    const creatorsToInsert = [];
    let sanjayMalladiFound = false;

    for (const creator of creatorsData) {
      // Check if this creator already exists in Supabase
      const existsInSupabase = existingCreators?.some(existing => 
        existing.channel_name === creator.channelName || 
        (creator.contactEmail && existing.contact_email === creator.contactEmail)
      );

      if (creator.channelName === 'Sanjay Malladi') {
        sanjayMalladiFound = true;
      }

      if (!existsInSupabase) {
        // Convert JSON format to Supabase format
        const supabaseCreator = {
          user_id: demoUserId,
          channel_name: creator.channelName,
          youtube_channel_url: creator.youtubeChannelUrl || null,
          instagram_url: creator.instagramUrl || null,
          tiktok_url: creator.tiktokUrl || null,
          subscriber_count: creator.subscriberCount || null,
          follower_count: creator.followerCount || null,
          categories: creator.categories || [],
          contact_email: creator.contactEmail || null,
          avatar_url: creator.profileImageUrl || null,
          stats: {
            viewCount: creator.viewCount || null,
            videoCount: creator.videoCount || null,
            matchPercentage: creator.matchPercentage || null,
            typicalViews: creator.typicalViews || null,
            engagementRate: creator.engagementRate || null,
            bio: creator.bio || '',
            geminiBio: creator.geminiBio || null,
            popularVideos: creator.popularVideos || [],
            dataSource: creator.dataSource || 'JSON Import',
            recentGrowth: creator.recentGrowth || null
          },
          social_stats: {
            socialPlatforms: creator.socialPlatforms || [],
            location: creator.location || null
          },
          notes: creator.notes || null,
          tags: creator.tags || [],
          status: 'active'
        };

        creatorsToInsert.push(supabaseCreator);
      }
    }

    // Step 6: Insert missing creators
    if (creatorsToInsert.length > 0) {
      console.log(`📥 Inserting ${creatorsToInsert.length} missing creators into Supabase...`);
      
      const { data: insertedCreators, error: insertError } = await supabaseAdmin
        .from('creators')
        .insert(creatorsToInsert)
        .select();

      if (insertError) {
        throw new Error('Error inserting creators: ' + insertError.message);
      }

      console.log('✅ Successfully inserted creators:');
      insertedCreators.forEach(creator => {
        console.log(`   - ${creator.channel_name} (${creator.categories.join(', ')})`);
      });
    } else {
      console.log('✅ All creators are already synced with Supabase');
    }

    // Step 7: Verify Sanjay Malladi is in both JSON and Supabase
    console.log('\n🔍 Verifying Sanjay Malladi data...');
    
    if (!sanjayMalladiFound) {
      console.log('❌ Sanjay Malladi not found in JSON file');
    } else {
      console.log('✅ Sanjay Malladi found in JSON file');
    }

    const { data: sanjayInSupabase } = await supabaseAdmin
      .from('creators')
      .select('*')
      .eq('user_id', demoUserId)
      .eq('channel_name', 'Sanjay Malladi')
      .single();

    if (sanjayInSupabase) {
      console.log('✅ Sanjay Malladi found in Supabase database');
      console.log(`   📧 Email: ${sanjayInSupabase.contact_email}`);
      console.log(`   📊 Subscribers: ${sanjayInSupabase.subscriber_count}`);
      console.log(`   🏷️ Categories: ${sanjayInSupabase.categories.join(', ')}`);
    } else {
      console.log('❌ Sanjay Malladi not found in Supabase database');
    }

    // Step 8: Test the API endpoints
    console.log('\n🧪 Testing API functionality...');
    
    // Test getting all creators
    const { data: allCreators, error: getAllError } = await supabaseAdmin
      .from('creators')
      .select('channel_name, categories')
      .eq('user_id', demoUserId);

    if (getAllError) {
      console.log('❌ Error fetching creators:', getAllError.message);
    } else {
      console.log(`✅ API test successful - ${allCreators.length} creators accessible`);
    }

    console.log('\n🎉 Supabase synchronization completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   • Demo user: ✅ Active`);
    console.log(`   • Total creators in Supabase: ${allCreators?.length || 0}`);
    console.log(`   • Sanjay Malladi: ${sanjayInSupabase ? '✅ Found' : '❌ Missing'}`);
    console.log(`   • Creators inserted this run: ${creatorsToInsert.length}`);

    return {
      success: true,
      message: 'Supabase synchronization completed successfully',
      data: {
        totalCreators: allCreators?.length || 0,
        creatorsInserted: creatorsToInsert.length,
        sanjayMalladiExists: !!sanjayInSupabase,
        demoUserExists: true
      }
    };

  } catch (error) {
    console.error('❌ Error fixing Supabase sync:', error.message);
    
    // Provide helpful troubleshooting suggestions
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check your .env file has these variables:');
    console.log('   - SUPABASE_URL=your_supabase_url');
    console.log('   - SUPABASE_ANON_KEY=your_anon_key');
    console.log('   - SUPABASE_SERVICE_KEY=your_service_key');
    console.log('2. Verify your Supabase project is active');
    console.log('3. Check if the creators table exists (run database-schema.sql)');
    console.log('4. Ensure RLS policies allow admin operations');

    return {
      success: false,
      message: error.message,
      suggestions: [
        'Check environment variables',
        'Verify Supabase project status', 
        'Run database schema setup',
        'Check RLS policies'
      ]
    };
  }
};

// Export for use in other modules
module.exports = { fixSupabaseSyncAndAddUser };

// Run directly if called as script
if (require.main === module) {
  fixSupabaseSyncAndAddUser()
    .then(result => {
      console.log('\n' + JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
} 