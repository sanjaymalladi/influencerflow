const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const OutreachSpecialistAgent = require('../agents/OutreachSpecialistAgent');

const router = express.Router();

// Initialize Google APIs
const geminiAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });

// Main AI campaign endpoint - existing functionality
router.post('/start', async (req, res) => {
  try {
    console.log('🚀 Starting AI campaign analysis...');
    
    const { briefText } = req.body;
    
    if (!briefText) {
      return res.status(400).json({
        success: false,
        error: 'Campaign brief text is required'
      });
    }

    const logs = [];
    const addLog = (message) => {
      logs.push(`[Campaign Analyst] ${message}`);
      console.log(`[Campaign Analyst] ${message}`);
    };

    // Step 1: Analyze campaign brief with Gemini AI
    let campaignAnalysis = {};
    let creators = [];

    if (geminiAI) {
      try {
        addLog('Analyzing campaign brief with Gemini AI...');
        
        const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          Analyze this influencer marketing campaign brief and extract key parameters:
          
          "${briefText}"
          
          Extract and return JSON with these fields:
          - campaignName: A catchy name for this campaign
          - targetNiche: The main niche/category (gaming, tech, beauty, etc.)
          - budget: Estimated budget if mentioned, otherwise "Not specified"
          - targetAudience: Who this campaign targets
          - deliverables: What content is needed (videos, posts, etc.)
          - timeline: When this needs to be delivered
          - searchKeywords: 3-5 keywords to search for relevant creators
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
          campaignAnalysis = JSON.parse(text);
          addLog('✅ Campaign analysis completed');
        } catch (parseError) {
          addLog('⚠️ Could not parse AI response, using fallback analysis');
          campaignAnalysis = {
            campaignName: "Influencer Marketing Campaign",
            targetNiche: "general",
            budget: "Not specified",
            targetAudience: "General audience",
            deliverables: "Social media content",
            timeline: "Flexible",
            searchKeywords: ["influencer", "content", "creator"]
          };
        }
      } catch (error) {
        addLog(`⚠️ Gemini AI analysis failed: ${error.message}`);
        campaignAnalysis = {
          campaignName: "Influencer Marketing Campaign",
          targetNiche: "general",
          budget: "Not specified",
          targetAudience: "General audience",
          deliverables: "Social media content",
          timeline: "Flexible",
          searchKeywords: ["influencer", "content", "creator"]
        };
      }
    } else {
      addLog('⚠️ Gemini AI not available, using basic analysis');
      campaignAnalysis = {
        campaignName: "Influencer Marketing Campaign",
        targetNiche: "general", 
        budget: "Not specified",
        targetAudience: "General audience",
        deliverables: "Social media content",
        timeline: "Flexible",
        searchKeywords: ["influencer", "content", "creator"]
      };
    }

    // Step 2: Search for creators using YouTube Data API
    addLog('Searching for relevant creators...');
    
    if (process.env.YOUTUBE_API_KEY && campaignAnalysis.searchKeywords) {
      try {
        const searchQuery = campaignAnalysis.searchKeywords.join(' ');
        
        const searchResponse = await youtube.search.list({
          part: 'snippet',
          type: 'channel',
          q: searchQuery,
          maxResults: 10,
          order: 'relevance'
        });

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
          const channelIds = searchResponse.data.items.map(item => item.snippet.channelId);
          
          const channelsResponse = await youtube.channels.list({
            part: 'snippet,statistics',
            id: channelIds.join(',')
          });

          creators = channelsResponse.data.items.map((channel, index) => ({
            id: channel.id,
            name: channel.snippet.title,
            platform: 'YouTube',
            channelName: channel.snippet.title,
            subscribers: parseInt(channel.statistics.subscriberCount) || 0,
            subscriber_count: parseInt(channel.statistics.subscriberCount) || 0,
            niche: campaignAnalysis.targetNiche,
            description: channel.snippet.description,
            channel_url: `https://youtube.com/channel/${channel.id}`,
            profileImage: channel.snippet.thumbnails?.default?.url,
            engagement_rate: Math.random() * 5 + 2, // Simulated
            contactEmail: null // Will be generated by outreach agent
          }));

          addLog(`✅ Found ${creators.length} relevant creators on YouTube`);
        } else {
          addLog('⚠️ No creators found on YouTube, using fallback data');
          creators = getFallbackCreators(campaignAnalysis.targetNiche);
        }
      } catch (error) {
        addLog(`⚠️ YouTube API search failed: ${error.message}`);
        creators = getFallbackCreators(campaignAnalysis.targetNiche);
      }
    } else {
      addLog('⚠️ YouTube API not available, using fallback creators');
      creators = getFallbackCreators(campaignAnalysis.targetNiche);
    }

    addLog(`📊 Campaign analysis complete! Found ${creators.length} creators for ${campaignAnalysis.campaignName}`);

    res.json({
      success: true,
      campaign: campaignAnalysis,
      creators: creators,
      logs: logs
    });

  } catch (error) {
    console.error('❌ AI campaign analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// New endpoint for outreach automation
router.post('/outreach', async (req, res) => {
  try {
    console.log('🚀 Starting outreach automation...');
    
    const { creators, campaign, options } = req.body;
    
    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Creators array is required and cannot be empty'
      });
    }
    
    if (!campaign) {
      return res.status(400).json({
        success: false,
        error: 'Campaign information is required'
      });
    }

    // Initialize the Outreach Specialist Agent
    const outreachAgent = new OutreachSpecialistAgent();
    
    console.log('📧 Outreach Specialist Agent initialized');
    
    // Execute outreach campaign
    const result = await outreachAgent.execute(creators, campaign, options);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Outreach campaign completed successfully',
        data: {
          summary: result.summary,
          results: result.results,
          logs: result.logs,
          agent: 'Outreach Specialist'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        logs: result.logs
      });
    }
    
  } catch (error) {
    console.error('❌ Outreach campaign failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint for follow-up campaigns
router.post('/follow-up', async (req, res) => {
  try {
    console.log('🔄 Starting follow-up campaign...');
    
    const { creators, campaign, options } = req.body;
    
    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Creators array is required and cannot be empty'
      });
    }

    // Initialize the Outreach Specialist Agent
    const outreachAgent = new OutreachSpecialistAgent();
    
    // Execute follow-up campaign
    const result = await outreachAgent.sendFollowUp(creators, campaign, options);
    
    res.json({
      success: true,
      message: 'Follow-up campaign completed',
      data: {
        results: result.results,
        logs: result.logs,
        agent: 'Outreach Specialist'
      }
    });
    
  } catch (error) {
    console.error('❌ Follow-up campaign failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to get agent status
router.get('/agents/outreach', async (req, res) => {
  try {
    const outreachAgent = new OutreachSpecialistAgent();
    const status = outreachAgent.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fallback creator data
function getFallbackCreators(niche = 'general') {
  const fallbackCreators = [
    {
      id: 'sanjay-malladi-tech',
      name: 'Sanjay Malladi',
      platform: 'YouTube',
      channelName: 'Sanjay Malladi',
      subscribers: 2800000,
      subscriber_count: 2800000,
      niche: 'tech',
      description: 'Tech entrepreneur and content creator passionate about emerging technologies, AI/ML, and startup ecosystems. Creating content around tech innovations, coding tutorials, and entrepreneurship insights.',
      channel_url: 'https://www.youtube.com/@sanjaymalladi',
      profileImage: 'https://avatar.vercel.sh/sanjaymalladi?size=80&text=SM',
      engagement_rate: 8.2,
      contactEmail: 'sanjaymallladi12@gmail.com',
      typicalViews: '450K',
      recentGrowth: '+15.2% (30 days)',
      categories: ['Technology', 'AI/Machine Learning', 'Entrepreneurship', 'Coding Tutorials'],
      pricing: {
        videoReview: 8500,
        socialPost: 2200,
        sponsored: 12000
      }
    },
    {
      id: 'UCBJycsmduvYEL83R_U4JriQ',
      name: 'Marques Brownlee',
      platform: 'YouTube',
      channelName: 'MKBHD',
      subscribers: 15800000,
      subscriber_count: 15800000,
      niche: 'tech',
      description: 'Tech reviews and commentary',
      channel_url: 'https://youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ',
      profileImage: 'https://yt3.ggpht.com/ytc/AAUvwnjSRDlbX8M7z9lPUyeVRfG8FVF3tqo4JH-5BwTSPQ=s88-c-k-c0x00ffffff-no-rj',
      engagement_rate: 4.5,
      contactEmail: null
    },
    {
      id: 'UCMiJRAwDNSNzuYeN2uWa0pA',
      name: 'Mrwhosetheboss',
      platform: 'YouTube',
      channelName: 'Mrwhosetheboss',
      subscribers: 12200000,
      subscriber_count: 12200000,
      niche: 'tech',
      description: 'Tech reviews and smartphone content',
      channel_url: 'https://youtube.com/channel/UCMiJRAwDNSNzuYeN2uWa0pA',
      profileImage: 'https://yt3.ggpht.com/ytc/AAUvwnjZUZXRsEMkmyXK0E1yA3rF6VXm_iJ1c6c1XwKFGQ=s88-c-k-c0x00ffffff-no-rj',
      engagement_rate: 3.8,
      contactEmail: null
    },
    {
      id: 'UCXGgrKt94gR6lmN4aN3mYTg',
      name: 'Unbox Therapy',
      platform: 'YouTube',
      channelName: 'Unbox Therapy',
      subscribers: 18000000,
      subscriber_count: 18000000,
      niche: 'tech',
      description: 'Unboxing and tech product reviews',
      channel_url: 'https://youtube.com/channel/UCXGgrKt94gR6lmN4aN3mYTg',
      profileImage: 'https://yt3.ggpht.com/ytc/AAUvwnhKXo4-9fOAaevzj0SPQ0DhO-7b-Q-2yQbsW2HL=s88-c-k-c0x00ffffff-no-rj',
      engagement_rate: 4.2,
      contactEmail: null
    }
  ];

  return fallbackCreators;
}

module.exports = router; 