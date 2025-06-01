require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

const checkProductionDB = async () => {
  try {
    console.log('🔍 Checking production Supabase database...');
    
    // Check emails
    const { data: emails, error: emailError } = await supabaseAdmin
      .from('outreach_emails')
      .select('id, subject, creator_id, status')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (emailError) {
      console.log('❌ Email query error:', emailError.message);
    } else {
      console.log(`📧 Found ${emails.length} emails in Supabase:`);
      emails.forEach(email => {
        console.log(`   ID: ${email.id}, Subject: ${email.subject}, Creator: ${email.creator_id}, Status: ${email.status}`);
      });
    }
    
    // Check creators
    const { data: creators, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('id, channel_name')
      .eq('user_id', '550e8400-e29b-41d4-a716-446655440000')
      .limit(10);
    
    if (creatorError) {
      console.log('❌ Creator query error:', creatorError.message);
    } else {
      console.log(`👥 Found ${creators.length} creators:`);
      creators.forEach(creator => {
        console.log(`   ID: ${creator.id}, Name: ${creator.channel_name}`);
      });
    }
    
    // Try to find the specific email ID 37
    console.log('\n🔍 Looking for email ID 37...');
    const { data: email37, error: email37Error } = await supabaseAdmin
      .from('outreach_emails')
      .select('*')
      .eq('id', '37')
      .single();
    
    if (email37Error) {
      console.log('❌ Email ID 37 not found:', email37Error.message);
    } else {
      console.log('✅ Found email ID 37:');
      console.log(`   Subject: ${email37.subject}`);
      console.log(`   Creator ID: ${email37.creator_id}`);
      console.log(`   Campaign ID: ${email37.campaign_id}`);
      console.log(`   Status: ${email37.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

checkProductionDB(); 