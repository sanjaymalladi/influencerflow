require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

const checkAndCreateTestData = async () => {
  try {
    console.log('🔍 Checking available data in Supabase...\n');
    
    const demoUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Check campaigns
    console.log('📊 CAMPAIGNS:');
    const { data: campaigns, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, user_id')
      .eq('user_id', demoUserId);
    
    if (campaignError) {
      console.log('❌ Campaign error:', campaignError.message);
    } else {
      console.log(`✅ Found ${campaigns.length} campaigns:`);
      campaigns.forEach(c => console.log(`   ${c.id} - ${c.name}`));
    }
    
    // Check creators
    console.log('\n👥 CREATORS:');
    const { data: creators, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('id, channel_name, user_id')
      .eq('user_id', demoUserId);
    
    if (creatorError) {
      console.log('❌ Creator error:', creatorError.message);
    } else {
      console.log(`✅ Found ${creators.length} creators:`);
      creators.forEach(c => console.log(`   ${c.id} - ${c.channel_name}`));
    }
    
    // Check existing emails
    console.log('\n📧 EXISTING EMAILS:');
    const { data: emails, error: emailError } = await supabaseAdmin
      .from('outreach_emails')
      .select('id, subject, status, campaign_id, creator_id');
    
    if (emailError) {
      console.log('❌ Email error:', emailError.message);
    } else {
      console.log(`✅ Found ${emails.length} emails:`);
      emails.forEach(e => console.log(`   ${e.id} - ${e.subject} (${e.status})`));
    }
    
    // If we have campaigns and creators, create test emails that frontend can use
    if (campaigns.length > 0 && creators.length > 0) {
      console.log('\n🚀 Creating test emails with proper IDs...');
      
      const testEmails = [
        {
          campaign_id: campaigns[0].id,
          creator_id: creators[0].id,
          subject: 'Test Email - Ready to Send',
          content: `Hi ${creators[0].channel_name},\n\nThis is a test email created for the new Supabase system.\n\nBest regards,\nInfluencerFlow Team`,
          status: 'draft'
        }
      ];
      
      // Add more test emails if we have more creators
      if (creators.length > 1) {
        testEmails.push({
          campaign_id: campaigns[0].id,
          creator_id: creators[1].id,
          subject: 'Second Test Email - Partnership Opportunity',
          content: `Hi ${creators[1].channel_name},\n\nAnother test email for the updated system.\n\nBest regards,\nInfluencerFlow Team`,
          status: 'draft'
        });
      }
      
      for (const emailData of testEmails) {
        const { data: newEmail, error: insertError } = await supabaseAdmin
          .from('outreach_emails')
          .insert([emailData])
          .select()
          .single();
        
        if (insertError) {
          console.log(`❌ Failed to create email: ${insertError.message}`);
        } else {
          console.log(`✅ Created email: ${newEmail.id} - ${newEmail.subject}`);
        }
      }
      
      // Show final state
      const { data: finalEmails } = await supabaseAdmin
        .from('outreach_emails')
        .select('id, subject, status')
        .order('created_at', { ascending: false });
      
      console.log('\n📋 CURRENT EMAILS (use these IDs in frontend):');
      finalEmails.forEach(e => {
        console.log(`   ${e.id} - ${e.subject} (${e.status})`);
      });
      
    } else {
      console.log('\n⚠️ Cannot create test emails - missing campaigns or creators');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

checkAndCreateTestData(); 