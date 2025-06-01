require('dotenv').config();
const { supabase, supabaseAdmin } = require('./src/config/supabase');
const path = require('path');
const fs = require('fs');

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const CREATORS_FILE = path.join(DATA_DIR, 'creators.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

// Load existing data
const loadData = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return [];
  }
};

// Migration functions
const migrateUsers = async () => {
  console.log('🔄 Migrating users...');
  
  if (!supabaseAdmin) {
    console.log('⚠️ No admin client available. Using regular client (may fail due to RLS)');
  }
  
  const client = supabaseAdmin || supabase;
  
  // Create a demo user if not exists
  const { data: existingUser } = await client
    .from('users')
    .select('id')
    .eq('email', 'demo@influencerflow.com')
    .single();

  if (!existingUser) {
    const { data: newUser, error } = await client
      .from('users')
      .insert([{
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'demo@influencerflow.com',
        name: 'Demo User',
        role: 'brand',
        company: 'InfluencerFlow Demo'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating demo user:', error);
      return null;
    }
    
    console.log('✅ Demo user created');
    return newUser;
  }
  
  console.log('✅ Demo user already exists');
  return existingUser;
};

const migrateCreators = async (userId) => {
  console.log('🔄 Migrating creators...');
  
  const creators = loadData(CREATORS_FILE);
  if (creators.length === 0) {
    console.log('⚠️ No creators to migrate');
    return;
  }

  const migratedCreators = [];
  
  for (const creator of creators) {
    try {
      const creatorData = {
        user_id: userId,
        channel_name: creator.channelName || creator.name || 'Unknown Creator',
        youtube_channel_url: creator.youtubeChannelUrl || null,
        instagram_url: creator.instagramUrl || null,
        tiktok_url: creator.tiktokUrl || null,
        subscriber_count: creator.subscriberCount || null,
        follower_count: creator.followerCount || null,
        categories: creator.categories || [],
        contact_email: creator.contactEmail || creator.email || null,
        avatar_url: creator.profileImageUrl || creator.avatarUrl || null,
        stats: {
          viewCount: creator.viewCount || null,
          videoCount: creator.videoCount || null,
          matchPercentage: creator.matchPercentage || null,
          typicalViews: creator.typicalViews || null,
          engagementRate: creator.engagementRate || null,
          bio: creator.bio || '',
          geminiBio: creator.geminiBio || null,
          popularVideos: creator.popularVideos || [],
          dataSource: creator.dataSource || 'Migration'
        },
        notes: creator.notes || null,
        tags: creator.tags || [],
        status: 'active'
      };

      const { data: newCreator, error } = await supabase
        .from('creators')
        .insert([creatorData])
        .select()
        .single();

      if (error) {
        console.error(`Error migrating creator ${creator.channelName}:`, error);
      } else {
        migratedCreators.push(newCreator);
        console.log(`✅ Migrated creator: ${creator.channelName}`);
      }
    } catch (error) {
      console.error(`Error processing creator ${creator.channelName}:`, error);
    }
  }

  console.log(`✅ Migrated ${migratedCreators.length}/${creators.length} creators`);
  return migratedCreators;
};

const migrateCampaigns = async (userId) => {
  console.log('🔄 Migrating campaigns...');
  
  const campaigns = loadData(CAMPAIGNS_FILE);
  if (campaigns.length === 0) {
    console.log('⚠️ No campaigns to migrate');
    return;
  }

  const migratedCampaigns = [];
  
  for (const campaign of campaigns) {
    try {
      const campaignData = {
        user_id: userId,
        name: campaign.name || 'Untitled Campaign',
        description: campaign.description || null,
        budget: campaign.budget || null,
        currency: campaign.currency || 'USD',
        status: campaign.status || 'draft',
        start_date: campaign.startDate || null,
        end_date: campaign.endDate || null,
        deliverables: campaign.deliverables || [],
        target_creators: campaign.targetCreators || [],
        requirements: campaign.requirements || {},
        metrics: campaign.metrics || {}
      };

      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        console.error(`Error migrating campaign ${campaign.name}:`, error);
      } else {
        migratedCampaigns.push(newCampaign);
        console.log(`✅ Migrated campaign: ${campaign.name}`);
      }
    } catch (error) {
      console.error(`Error processing campaign ${campaign.name}:`, error);
    }
  }

  console.log(`✅ Migrated ${migratedCampaigns.length}/${campaigns.length} campaigns`);
  return migratedCampaigns;
};

const migrateEmails = async (userId, campaigns, creators) => {
  console.log('🔄 Migrating emails...');
  
  const emails = loadData(EMAILS_FILE);
  if (emails.length === 0) {
    console.log('⚠️ No emails to migrate');
    return;
  }

  const migratedEmails = [];
  
  for (const email of emails) {
    try {
      // Find corresponding campaign and creator
      const campaign = campaigns.find(c => c.name === email.campaignName);
      const creator = creators.find(c => c.channel_name === email.creatorName || c.contact_email === email.toEmail);

      const emailData = {
        campaign_id: campaign?.id || null,
        creator_id: creator?.id || null,
        subject: email.subject || 'No Subject',
        content: email.content || email.body || '',
        template_name: email.templateName || null,
        status: email.status || 'draft',
        provider: email.provider || 'gmail',
        external_id: email.externalId || email.messageId || null,
        sent_at: email.sentAt || email.sent_at || null,
        opened_at: email.openedAt || email.opened_at || null,
        replied_at: email.repliedAt || email.replied_at || null,
        reply_content: email.replyContent || email.reply_content || null,
        tracking_data: email.trackingData || {}
      };

      const { data: newEmail, error } = await supabase
        .from('outreach_emails')
        .insert([emailData])
        .select()
        .single();

      if (error) {
        console.error(`Error migrating email ${email.subject}:`, error);
      } else {
        migratedEmails.push(newEmail);
        console.log(`✅ Migrated email: ${email.subject}`);
      }
    } catch (error) {
      console.error(`Error processing email ${email.subject}:`, error);
    }
  }

  console.log(`✅ Migrated ${migratedEmails.length}/${emails.length} emails`);
  return migratedEmails;
};

const migrateConversations = async (campaigns) => {
  console.log('🔄 Migrating conversations...');
  
  const conversations = loadData(CONVERSATIONS_FILE);
  if (conversations.length === 0) {
    console.log('⚠️ No conversations to migrate');
    return;
  }

  const migratedConversations = [];
  
  for (const conversation of conversations) {
    try {
      // Find corresponding campaign
      const campaign = campaigns.find(c => c.name === conversation.campaignName || c.id === conversation.campaignId);

      const conversationData = {
        campaign_id: campaign?.id || null,
        creator_email: conversation.creatorEmail || conversation.email || 'unknown@email.com',
        creator_name: conversation.creatorName || 'Unknown Creator',
        stage: conversation.stage || 'initial_contact',
        messages: conversation.messages || [],
        ai_analysis: conversation.aiAnalysis || {},
        needs_human_approval: conversation.needsHumanApproval || false,
        human_notes: conversation.humanNotes || null,
        email_thread_id: conversation.emailThreadId || null,
        last_message_at: conversation.lastMessageAt || new Date().toISOString()
      };

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert([conversationData])
        .select()
        .single();

      if (error) {
        console.error(`Error migrating conversation with ${conversation.creatorEmail}:`, error);
      } else {
        migratedConversations.push(newConversation);
        console.log(`✅ Migrated conversation: ${conversation.creatorEmail}`);
      }
    } catch (error) {
      console.error(`Error processing conversation ${conversation.creatorEmail}:`, error);
    }
  }

  console.log(`✅ Migrated ${migratedConversations.length}/${conversations.length} conversations`);
  return migratedConversations;
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('🚀 Starting migration to Supabase...\n');

    // Test connection
    const { data, error } = await supabase.from('users').select('count').single();
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      return;
    }
    
    console.log('✅ Connected to Supabase\n');

    // Run migrations
    const user = await migrateUsers();
    if (!user) {
      console.error('❌ Failed to create/get user');
      return;
    }

    const creators = await migrateCreators(user.id);
    const campaigns = await migrateCampaigns(user.id);
    const emails = await migrateEmails(user.id, campaigns, creators);
    const conversations = await migrateConversations(campaigns);

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: 1`);
    console.log(`   - Creators: ${creators?.length || 0}`);
    console.log(`   - Campaigns: ${campaigns?.length || 0}`);
    console.log(`   - Emails: ${emails?.length || 0}`);
    console.log(`   - Conversations: ${conversations?.length || 0}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration }; 