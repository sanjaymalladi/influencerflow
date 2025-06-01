const { supabase, supabaseAdmin } = require('../config/supabase');

// Load local JSON data as fallback
let localCreators = [];
let localCampaigns = [];

try {
  localCreators = require('../../data/creators.json');
  console.log(`📂 Loaded ${localCreators.length} creators from local JSON for helpers.`);
} catch (error) {
  console.log('⚠️ Local creators.json not found in helpers, using Supabase only for creators.');
}

try {
  localCampaigns = require('../../data/campaigns.json');
  console.log(`📂 Loaded ${localCampaigns.length} campaigns from local JSON for helpers.`);
} catch (error) {
  console.log('⚠️ Local campaigns.json not found in helpers, using Supabase only for campaigns.');
}

// Helper function to get the appropriate database client
const getDbClient = (userId) => {
  // Example: Distinguish between regular users and a special demo/admin user
  // This logic might need to be adjusted based on your actual user ID setup in Supabase
  const isDemoUser = userId === '550e8400-e29b-41d4-a716-446655440000' || userId === '1';
  // Use supabaseAdmin for demo/admin for potentially broader access, otherwise standard supabase client
  return isDemoUser && supabaseAdmin ? supabaseAdmin : supabase;
};

// Helper function to check if Supabase is available
const isSupabaseAvailable = () => {
  return supabase !== null || supabaseAdmin !== null;
};

// Helper function to map auth user ID to Supabase UUID if necessary
const getSupabaseUserId = (authUserId) => {
  // This is an example if your JWT auth user ID is different from your Supabase user table ID.
  // If they are the same, you can just return authUserId.
  // This example maps specific test/demo IDs to a known Supabase UUID.
  if (authUserId === '550e8400-e29b-41d4-a716-446655440000' || 
      authUserId === '1' || 
      authUserId === 1) { // Handle number if applicable
    return '550e8400-e29b-41d4-a716-446655440000'; // Example Supabase User UUID
  }
  return authUserId; // Assume authUserId is already the Supabase User UUID
};

// Helper function to find creator by ID from Supabase, with local JSON fallback
const findCreatorById = async (creatorId, userId) => {
  console.log(`🔍 [Helpers] Finding creator with ID: "${creatorId}" for user ${userId}`);
  
  // First try Supabase if available and ID looks like UUID
  if (isSupabaseAvailable() && creatorId && typeof creatorId === 'string' && creatorId.includes('-') && creatorId.length > 30) {
    try {
      const dbClient = getDbClient(userId);
      const { data: creator, error } = await dbClient
        .from('creators')
        .select('*')
        .eq('id', creatorId)
        .maybeSingle(); // Use maybeSingle to not error if not found
      
      if (!error && creator) {
        console.log(`✅ [Helpers] Found creator in Supabase: ${creator.channel_name || creator.channelName}`);
        return creator;
      }
      if (error) {
        console.warn('⚠️ [Helpers] Supabase creator lookup failed:', error.message);
      }
    } catch (error) {
      console.warn('⚠️ [Helpers] Exception during Supabase creator lookup:', error.message);
    }
  }
  
  // Fallback to local JSON data
  if (localCreators.length > 0) {
    let creator = localCreators.find(c => String(c.id) === String(creatorId)); // Ensure ID comparison is robust
    
    if (!creator && creatorId && typeof creatorId === 'string') {
      // Try channel name based search for string IDs that are not UUIDs
      const searchName = creatorId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      creator = localCreators.find(c => {
        const creatorName = c.channel_name || c.channelName || '';
        return creatorName.toLowerCase() === searchName.toLowerCase() ||
               creatorName.toLowerCase().replace(/\s+/g, '-') === creatorId.toLowerCase();
      });
    }
    
    if (creator) {
      console.log(`✅ [Helpers] Found creator in local JSON: ${creator.channel_name || creator.channelName}`);
      return creator;
    }
  }
  
  console.log(`🚨 [Helpers] Creator with ID "${creatorId}" not found in Supabase or local JSON.`);
  return null;
};

// Helper function to find campaign by ID from Supabase, with local JSON fallback
const findCampaignById = async (campaignId, userId) => {
  console.log(`🔍 [Helpers] Finding campaign with ID: "${campaignId}" for user ${userId}`);
  
  // First try Supabase if available and ID looks like UUID
  if (isSupabaseAvailable() && campaignId && typeof campaignId === 'string' && campaignId.includes('-') && campaignId.length > 30) {
    try {
      const dbClient = getDbClient(userId);
      const { data: campaign, error } = await dbClient
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle(); // Use maybeSingle
      
      if (!error && campaign) {
        console.log(`✅ [Helpers] Found campaign in Supabase: ${campaign.name}`);
        return campaign;
      }
       if (error) {
        console.warn('⚠️ [Helpers] Supabase campaign lookup failed:', error.message);
      }
    } catch (error) {
      console.warn('⚠️ [Helpers] Exception during Supabase campaign lookup:', error.message);
    }
  }
  
  // Fallback to local JSON data
  if (localCampaigns.length > 0) {
    const campaign = localCampaigns.find(c => String(c.id) === String(campaignId));
    
    if (campaign) {
      console.log(`✅ [Helpers] Found campaign in local JSON: ${campaign.name}`);
      return campaign;
    }
  }
  
  console.log(`🚨 [Helpers] Campaign with ID "${campaignId}" not found in Supabase or local JSON.`);
  return null;
};

module.exports = {
  getDbClient,
  isSupabaseAvailable,
  getSupabaseUserId,
  findCreatorById,
  findCampaignById
}; 