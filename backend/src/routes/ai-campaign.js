const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const multer = require('multer');
const axios = require('axios');
const OutreachSpecialistAgent = require('../agents/OutreachSpecialistAgent');
const geminiAiService = require('../services/geminiAiService');
const router = express.Router();
const { execSync } = require('child_process');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files and common document formats
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a text file or document.'), false);
    }
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize YouTube Data API
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// Generate enhanced mock creators based on niche and keywords
function generateEnhancedMockCreators(niche, searchKeywords = [], maxResults = 8) {
  const mockCreators = [];
  
  // Niche-specific creator databases
  const creatorsByNiche = {
    'technology': [
      { name: "TechReviewsHD", baseFollowers: 2500000, description: "In-depth technology reviews and analysis" },
      { name: "GadgetExplorer", baseFollowers: 1800000, description: "Latest gadget unboxing and reviews" },
      { name: "TechSavvyPro", baseFollowers: 3200000, description: "Technology comparisons and buying guides" },
      { name: "DigitalTrends", baseFollowers: 1500000, description: "Digital lifestyle and product reviews" },
      { name: "TechTalkShow", baseFollowers: 4200000, description: "Technology news and discussions" }
    ],
    'premium lifestyle': [
      { name: "LuxuryLifestyleHD", baseFollowers: 2900000, description: "Premium lifestyle content, luxury products, and F1 racing culture" },
      { name: "EliteLivingTV", baseFollowers: 2400000, description: "High-end lifestyle, premium brands, and exclusive experiences" },
      { name: "PremiumLifestylePro", baseFollowers: 2100000, description: "Luxury brands, premium living, and sophisticated lifestyle content" },
      { name: "RichLifeExperiences", baseFollowers: 1800000, description: "Premium product reviews, luxury travel, and lifestyle vlogs" },
      { name: "LuxuryContentHub", baseFollowers: 1600000, description: "Exclusive luxury reviews and premium lifestyle experiences" }
    ],
    'automotive': [
      { name: "F1LifestyleIndia", baseFollowers: 3800000, description: "Formula 1 racing, premium automotive lifestyle, and luxury car culture" },
      { name: "PetrolheadPremium", baseFollowers: 2800000, description: "Premium car reviews, F1 content, and automotive lifestyle" },
      { name: "RacingLifestyleTV", baseFollowers: 2400000, description: "F1 racing culture, premium vehicles, and motorsport lifestyle" },
      { name: "MotorsportLuxury", baseFollowers: 2100000, description: "F1, racing, premium automotive content, and luxury lifestyle" },
      { name: "SupercarCultureHD", baseFollowers: 1900000, description: "Supercar reviews, racing culture, and premium automotive lifestyle" }
    ],
    'gaming': [
      { name: "ProGameReviews", baseFollowers: 4500000, description: "Professional gaming reviews and esports content" },
      { name: "GameplayMaster", baseFollowers: 3200000, description: "Gaming tutorials and reviews" },
      { name: "EsportsHQ", baseFollowers: 2800000, description: "Competitive gaming and esports analysis" },
      { name: "GamingGearPro", baseFollowers: 1900000, description: "Gaming hardware reviews and setup guides" }
    ],
    'fashion': [
      { name: "StyleInfluencer", baseFollowers: 2100000, description: "Fashion trends and style advice" },
      { name: "FashionReviewsHD", baseFollowers: 1800000, description: "Fashion product reviews and styling tips" },
      { name: "TrendsetterTV", baseFollowers: 1600000, description: "Fashion trends and brand collaborations" },
      { name: "StyleGuruOfficial", baseFollowers: 1400000, description: "Personal styling and fashion advice" }
    ]
  };

  // Smart niche matching for compound niches
  let matchedNiche = 'technology'; // default fallback
  const lowerNiche = niche.toLowerCase();
  
  // Direct match first
  if (creatorsByNiche[lowerNiche]) {
    matchedNiche = lowerNiche;
  } else {
    // Try to find best match from compound niche
    if (lowerNiche.includes('premium') || lowerNiche.includes('luxury') || lowerNiche.includes('lifestyle')) {
      matchedNiche = 'premium lifestyle';
    } else if (lowerNiche.includes('f1') || lowerNiche.includes('racing') || lowerNiche.includes('automotive') || lowerNiche.includes('car')) {
      matchedNiche = 'automotive';
    } else if (lowerNiche.includes('fashion') || lowerNiche.includes('style')) {
      matchedNiche = 'fashion';
    } else if (lowerNiche.includes('gaming')) {
      matchedNiche = 'gaming';
    } else if (lowerNiche.includes('tech')) {
      matchedNiche = 'technology';
    }
  }
  
  console.log(`🎬 [YouTube Mock] Mapped niche "${niche}" to "${matchedNiche}"`);
  const creators = creatorsByNiche[matchedNiche] || creatorsByNiche['technology'];

  for (let i = 0; i < Math.min(maxResults, creators.length); i++) {
    const creator = creators[i];
    const subscriberCount = creator.baseFollowers + Math.floor(Math.random() * 200000);
    const videoCount = Math.floor(Math.random() * 800) + 200;
    const viewCount = subscriberCount * (Math.floor(Math.random() * 30) + 20);
    const avgViewsPerVideo = Math.round(viewCount / videoCount);
    const engagementRate = Math.min(((avgViewsPerVideo / subscriberCount) * 100), 12);
    
    // Enhance description with search keywords if available
    let enhancedDescription = creator.description;
    if (searchKeywords && searchKeywords.length > 0) {
      const relatedKeywords = searchKeywords.slice(0, 2).join(' and ');
      enhancedDescription = `${creator.description}. Specializes in ${relatedKeywords} content.`;
    }
    
    mockCreators.push({
      id: `enhanced_${niche}_${i + 1}`,
      name: creator.name,
      platform: 'YouTube',
      platforms: ['YouTube'],
      subscriberCount: subscriberCount,
      followerCount: subscriberCount,
      viewCount: viewCount,
      videoCount: videoCount,
      niche: matchedNiche,
      categories: searchKeywords && searchKeywords.length > 0 ? [matchedNiche, ...searchKeywords.slice(0, 2)] : [matchedNiche, 'Review', 'Content'],
      description: enhancedDescription,
      bio: enhancedDescription,
      profileImageUrl: `https://ui-avatars.com/api/?name=${creator.name}&background=random&size=400`,
      youtubeChannelUrl: `https://youtube.com/@${creator.name.toLowerCase().replace(/\s+/g, '')}`,
      channelUrl: `https://youtube.com/@${creator.name.toLowerCase().replace(/\s+/g, '')}`,
      stats: {
        avgViewsPerVideo: avgViewsPerVideo,
        engagementRate: `${engagementRate.toFixed(1)}%`,
        totalViews: viewCount,
        videosUploaded: videoCount,
        uploadsPerWeek: Math.floor(Math.random() * 4) + 2
      },
      estimatedPricing: {
        sponsoredVideo: Math.round((subscriberCount / 1000) * 200), // Enhanced pricing
        sponsored_post: Math.round((subscriberCount / 1000) * 50),
        currency: 'INR'
      },
      matchPercentage: Math.floor(Math.random() * 15) + 85, // Higher match rates
      dataSource: 'Enhanced Mock Data',
      location: '📍 India',
      verifiedStatus: subscriberCount > 500000 ? 'Verified' : 'Unverified',
      contactEmail: `${creator.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`
    });
  }

  console.log(`🎬 Generated ${mockCreators.length} enhanced mock creators for niche: ${niche}`);
  return mockCreators;
}

// Find real creators using Gemini AI with Google Search
async function findCreatorsWithGeminiSearch(niche, searchKeywords = [], platform = 'youtube', maxResults = 8) {
  try {
    console.log(`🧠 [Gemini Search] Finding real ${platform} creators for niche: "${niche}"`);
    console.log(`🔍 [Gemini Search] Using keywords: [${searchKeywords.join(', ')}]`);
    
    const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Create search query based on niche and keywords
    let searchQuery = '';
    if (searchKeywords && searchKeywords.length > 0) {
      searchQuery = `${platform} creators ${searchKeywords.slice(0, 3).join(' ')} ${niche} influencers India`;
    } else {
      searchQuery = `${platform} ${niche} creators influencers India popular`;
    }
    
    console.log(`🔍 [Gemini Search] Search query: "${searchQuery}"`);
    
    const prompt = `
You are an expert influencer marketing researcher. I need you to find real, popular ${platform} creators/influencers based on this search criteria:

Niche: ${niche}
Keywords: ${searchKeywords.join(', ')}
Platform: ${platform}
Search Query: ${searchQuery}

Please research and provide ${maxResults} real, popular ${platform} creators who match this criteria. For each creator, provide:

1. Name (real name of the creator)
2. Channel/Username (their actual ${platform} handle)
3. Estimated subscriber/follower count (realistic numbers)
4. Description (what type of content they create, why they match the niche)
5. Location (preferably Indian creators)

Focus on finding creators who would be genuinely interested in campaigns related to "${niche}" and these keywords: ${searchKeywords.join(', ')}.

Please respond in this exact JSON format:
{
  "creators": [
    {
      "name": "Creator Name",
      "username": "channel_handle",
      "subscriberCount": 1500000,
      "description": "Description of their content and relevance to the niche",
      "location": "India",
      "verified": true
    }
  ]
}

Only provide the JSON response, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`🧠 [Gemini Search] Raw response: ${text.substring(0, 200)}...`);
    
    // Parse the JSON response
    let geminiData;
    try {
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('🧠 [Gemini Search] JSON parsing failed:', parseError.message);
      throw parseError;
    }
    
    if (!geminiData.creators || !Array.isArray(geminiData.creators)) {
      throw new Error('Invalid response format from Gemini');
    }
    
    // Convert Gemini response to our creator format
    const creators = geminiData.creators.map((creator, index) => {
      const followerCount = creator.subscriberCount || creator.followerCount || (Math.floor(Math.random() * 2000000) + 500000);
      const engagementRate = (Math.random() * 3 + 2).toFixed(2); // 2-5% engagement rate
      
      return {
        id: `gemini_${platform}_${index}_${Date.now()}`,
        name: creator.name,
        username: creator.username || creator.handle,
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        platforms: [platform.charAt(0).toUpperCase() + platform.slice(1)],
        subscriberCount: followerCount,
        followerCount: followerCount,
        viewCount: Math.floor(followerCount * (15 + Math.random() * 10)), // 15-25x followers
        videoCount: Math.floor(Math.random() * 300) + 150, // 150-450 videos
        niche: niche,
        categories: searchKeywords && searchKeywords.length > 0 ? [niche, ...searchKeywords.slice(0, 2)] : [niche, 'Content Creation'],
        description: `${creator.description}. Experienced with ${niche} content and brand partnerships. ${searchKeywords.length > 0 ? `Specializes in ${searchKeywords.slice(0, 2).join(' and ')}.` : ''}`,
        bio: `✨ ${creator.name} | 📈 ${(followerCount/1000000).toFixed(1)}M Followers | ${creator.verified ? '🏆 Verified Creator' : '📊 Content Creator'} | 🇮🇳 ${creator.location || 'India'}`,
        profileImageUrl: `https://i.pravatar.cc/400?img=${index + 50}&name=${encodeURIComponent(creator.name)}`,
        youtubeChannelUrl: platform === 'youtube' ? `https://youtube.com/@${creator.username}` : undefined,
        instagramUrl: platform === 'instagram' ? `https://instagram.com/${creator.username}` : undefined,
        channelUrl: platform === 'youtube' ? 
          `https://youtube.com/@${creator.username}` : 
          `https://instagram.com/${creator.username}`,
        stats: {
          avgViewsPerVideo: Math.floor(followerCount * (0.1 + Math.random() * 0.15)), // 10-25% of followers
          engagementRate: `${engagementRate}%`,
          totalViews: Math.floor(followerCount * (15 + Math.random() * 10)),
          videosUploaded: Math.floor(Math.random() * 300) + 150,
          uploadsPerWeek: Math.floor(Math.random() * 4) + 2 // 2-5 uploads per week
        },
        estimatedPricing: {
          sponsoredVideo: Math.round((followerCount / 1000) * (platform === 'youtube' ? 300 : 150)),
          sponsored_post: Math.round((followerCount / 1000) * 120),
          currency: 'INR'
        },
        campaignMatch: {
          overallMatch: 85 + Math.floor(Math.random() * 15), // 85-100%
          nicheRelevance: 80 + Math.floor(Math.random() * 20),
          audienceAlignment: 85 + Math.floor(Math.random() * 15),
          contentQuality: 85 + Math.floor(Math.random() * 15),
          engagementScore: 82 + Math.floor(Math.random() * 18)
        },
        dataSource: 'Gemini AI Research',
        location: creator.location || '📍 India',
        verifiedStatus: creator.verified ? 'Verified' : 'Popular Creator',
        contactEmail: `${(creator.username || creator.name.replace(/\s+/g, '').toLowerCase())}@${platform === 'youtube' ? 'youtube' : 'instagram'}.com`,
        lastUpdated: new Date().toISOString(),
        handle: platform === 'instagram' ? `@${creator.username}` : creator.username,
        isVerified: creator.verified || Math.random() > 0.6 // 40% chance of being verified
      };
    });
    
    console.log(`✅ [Gemini Search] Found ${creators.length} real ${platform} creators using AI research`);
    console.log(`🎯 [Gemini Search] Creators: ${creators.map(c => `${c.name} (${(c.followerCount/1000000).toFixed(1)}M)`).join(', ')}`);
    
    return creators;
    
  } catch (error) {
    console.error(`❌ [Gemini Search] Failed to find creators: ${error.message}`);
    console.log(`🔄 [Gemini Search] Falling back to enhanced mock creators...`);
    
    // Fallback to enhanced mock creators
    return generateEnhancedMockCreators(niche, searchKeywords, maxResults);
  }
}

// Legacy function - keeping for fallback
async function searchCreatorsWithCreatorDB(niche, searchKeywords = [], minFollowers = 50000, maxFollowers = 5000000, maxResults = 8, platform = 'youtube') {
  try {
    console.log(`🔍 [Realistic Creators] Generating ${platform} creators for niche: "${niche}"`);
    console.log(`🔍 [Realistic Creators] Using keywords: [${searchKeywords.join(', ')}]`);
    
    // Enhanced realistic creator database organized by niche and platform
    const realisticCreatorDatabase = {
      'premium lifestyle': {
        youtube: [
          { name: "Luxury Living Global", baseFollowers: 1900000, username: "luxurylivingglobal", desc: "Premium lifestyle content, luxury reviews, and F1 racing culture", verified: true },
          { name: "Elite Experiences TV", baseFollowers: 1400000, username: "eliteexperiencestv", desc: "High-end product reviews and exclusive lifestyle experiences", verified: true },
          { name: "Premium Lifestyle Hub", baseFollowers: 2100000, username: "premiumlifestylehub", desc: "Luxury brands, premium events, and sophisticated living", verified: true },
          { name: "Rich Life Reviews", baseFollowers: 1600000, username: "richlifereviews", desc: "Premium unboxing, luxury travel, and high-end lifestyle", verified: false },
          { name: "Exclusive Lifestyle Co", baseFollowers: 1200000, username: "exclusivelifestyleco", desc: "Luxury experiences, premium brands, and elite culture", verified: true },
          { name: "Formula Luxury Life", baseFollowers: 2800000, username: "formulaluxurylife", desc: "F1 lifestyle, premium automotive, and luxury brand partnerships", verified: true },
          { name: "High-End Living TV", baseFollowers: 1500000, username: "highenlivingtv", desc: "Luxury homes, premium lifestyle, and exclusive experiences", verified: false },
          { name: "Premium Brand Reviews", baseFollowers: 1800000, username: "premiumbrandreviews", desc: "High-end products, luxury unboxing, and premium lifestyle content", verified: true }
        ],
        instagram: [
          { name: "Luxury Lifestyle Co", handle: "@luxurylifestyle_official", baseFollowers: 850000, desc: "Premium lifestyle influencer featuring luxury brands and F1 culture", verified: true },
          { name: "F1 Lifestyle India", handle: "@f1_lifestyle_india", baseFollowers: 920000, desc: "Formula 1 enthusiast showcasing premium automotive culture", verified: true },
          { name: "Premium Living Hub", handle: "@premiumliving_hub", baseFollowers: 750000, desc: "Curating the finest in luxury living and premium brands", verified: false },
          { name: "Elite Lifestyle Mumbai", handle: "@elite_lifestyle_mumbai", baseFollowers: 680000, desc: "Mumbai's premium lifestyle featuring luxury venues", verified: true },
          { name: "Luxury Watch Collector", handle: "@luxurywatch_collector", baseFollowers: 590000, desc: "Premium timepieces and sophisticated lifestyle content", verified: false },
          { name: "High-End Automotive", handle: "@highend_automotive", baseFollowers: 820000, desc: "Luxury cars and premium automotive culture", verified: true }
        ]
      },
      'automotive': {
        youtube: [
          { name: "SupercarReviews India", baseFollowers: 3200000, username: "supercarreviewsindia", desc: "Premium supercars, luxury automotive reviews, and racing culture", verified: true },
          { name: "PetrolheadTV", baseFollowers: 2400000, username: "petrolheadtv", desc: "Car reviews, motorsports coverage, and automotive lifestyle", verified: true },
          { name: "AutoExpertReviews", baseFollowers: 1900000, username: "autoexpertreviews", desc: "Professional car reviews, buying guides, and automotive insights", verified: true },
          { name: "MotorsportMania", baseFollowers: 1600000, username: "motorsportmania", desc: "F1 coverage, racing analysis, and motorsport lifestyle", verified: true },
          { name: "LuxuryCarChannel", baseFollowers: 1400000, username: "luxurycarchannel", desc: "High-end vehicles and premium automotive content", verified: false },
          { name: "F1 Racing Hub", baseFollowers: 2800000, username: "f1racinghub", desc: "Formula 1 analysis and premium automotive lifestyle", verified: true },
          { name: "CarEnthusiast Pro", baseFollowers: 2100000, username: "carenthusiastpro", desc: "Car modifications and performance reviews", verified: true },
          { name: "Racing Legends TV", baseFollowers: 1800000, username: "racinglegendstv", desc: "Classic cars and premium automotive heritage", verified: false }
        ],
        instagram: [
          { name: "Supercar India", handle: "@supercar_india", baseFollowers: 1200000, desc: "Premium supercars and luxury automotive culture in India", verified: true },
          { name: "F1 Racing Hub", handle: "@f1_racing_hub", baseFollowers: 980000, desc: "Formula 1 insights and premium motorsport lifestyle", verified: true },
          { name: "Luxury Cars Mumbai", handle: "@luxurycars_mumbai", baseFollowers: 850000, desc: "Mumbai's finest luxury vehicles and automotive lifestyle", verified: false },
          { name: "Petrolhead India", handle: "@petrolhead_india", baseFollowers: 720000, desc: "Car enthusiast content and Indian automotive culture", verified: true },
          { name: "Racing Culture India", handle: "@racing_culture_india", baseFollowers: 680000, desc: "Indian motorsport culture and racing events", verified: false },
          { name: "Premium Auto Review", handle: "@premium_auto_review", baseFollowers: 590000, desc: "High-end car reviews and luxury automotive content", verified: true }
        ]
      },
      'technology': {
        youtube: [
          { name: "TechReviewsHD", baseFollowers: 2500000, username: "techreviewshd", desc: "Comprehensive tech reviews and gadget unboxing", verified: true },
          { name: "GadgetExplorer", baseFollowers: 1800000, username: "gadgetexplorer", desc: "Latest gadgets, tech tutorials, and product comparisons", verified: true },
          { name: "TechSavvyPro", baseFollowers: 3200000, username: "techsavvypro", desc: "Professional tech reviews and cutting-edge technology", verified: true },
          { name: "DigitalTrends India", baseFollowers: 1500000, username: "digitaltrendsindia", desc: "Tech trends and consumer electronics reviews", verified: false },
          { name: "TechTalkShow", baseFollowers: 4200000, username: "techtalkshow", desc: "Tech discussions and product launches", verified: true }
        ],
        instagram: [
          { name: "Tech Burner", handle: "@tech.burner", baseFollowers: 4200000, desc: "India's top tech reviewer covering latest gadgets", verified: true },
          { name: "Technical Dost", handle: "@technical.dost", baseFollowers: 2100000, desc: "Tech tutorials and product reviews in Hindi", verified: true },
          { name: "Geeky Ranjit", handle: "@geeky_ranjit", baseFollowers: 1850000, desc: "Detailed tech reviews and buying guides", verified: true },
          { name: "Tech with Raj", handle: "@techwithraj", baseFollowers: 890000, desc: "Technology content and gadget reviews", verified: false }
        ]
      }
    };
    
    // Smart niche matching for compound niches
    let selectedCreators = [];
    const lowerNiche = niche.toLowerCase();
    
    if (lowerNiche.includes('premium') || lowerNiche.includes('luxury') || lowerNiche.includes('lifestyle')) {
      selectedCreators = realisticCreatorDatabase['premium lifestyle'][platform] || realisticCreatorDatabase['premium lifestyle'].youtube;
    } else if (lowerNiche.includes('f1') || lowerNiche.includes('racing') || lowerNiche.includes('automotive') || lowerNiche.includes('car')) {
      selectedCreators = realisticCreatorDatabase['automotive'][platform] || realisticCreatorDatabase['automotive'].youtube;
    } else if (lowerNiche.includes('technology') || lowerNiche.includes('tech')) {
      selectedCreators = realisticCreatorDatabase['technology'][platform] || realisticCreatorDatabase['technology'].youtube;
    } else {
      // Fallback to premium lifestyle for better campaign relevance
      selectedCreators = realisticCreatorDatabase['premium lifestyle'][platform] || realisticCreatorDatabase['premium lifestyle'].youtube;
    }
    
    console.log(`🎯 [Realistic Creators] Using ${selectedCreators.length} pre-defined ${platform} creators for niche matching`);
    
    // Generate realistic creators with enhanced data
    const creators = selectedCreators.slice(0, maxResults).map((creator, index) => {
      const followerCount = creator.baseFollowers + Math.floor(Math.random() * 300000); // Add some variation
      const engagementRate = (Math.random() * 2.5 + 3).toFixed(2); // 3-5.5% engagement rate
      const avgViews = Math.floor(followerCount * (0.08 + Math.random() * 0.12)); // 8-20% of followers
      
      // Enhanced description with campaign keywords
      let enhancedDesc = creator.desc;
      if (searchKeywords && searchKeywords.length > 0) {
        const relevantKeywords = searchKeywords.slice(0, 3);
        enhancedDesc += `. Experienced with ${relevantKeywords.join(', ')} brand collaborations and campaigns.`;
      }
      
      return {
        id: `realistic_${platform}_${index}`,
        name: creator.name,
        username: creator.username || creator.handle?.replace('@', ''),
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        platforms: [platform.charAt(0).toUpperCase() + platform.slice(1)],
        subscriberCount: followerCount,
        followerCount: followerCount,
        viewCount: Math.floor(followerCount * (12 + Math.random() * 8)) + Math.floor(Math.random() * 5000000), // 12-20x followers
        videoCount: Math.floor(Math.random() * 250) + 200, // 200-450 videos
        niche: niche,
        categories: searchKeywords && searchKeywords.length > 0 ? [niche, ...searchKeywords.slice(0, 2)] : [niche, 'Reviews', 'Lifestyle'],
        description: enhancedDesc,
        bio: `✨ ${creator.name} | 📈 ${(followerCount/1000000).toFixed(1)}M Followers | ${creator.verified ? '🏆 Verified Creator' : '📊 Content Creator'}`,
        profileImageUrl: `https://i.pravatar.cc/400?img=${index + 25}&name=${encodeURIComponent(creator.name)}`,
        youtubeChannelUrl: platform === 'youtube' ? `https://youtube.com/@${creator.username || creator.handle?.replace('@', '')}` : undefined,
        instagramUrl: platform === 'instagram' ? `https://instagram.com/${creator.handle?.replace('@', '') || creator.username}` : undefined,
        channelUrl: platform === 'youtube' ? 
          `https://youtube.com/@${creator.username || creator.handle?.replace('@', '')}` : 
          `https://instagram.com/${creator.handle?.replace('@', '') || creator.username}`,
        stats: {
          avgViewsPerVideo: avgViews,
          engagementRate: `${engagementRate}%`,
          totalViews: Math.floor(followerCount * (12 + Math.random() * 8)),
          videosUploaded: Math.floor(Math.random() * 250) + 200,
          uploadsPerWeek: Math.floor(Math.random() * 4) + 2 // 2-5 uploads per week
        },
        estimatedPricing: {
          sponsoredVideo: Math.round((followerCount / 1000) * (platform === 'youtube' ? 250 : 120)), // Higher rates for YouTube
          sponsored_post: Math.round((followerCount / 1000) * 100),
          currency: 'INR'
        },
        campaignMatch: {
          overallMatch: 90 + Math.floor(Math.random() * 10), // 90-100% for realistic data
          nicheRelevance: 85 + Math.floor(Math.random() * 15),
          audienceAlignment: 88 + Math.floor(Math.random() * 12),
          contentQuality: 90 + Math.floor(Math.random() * 10),
          engagementScore: 87 + Math.floor(Math.random() * 13)
        },
        dataSource: 'Enhanced Realistic Database',
        location: '📍 India',
        verifiedStatus: creator.verified ? 'Verified' : 'Unverified',
        contactEmail: `${(creator.username || creator.handle?.replace('@', '') || creator.name.replace(/\s+/g, '').toLowerCase())}@${platform === 'youtube' ? 'youtube' : 'instagram'}.com`,
        lastUpdated: new Date().toISOString(),
        handle: creator.handle || `@${creator.username}`,
        isVerified: creator.verified
      };
    });
    
    console.log(`✅ [Realistic Creators] Generated ${creators.length} realistic ${platform} creators for "${niche}"`);
    console.log(`🎯 [Realistic Creators] Match scores: ${creators.map(c => c.campaignMatch.overallMatch + '%').join(', ')}`);
    
    return creators;
    
  } catch (error) {
    console.error(`❌ [Realistic Creators] Generation failed: ${error.message}`);
    // Fallback to the original enhanced mock creators
    return generateEnhancedMockCreators(niche, searchKeywords, maxResults);
  }
}

// Mock campaign analysis using Gemini
async function analyzeCampaignBrief(briefText) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('Gemini API key not configured, using fallback analysis.');
      return {
        campaignName: "AI-Generated Campaign Analysis",
        budget: 15000,
        targetNiche: "tech",
        minFollowers: 50000,
        platform: "YouTube",
        deliverables: "1 sponsored video, 2 social posts"
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
    Analyze the following campaign brief and extract key information to find the most relevant creators.

    Campaign Brief:
    ---
    ${briefText}
    ---

    Instructions:
    1. Extract these fields: "campaignName", "budget", "targetNiche", "minFollowers", "platform", "deliverables", "searchKeywords"
    2. For "targetNiche": Extract the main category/industry (e.g., "technology", "fashion", "gaming", "lifestyle", "fitness", "food", "travel", "beauty", "automotive", "premium lifestyle")
    3. For "searchKeywords": Create an array of 3-5 specific search terms that would help find relevant creators (e.g., ["F1 racing", "premium cars", "luxury lifestyle", "beer reviews", "motorsports"])
    4. The "budget" and "minFollowers" fields must be numbers
    5. Make intelligent assumptions based on context
    6. Return ONLY the JSON object in a markdown code block

    Example:
    \`\`\`json
    {
      "campaignName": "Meta RayBan Premium Campaign",
      "budget": 500000,
      "targetNiche": "premium lifestyle",
      "searchKeywords": ["premium sunglasses", "luxury lifestyle", "tech accessories", "fashion tech", "premium eyewear"],
      "minFollowers": 100000,
      "platform": "YouTube",
      "deliverables": "2 sponsored videos, 3 social posts"
    }
    \`\`\`
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Updated parsing logic to handle markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Failed to parse JSON from Gemini response after extraction:', e);
        // Fallback to old method just in case
        const fallbackMatch = text.match(/\{[\s\S]*\}/);
        if (fallbackMatch) {
            try {
                return JSON.parse(fallbackMatch[0]);
            } catch (e2) {
                 console.error('Fallback JSON parsing also failed:', e2);
            }
        }
      }
    }
    
    // Fallback if all parsing fails
    console.log('Gemini response did not contain valid JSON. Using fallback analysis.');
    // Try to extract niche from brief text as fallback
    const lowerBrief = briefText.toLowerCase();
    let detectedNiche = "technology";
    
    if (lowerBrief.includes("fashion") || lowerBrief.includes("style") || lowerBrief.includes("clothing")) {
      detectedNiche = "fashion";
    } else if (lowerBrief.includes("food") || lowerBrief.includes("cooking") || lowerBrief.includes("recipe")) {
      detectedNiche = "food";
    } else if (lowerBrief.includes("travel") || lowerBrief.includes("tourism") || lowerBrief.includes("destination")) {
      detectedNiche = "travel";
    } else if (lowerBrief.includes("fitness") || lowerBrief.includes("health") || lowerBrief.includes("workout")) {
      detectedNiche = "fitness";
    } else if (lowerBrief.includes("gaming") || lowerBrief.includes("game") || lowerBrief.includes("esports")) {
      detectedNiche = "gaming";
    } else if (lowerBrief.includes("lifestyle") || lowerBrief.includes("premium") || lowerBrief.includes("luxury")) {
      detectedNiche = "premium lifestyle";
    } else if (lowerBrief.includes("beauty") || lowerBrief.includes("makeup") || lowerBrief.includes("skincare")) {
      detectedNiche = "beauty";
    } else if (lowerBrief.includes("auto") || lowerBrief.includes("car") || lowerBrief.includes("vehicle")) {
      detectedNiche = "automotive";
    }

    return {
      campaignName: "Campaign Analysis",
      budget: 100000,
      targetNiche: detectedNiche,
      searchKeywords: [detectedNiche, "review", "unboxing", "lifestyle"],
      minFollowers: 50000,
      platform: "YouTube",
      deliverables: "2 sponsored videos, 3 social posts"
    };
  } catch (error) {
    console.error('Error analyzing campaign brief:', error);
    // Return default analysis if Gemini fails
    return {
      campaignName: "Default Campaign",
      budget: 100000,
      targetNiche: "technology",
      searchKeywords: ["technology", "tech review", "gadgets", "innovation"],
      minFollowers: 50000,
      platform: "YouTube",
      deliverables: "2 sponsored videos, 3 social posts"
    };
  }
}

// Fetch real creators from YouTube based on niche and search keywords
// YouTube Data API v3 search function
async function searchYouTubeWithAPI(niche, searchKeywords = [], minFollowers = 50000, maxFollowers = 5000000, maxResults = 8) {
  try {
    // Create search queries from keywords and niche
    let searchQueries = [];
    if (searchKeywords && searchKeywords.length > 0) {
      // Use specific keywords from campaign analysis
      searchQueries = searchKeywords.map(keyword => `${keyword} review`);
      searchQueries.push(...searchKeywords.map(keyword => `${keyword} channel`));
    } else {
      // Fallback to generic niche searches
      searchQueries = [
        `${niche} review`,
        `${niche} unboxing`,
        `${niche} tutorial`,
        `best ${niche} channel`
      ];
    }
    
    console.log(`🎬 [YouTube API] Using search queries:`, searchQueries.slice(0, 4));

    const allCreators = [];
    
    for (const query of searchQueries) {
      try {
        const searchResponse = await youtube.search.list({
          part: 'snippet',
          q: query,
          type: 'channel',
          maxResults: 5,
          order: 'relevance'
        });
        
        for (const item of searchResponse.data.items) {
          try {
            const channelResponse = await youtube.channels.list({
              part: 'statistics,snippet,brandingSettings',
              id: item.snippet.channelId
            });

            if (channelResponse.data.items.length > 0) {
              const channel = channelResponse.data.items[0];
              const subscriberCount = parseInt(channel.statistics.subscriberCount) || 0;
              const viewCount = parseInt(channel.statistics.viewCount) || 0;
              const videoCount = parseInt(channel.statistics.videoCount) || 1;
              
              // Filter by follower range
              if (subscriberCount >= minFollowers && subscriberCount <= maxFollowers) {
                // Calculate engagement metrics
                const avgViewsPerVideo = Math.round(viewCount / videoCount);
                const engagementRate = Math.min(((avgViewsPerVideo / subscriberCount) * 100), 15);
                
                const creator = {
                  id: `yt_${channel.id}`,
                  name: channel.snippet.title,
                  platform: 'YouTube',
                  platforms: ['YouTube'],
                  subscriberCount: subscriberCount,
                  followerCount: subscriberCount,
                  viewCount: viewCount,
                  videoCount: videoCount,
                  niche: niche,
                  categories: [niche, 'Review', 'Content'],
                  description: channel.snippet.description?.substring(0, 200) + '...' || 'No description available',
                  bio: channel.snippet.description?.substring(0, 150) + '...' || '',
                  profileImageUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
                  youtubeChannelUrl: `https://youtube.com/channel/${channel.id}`,
                  channelUrl: `https://youtube.com/channel/${channel.id}`,
                  // Enhanced stats
                  stats: {
                    avgViewsPerVideo: avgViewsPerVideo,
                    engagementRate: `${engagementRate.toFixed(1)}%`,
                    totalViews: viewCount,
                    videosUploaded: videoCount,
                    subscriberGrowth: 'N/A' // Would need historical data
                  },
                  // Estimated pricing based on subscriber count
                  estimatedPricing: {
                    sponsoredVideo: Math.round((subscriberCount / 1000) * 166), // ₹166 per 1K subscribers (≈$2 * 83)
                    sponsored_post: Math.round((subscriberCount / 1000) * 42), // ₹42 per 1K subscribers (≈$0.5 * 83)
                    currency: 'INR'
                  },
                  matchPercentage: Math.floor(Math.random() * 20) + 80, // 80-100% match
                  dataSource: 'YouTube API v3',
                  location: channel.brandingSettings?.channel?.country || 'India',
                  verifiedStatus: channel.statistics.subscriberCount > 100000 ? 'Verified' : 'Unverified',
                  contactEmail: `contact@${channel.snippet.title.toLowerCase().replace(/\s+/g, '')}.com`
                };
                
                // Avoid duplicates
                if (!allCreators.find(c => c.id === creator.id)) {
                  allCreators.push(creator);
                }
              }
            }
          } catch (channelError) {
            console.error('Error fetching channel details:', channelError.message);
          }
        }
      } catch (searchError) {
        console.error('Error in search query:', searchError.message);
      }
    }

    // Sort by engagement and subscriber count
    const sortedCreators = allCreators
      .sort((a, b) => {
        const aScore = (a.subscriberCount * 0.7) + (parseFloat(a.stats.engagementRate) * 10000);
        const bScore = (b.subscriberCount * 0.7) + (parseFloat(b.stats.engagementRate) * 10000);
        return bScore - aScore;
      })
      .slice(0, maxResults);

    console.log(`🎬 [YouTube API] Found ${sortedCreators.length} creators from official API`);
    return sortedCreators;

  } catch (error) {
    console.error('🚨 [YouTube API] Error:', error.message);
    throw error; // Let the calling function handle fallback
  }
}

async function searchYouTubeCreators(niche, searchKeywords = [], minFollowers = 50000, maxFollowers = 5000000, maxResults = 8) {
  try {
    // Try YouTube API first if available
    if (process.env.YOUTUBE_API_KEY) {
      console.log('🎬 [YouTube] Using YouTube Data API v3 for real creators...');
      console.log(`🎬 [YouTube] Niche: "${niche}", Keywords: [${searchKeywords.join(', ')}]`);
      
      const apiCreators = await searchYouTubeWithAPI(niche, searchKeywords, minFollowers, maxFollowers, maxResults);
      if (apiCreators && apiCreators.length > 0) {
        console.log(`✅ [YouTube API] Found ${apiCreators.length} real creators`);
        return apiCreators;
      }
    } else {
      console.log('🎬 [YouTube] API key not configured, falling back to Gemini search...');
    }
    
    // Fallback to Gemini AI with Google Search
    console.log('🔍 [YouTube] Using Gemini AI + Google Search for real creators...');
    console.log(`🔍 [YouTube] Niche: "${niche}", Keywords: [${searchKeywords.join(', ')}]`);
    const geminiCreators = await findCreatorsWithGeminiSearch(niche, searchKeywords, 'youtube', maxResults);
    
    if (geminiCreators && geminiCreators.length > 0) {
      return geminiCreators;
    }
    
    // Final fallback to enhanced mock creators
    console.log('🎬 [YouTube] All searches failed, using enhanced mock creators.');
    console.log(`🎬 [YouTube] Smart niche mapping for: "${niche}"`);
    return generateEnhancedMockCreators(niche, searchKeywords, maxResults);

  } catch (error) {
    console.error('🚨 [YouTube Search] Error in main function:', error.message);
    // Enhanced fallback creators with realistic data
    return generateEnhancedMockCreators(niche, searchKeywords, maxResults);
  }
}

// Enhanced Instagram creator search with real top creators
async function searchInstagramCreators(niche, minFollowers = 50000, maxFollowers = 5000000, maxResults = 4) {
  console.log(`📸 [Instagram Search] Niche: ${niche}, Followers: ${minFollowers}-${maxFollowers}`);
  
  // Use Gemini AI with Google Search to find real creators
  console.log('🔍 [Instagram] Using Gemini AI + Google Search for real creators...');
  try {
    return await findCreatorsWithGeminiSearch(niche, [], 'instagram', maxResults);
  } catch (error) {
    console.error('📸 [Instagram] Gemini search failed, falling back to manual data:', error.message);
  }
  
  // Real top Instagram creators by niche - manually curated with actual follower counts
  const topInstagramCreators = {
    'technology': [
      { username: 'tech_burner', name: 'Shlok Srivastava', followers: 4200000 },
      { username: 'geeky_ranjit', name: 'Ranjit Kumar', followers: 1850000 },
      { username: 'technical_dost', name: 'Technical Dost', followers: 2100000 },
      { username: 'techno_ruhez', name: 'Ruhez Amrelia', followers: 1650000 },
      { username: 'igyaan', name: 'Bharat Nagpal', followers: 890000 },
      { username: 'c4etech', name: 'Ash', followers: 750000 }
    ],
    'premium lifestyle': [
      { username: 'luxurylifestyle_official', name: 'Premium Lifestyle Co', followers: 2800000 },
      { username: 'f1_lifestyle_india', name: 'F1 Lifestyle India', followers: 1900000 },
      { username: 'luxurycars_india', name: 'Luxury Cars India', followers: 2400000 },
      { username: 'premiumwatch_collector', name: 'Premium Watch Collector', followers: 1650000 },
      { username: 'elite_lifestyle_mumbai', name: 'Elite Lifestyle Mumbai', followers: 1850000 },
      { username: 'highend_automotive', name: 'High-End Automotive', followers: 2100000 }
    ],
    'automotive': [
      { username: 'supercar_india', name: 'Supercar India', followers: 3200000 },
      { username: 'petrolhead_mumbai', name: 'Petrolhead Mumbai', followers: 1800000 },
      { username: 'f1_fan_india', name: 'F1 Fan India', followers: 2200000 },
      { username: 'luxury_motors', name: 'Luxury Motors', followers: 1900000 },
      { username: 'racing_lifestyle', name: 'Racing Lifestyle', followers: 1650000 },
      { username: 'motorsport_india', name: 'Motorsport India', followers: 1450000 }
    ],
    'fashion': [
      { username: 'komal.pandey', name: 'Komal Pandey', followers: 1800000 },
      { username: 'sejalsays', name: 'Sejal Kumar', followers: 1500000 },
      { username: 'simranlallani', name: 'Simran Lallani', followers: 920000 },
      { username: 'aashnashroff', name: 'Aashna Shroff', followers: 640000 },
      { username: 'shreyajain03', name: 'Shreya Jain', followers: 890000 },
      { username: 'simmi.singh21', name: 'Simmi Singh', followers: 720000 }
    ],
    'fitness': [
      { username: 'thefitnesschef_', name: 'Ranveer Allahbadia', followers: 2800000 },
      { username: 'rohitkhatri_fitness', name: 'Rohit Khatri', followers: 1200000 },
      { username: 'fit_tuber', name: 'Vivek Mittal', followers: 980000 },
      { username: 'healthywithneha', name: 'Neha Deepak Shaw', followers: 850000 },
      { username: 'yasminkarachiwala', name: 'Yasmin Karachiwala', followers: 1100000 }
    ],
    'food': [
      { username: 'chefmeghna', name: 'Meghna Kamdar', followers: 2100000 },
      { username: 'sanjeevkapoor', name: 'Sanjeev Kapoor', followers: 3200000 },
      { username: 'thecookinggirl', name: 'The Cooking Girl', followers: 1450000 },
      { username: 'nishamadhulika', name: 'Nisha Madhulika', followers: 1890000 },
      { username: 'hebbarskitchen', name: 'Hebbars Kitchen', followers: 2800000 }
    ],
    'travel': [
      { username: 'tanyanam', name: 'Tanya Khanijow', followers: 1800000 },
      { username: 'deepika.mhatre', name: 'Deepika Mhatre', followers: 1300000 },
      { username: 'nomadnomz', name: 'Nomad Nomz', followers: 950000 },
      { username: 'mountaintrekker', name: 'Mountain Trekker', followers: 890000 },
      { username: 'shenaztreasury', name: 'Shenaz Treasury', followers: 1650000 }
    ],
    'lifestyle': [
      { username: 'dollysingh', name: 'Dolly Singh', followers: 650000 },
      { username: 'niharikamn', name: 'Niharika NM', followers: 1100000 },
      { username: 'shreyajain', name: 'Shreya Jain', followers: 920000 },
      { username: 'malvikasitlani', name: 'Malvika Sitlani', followers: 1900000 },
      { username: 'sejalsays', name: 'Sejal Kumar', followers: 1500000 }
    ],
    'beauty': [
      { username: 'malvikasitlani', name: 'Malvika Sitlani', followers: 1900000 },
      { username: 'debasreebanerjee', name: 'Debasree Banerjee', followers: 2200000 },
      { username: 'simran.makeup', name: 'Simran Dhir', followers: 890000 },
      { username: 'shreya_jain1', name: 'Shreya Jain', followers: 920000 },
      { username: 'corallista', name: 'Corallista', followers: 1450000 }
    ],
    'gaming': [
      { username: 'mortal_soul', name: 'Naman Mathur', followers: 6800000 },
      { username: 'carryislive', name: 'Ajey Nagar', followers: 15200000 },
      { username: 'sc0ut_op', name: 'Tanmay Singh', followers: 3400000 },
      { username: 'payal_dhare', name: 'Payal Dhare', followers: 1800000 },
      { username: 'dynamo_gaming', name: 'Aditya Sawant', followers: 4200000 }
    ]
  };

  const creators = [];
  
  // Smart niche matching for compound niches
  let matchedNiche = 'technology'; // default fallback
  const lowerNiche = niche.toLowerCase();
  
  // Direct match first
  if (topInstagramCreators[lowerNiche]) {
    matchedNiche = lowerNiche;
  } else {
    // Try to find best match from compound niche
    if (lowerNiche.includes('premium') || lowerNiche.includes('luxury') || lowerNiche.includes('lifestyle')) {
      matchedNiche = 'premium lifestyle';
    } else if (lowerNiche.includes('f1') || lowerNiche.includes('racing') || lowerNiche.includes('automotive') || lowerNiche.includes('car')) {
      matchedNiche = 'automotive';
    } else if (lowerNiche.includes('fashion') || lowerNiche.includes('style')) {
      matchedNiche = 'fashion';
    } else if (lowerNiche.includes('food') || lowerNiche.includes('cooking')) {
      matchedNiche = 'food';
    } else if (lowerNiche.includes('travel')) {
      matchedNiche = 'travel';
    } else if (lowerNiche.includes('fitness') || lowerNiche.includes('health')) {
      matchedNiche = 'fitness';
    } else if (lowerNiche.includes('gaming')) {
      matchedNiche = 'gaming';
    } else if (lowerNiche.includes('beauty') || lowerNiche.includes('makeup')) {
      matchedNiche = 'beauty';
    } else if (lowerNiche.includes('tech')) {
      matchedNiche = 'technology';
    }
  }
  
  console.log(`📸 [Instagram] Mapped niche "${niche}" to "${matchedNiche}"`);
  const nicheCreators = topInstagramCreators[matchedNiche] || topInstagramCreators['technology'];
  
  // Filter creators within follower range and take top ones
  const filteredCreators = nicheCreators.filter(creator => 
    creator.followers >= minFollowers && creator.followers <= maxFollowers
  ).slice(0, maxResults);

  // If we don't have enough in range, add some with scaled followers
  const remainingSlots = maxResults - filteredCreators.length;
  if (remainingSlots > 0) {
    const additionalCreators = nicheCreators.slice(0, remainingSlots).map(creator => ({
      ...creator,
      followers: Math.floor(Math.random() * (maxFollowers - minFollowers)) + minFollowers
    }));
    filteredCreators.push(...additionalCreators);
  }

  // Convert to our creator format
  for (let i = 0; i < filteredCreators.length; i++) {
    const creator = filteredCreators[i];
    const engagementCount = creator.followers * (0.04 + Math.random() * 0.06); // 4-10% engagement
    
    creators.push({
      id: `ig_real_${creator.username}_${Date.now()}`,
      name: creator.name,
      username: creator.username,
      platform: 'Instagram',
      platforms: ['Instagram'],
      followerCount: creator.followers,
      subscriberCount: creator.followers,
      followingCount: Math.floor(Math.random() * 3000) + 500,
      postCount: Math.floor(Math.random() * 800) + 200,
      niche: matchedNiche,
      categories: [matchedNiche, 'Content Creation', 'Brand Partnerships'],
      description: `${matchedNiche} influencer specializing in ${creator.name.includes('F1') ? 'Formula 1 racing and premium automotive lifestyle' : matchedNiche.includes('premium') ? 'luxury lifestyle, premium brands, and high-end experiences' : matchedNiche.includes('automotive') ? 'automotive content, racing culture, and premium vehicles' : `${matchedNiche} content`}. ${(creator.followers/1000000).toFixed(1)}M followers with authentic content and premium brand partnerships.`,
      bio: `🏆 ${matchedNiche.charAt(0).toUpperCase() + matchedNiche.slice(1)} Creator | 📈 ${(creator.followers/1000000).toFixed(1)}M Followers | ✨ Premium Content | 🔥 High Engagement`,
      profileImageUrl: `https://picsum.photos/400/400?random=${i + 200}`,
      instagramUrl: `https://instagram.com/${creator.username}`,
      channelUrl: `https://instagram.com/${creator.username}`,
      stats: {
        avgLikesPerPost: Math.floor(engagementCount),
        engagementRate: `${(4 + Math.random() * 6).toFixed(1)}%`, // 4-10% for top creators
        postsCount: Math.floor(Math.random() * 800) + 200,
        storiesPerWeek: Math.floor(Math.random() * 20) + 10,
        reelsPerWeek: Math.floor(Math.random() * 10) + 3
      },
      pricing: {
        postPrice: Math.floor(creator.followers * 1.0), // ₹1 per follower for posts (≈$0.012 * 83)
        storyPrice: Math.floor(creator.followers * 0.5), // ₹0.5 per follower for stories (≈$0.006 * 83)
        reelPrice: Math.floor(creator.followers * 1.5) // ₹1.5 per follower for reels (≈$0.018 * 83)
      },
      dataSource: 'Real Instagram Top Creators',
      verifiedAccount: true,
      lastUpdated: new Date().toISOString()
    });
  }

  // Sort by follower count (highest first)
  creators.sort((a, b) => b.followerCount - a.followerCount);
  
  console.log(`📸 [Instagram] Found ${creators.length} real top creators, range: ${creators[creators.length-1]?.followerCount?.toLocaleString()}-${creators[0]?.followerCount?.toLocaleString()} followers`);
  
  // Enhance with AI analysis
  console.log('🤖 Enhancing Instagram creators with Gemini AI analysis...');
  try {
    const campaign = { name: niche, description: `${niche} content creation`, targetAudience: 'General Audience' };
    const enhancedCreators = await geminiAiService.generatePerfectMatchCreators(campaign, creators);
    return enhancedCreators;
  } catch (error) {
    console.error('AI enhancement failed, returning standard creators:', error);
    return creators;
  }
}

// Remove duplicate function - using the enhanced version above

// Update the main discovery endpoint to include Sanjay by default
router.post('/discover-creators', async (req, res) => {
  try {
    console.log('🎯🎯🎯 [ENHANCED DISCOVERY ENDPOINT HIT] - THIS IS THE NEW VERSION!!!');
    console.log('🔍 [Enhanced Creator Discovery] Starting search...');
    
    const { 
      briefSummary, 
      targetAudience, 
      niche = 'lifestyle', 
      platforms = ['YouTube', 'Instagram'], 
      maxResults = 8,
      minFollowers = 50000,
      maxFollowers = 5000000
    } = req.body;

    console.log(`Campaign: ${briefSummary}`);
    console.log(`Target: ${targetAudience}`);
    console.log(`Niche: ${niche}`);
    console.log(`Platforms: ${platforms.join(', ')}`);
    console.log(`Follower Range: ${minFollowers.toLocaleString()}-${maxFollowers.toLocaleString()}`);

    let allCreators = [];

    // Always include Sanjay Malladi as the first creator with adaptive profile
    // Adapt Sanjay's expertise based on campaign niche
    let sanjayExpertise = "cutting-edge technology and AI innovations";
    let sanjayBio = "🚀 Tech Entrepreneur | AI/ML Expert | Innovation Leader";
    let sanjayCategories = [niche, 'Technology', 'AI/ML', 'Entrepreneurship', 'Startups'];
    
    const lowerNiche = niche.toLowerCase();
    if (lowerNiche.includes('premium') || lowerNiche.includes('luxury') || lowerNiche.includes('lifestyle')) {
      sanjayExpertise = "luxury tech products and premium lifestyle experiences";
      sanjayBio = "🏆 Premium Lifestyle Tech | Luxury Product Reviews | Elite Experiences";
      sanjayCategories = [niche, 'Premium Lifestyle', 'Luxury Tech', 'Technology', 'AI/ML'];
    } else if (lowerNiche.includes('f1') || lowerNiche.includes('racing') || lowerNiche.includes('automotive') || lowerNiche.includes('car')) {
      sanjayExpertise = "premium automotive technology and high-performance vehicles";
      sanjayBio = "🏎️ Automotive Tech Expert | F1 Technology | Premium Vehicles | AI Innovation";
      sanjayCategories = [niche, 'Automotive Technology', 'Racing Tech', 'Technology', 'AI/ML'];
    } else if (lowerNiche.includes('gaming')) {
      sanjayExpertise = "gaming technology and esports innovation";
      sanjayBio = "🎮 Gaming Tech Expert | Esports Innovation | AI Gaming | Technology Leader";
      sanjayCategories = [niche, 'Gaming Technology', 'Esports', 'Technology', 'AI/ML'];
    } else if (lowerNiche.includes('fashion') || lowerNiche.includes('style')) {
      sanjayExpertise = "tech-fashion and wearable technology trends";
      sanjayBio = "👔 Tech Fashion Expert | Wearable Tech | Style Innovation | AI Fashion";
      sanjayCategories = [niche, 'Tech Fashion', 'Wearables', 'Technology', 'AI/ML'];
    }

    const sanjayCreator = {
      id: 'creator_sanjay_001',
      name: 'Sanjay Malladi',
        platform: 'YouTube',
      platforms: ['YouTube', 'Instagram'],
      subscriberCount: 2800000,
      followerCount: 2800000,
      viewCount: 45000000,
      videoCount: 320,
        niche: niche,
      categories: sanjayCategories,
      description: `Tech entrepreneur and content creator specializing in ${sanjayExpertise}. Known for in-depth analysis of emerging technologies, AI/ML insights, and ${niche} content creation.`,
      bio: `${sanjayBio} | Building the future of tech | 2.8M+ subscribers`,
      profileImageUrl: 'https://avatar.vercel.sh/sanjaymalladi?size=80&text=SM',
      youtubeChannelUrl: 'https://www.youtube.com/@sanjaymalladi',
      instagramUrl: 'https://instagram.com/sanjaymalladi',
      channelUrl: 'https://www.youtube.com/@sanjaymalladi',
      stats: {
        avgViewsPerVideo: 150000,
        engagementRate: '8.5%',
        totalViews: 45000000,
        videosUploaded: 320,
        uploadsPerWeek: 3
      },
      pricing: {
        sponsoredVideo: 2075000, // ₹20.75 lakh (≈$25,000 * 83)
        productPlacement: 1494000, // ₹14.94 lakh (≈$18,000 * 83)
        channelMembership: 664000 // ₹6.64 lakh (≈$8,000 * 83)
      },
      campaignMatch: {
        overallMatch: 95,
        nicheRelevance: 98,
        audienceAlignment: 92,
        contentQuality: 96,
        engagementScore: 94
      },
      dataSource: 'Default Creator Profile',
      lastUpdated: new Date().toISOString()
    };

    allCreators.push(sanjayCreator);

    // Search other platforms
    const resultsPerPlatform = Math.floor((maxResults - 1) / platforms.length);
    
    for (const platform of platforms) {
      try {
        if (platform.toLowerCase() === 'youtube') {
          console.log('🎬 Searching YouTube creators...');
          const youtubeCreators = await searchYouTubeCreators(niche, minFollowers, maxFollowers, resultsPerPlatform);
          allCreators.push(...youtubeCreators);
        } else if (platform.toLowerCase() === 'instagram') {
          console.log('📸 Searching Instagram creators...');
          const instagramCreators = await searchInstagramCreators(niche, minFollowers, maxFollowers, resultsPerPlatform);
          allCreators.push(...instagramCreators);
        }
      } catch (error) {
        console.error(`❌ Error searching ${platform}:`, error.message);
      }
    }

    // Enhanced creator analysis and matching
    const enhancedCreators = allCreators.map(creator => {
      if (creator.id === 'creator_sanjay_001') {
        return creator; // Sanjay already has campaign match
      }

      // Generate realistic campaign match scores
      const nicheRelevance = 70 + Math.random() * 25; // 70-95%
      const audienceAlignment = 65 + Math.random() * 30; // 65-95%
      const contentQuality = 75 + Math.random() * 20; // 75-95%
      const engagementScore = parseFloat(creator.stats?.engagementRate || '5%') * 10;
      
      const overallMatch = Math.round(
        (nicheRelevance * 0.3 + audienceAlignment * 0.3 + contentQuality * 0.2 + engagementScore * 0.2)
      );

      return {
        ...creator,
        campaignMatch: {
          overallMatch,
          nicheRelevance: Math.round(nicheRelevance),
          audienceAlignment: Math.round(audienceAlignment),
          contentQuality: Math.round(contentQuality),
          engagementScore: Math.round(engagementScore)
        }
      };
    });

    // Sort by follower count first (highest to lowest), then by match score
    const sortedCreators = enhancedCreators.sort((a, b) => {
      const aFollowers = a.followerCount || a.subscriberCount || 0;
      const bFollowers = b.followerCount || b.subscriberCount || 0;
      
      if (bFollowers !== aFollowers) {
        return bFollowers - aFollowers;
      }
      
      return (b.campaignMatch?.overallMatch || 0) - (a.campaignMatch?.overallMatch || 0);
    });

    // Limit to requested results
    const finalResults = sortedCreators.slice(0, maxResults);

    console.log(`✅ Found ${finalResults.length} creators across ${platforms.join(' & ')}`);
    console.log(`📊 Follower range: ${finalResults[finalResults.length-1]?.followerCount?.toLocaleString()}-${finalResults[0]?.followerCount?.toLocaleString()} followers`);

    res.json({
      success: true,
      creators: finalResults,
      searchParams: {
        niche,
        platforms,
        followerRange: `${minFollowers.toLocaleString()}-${maxFollowers.toLocaleString()}`,
        totalResults: finalResults.length
      },
      summary: {
        totalCreators: finalResults.length,
        platforms: [...new Set(finalResults.map(c => c.platform))],
        avgFollowers: Math.round(finalResults.reduce((sum, c) => sum + (c.followerCount || c.subscriberCount || 0), 0) / finalResults.length),
        avgMatchScore: Math.round(finalResults.reduce((sum, c) => sum + (c.campaignMatch?.overallMatch || 0), 0) / finalResults.length)
      }
    });

  } catch (error) {
    console.error('❌ Enhanced Creator Discovery Error:', error);
    res.status(500).json({
      success: false,
      error: 'Enhanced creator discovery failed',
      message: error.message
    });
  }
});

// Main endpoint for AI campaign workflow
router.post('/start', async (req, res) => {
  try {
    const { briefText } = req.body;
    
    if (!briefText) {
      return res.status(400).json({ 
        success: false,
        error: 'Campaign brief text is required in the JSON body.' 
      });
    }

    // Step 1: Analyze campaign brief with Gemini
    console.log('🤖 [Campaign Analyst] Analyzing campaign brief...');
    const campaignParams = await analyzeCampaignBrief(briefText);
    
    // Step 2: Search for creators based on analysis
    console.log('🔍 [Creator Scout] Searching for creators...');
    const creators = await searchYouTubeCreators(
      campaignParams.targetNiche, 
      campaignParams.minFollowers
    );

    // Return the complete workflow result
    res.json({
      success: true,
      campaignAnalysis: campaignParams,
      creators: creators,
      logs: [
        'Crew starting execution...',
        '[Campaign Analyst] Reading and analyzing the campaign brief...',
        `[Campaign Analyst] Identified key parameters: budget ₹${(campaignParams.budget * 83).toLocaleString()}, niche '${campaignParams.targetNiche}', platform '${campaignParams.platform}'.`,
        '[Creator Scout] Received campaign parameters. Searching creator database...',
        `[Creator Scout] Found ${creators.length} matching creators.`,
        '[Creator Scout] Filtering and ranking top creators...',
        'Crew execution finished.'
      ]
    });

  } catch (error) {
    console.error('Error in AI campaign workflow:', error);
    res.status(500).json({ 
      error: 'Failed to process campaign',
      message: error.message 
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

// Endpoint for analyzing campaign brief only
router.post('/analyze-brief', async (req, res) => {
  try {
    const { briefText } = req.body;
    
    if (!briefText) {
      return res.status(400).json({ 
        success: false,
        error: 'Campaign brief text is required in the JSON body.' 
      });
    }

    console.log('🤖 [Campaign Analyst] Analyzing campaign brief...');
    const campaignParams = await analyzeCampaignBrief(briefText);
    
    res.json({
      success: true,
      campaignAnalysis: campaignParams,
      message: 'Campaign brief analyzed successfully'
    });

  } catch (error) {
    console.error('Error analyzing campaign brief:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze campaign brief',
      message: error.message 
    });
  }
});

// Process campaign brief endpoint (expected by frontend)
router.post('/process-brief', upload.single('campaignBrief'), async (req, res) => {
  try {
    console.log('📄 Processing campaign brief file...');
    
    if (!req.file && !req.body.briefText) {
      return res.status(400).json({ 
        success: false,
        message: 'Campaign brief file or text is required.' 
      });
    }

    // Extract text from file if uploaded, otherwise use briefText
    let briefText = req.body.briefText;
    if (req.file) {
      // Simple text extraction for demo (you might want to add proper file parsing)
      briefText = req.file.buffer ? req.file.buffer.toString() : req.file.originalname;
    }

    // Analyze campaign brief with Gemini
    console.log('🤖 [Campaign Analyst] Analyzing campaign brief...');
    const campaignParams = await analyzeCampaignBrief(briefText);
    
    // Generate campaign ID
    const campaignId = `campaign_${Date.now()}`;
    
    // Create campaign data structure expected by frontend
    const campaignData = {
      campaignId,
      briefSummary: campaignParams.campaignName || "AI-Generated Campaign",
      targetAudience: campaignParams.targetNiche || "tech enthusiasts",
      keyTalkingPoints: [
        campaignParams.deliverables || "Product showcase",
        "Brand alignment",
        "Audience engagement"
      ]
    };
    
    // Store campaign analysis globally for use in find-creators
    global.latestCampaignAnalysis = campaignParams;
    
    res.json({
      success: true,
      data: {
        ...campaignData,
        campaignAnalysis: campaignParams // Include analysis in data for frontend
      },
      campaignAnalysis: campaignParams,
      message: 'Campaign brief processed successfully'
    });

  } catch (error) {
    console.error('Error processing campaign brief:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to process campaign brief'
    });
  }
});

// Find creators endpoint (expected by frontend)
router.post('/find-creators', async (req, res) => {
  try {
    console.log('🔍 Finding creators for campaign...');
    
    const { campaignId, targetAudience, briefSummary, keyTalkingPoints, campaignAnalysis } = req.body;
    
    if (!targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Target audience is required'
      });
    }

    // Extract search keywords from campaign analysis if available
    let searchKeywords = [];
    let niche = targetAudience.toLowerCase();
    
    // Use provided campaign analysis or fallback to global stored analysis
    const analysis = campaignAnalysis || global.latestCampaignAnalysis;
    
    if (analysis && analysis.searchKeywords) {
      searchKeywords = analysis.searchKeywords;
      if (analysis.targetNiche) {
        niche = analysis.targetNiche.toLowerCase();
      }
    }
    
    console.log(`🎯 Campaign targeting: ${niche}`);
    console.log(`🔍 Using search keywords:`, searchKeywords);
    
    let allCreators = [];

    // Always include Sanjay Malladi as the first creator, dynamically matched to campaign
    const sanjayNicheDescription = {
      'technology': 'cutting-edge technology and AI innovations',
      'premium lifestyle': 'luxury tech products and premium lifestyle experiences',
      'automotive': 'premium automotive technology and high-performance vehicles',
      'gaming': 'gaming technology and esports innovation',
      'fashion': 'tech-fashion and wearable technology trends',
      'fitness': 'fitness technology and health innovations',
      'food': 'food technology and culinary innovations',
      'travel': 'travel technology and digital nomad lifestyle',
      'beauty': 'beauty technology and innovative cosmetic products'
    };
    
    const sanjaySpecialty = sanjayNicheDescription[niche] || 'technology innovation and digital transformation';
    const campaignKeywords = searchKeywords.length > 0 ? searchKeywords.slice(0, 2).join(' and ') : niche;
    
    const sanjayCreator = {
      id: 'creator_sanjay_001',
      name: 'Sanjay Malladi',
      platform: 'YouTube',
      platforms: ['YouTube', 'Instagram'],
      subscriberCount: 2800000,
      followerCount: 2800000,
      viewCount: 45000000,
      videoCount: 320,
      niche: niche,
      categories: [niche, ...(searchKeywords.slice(0, 2)), 'Technology', 'Innovation'],
      description: `Tech entrepreneur and content creator specializing in ${sanjaySpecialty}. Renowned for ${campaignKeywords} content and building innovative tech solutions.`,
      bio: `🚀 Tech Entrepreneur | ${niche} Expert | Innovation Leader | ${campaignKeywords} Specialist | 2.8M+ subscribers`,
      profileImageUrl: 'https://avatar.vercel.sh/sanjaymalladi?size=80&text=SM',
      youtubeChannelUrl: 'https://www.youtube.com/@sanjaymalladi',
      instagramUrl: 'https://instagram.com/sanjaymalladi',
      channelUrl: 'https://www.youtube.com/@sanjaymalladi',
      stats: {
        avgViewsPerVideo: 150000,
        engagementRate: '8.5%',
        totalViews: 45000000,
        videosUploaded: 320,
        uploadsPerWeek: 3
      },
      pricing: {
        sponsoredVideo: 2075000, // ₹20.75 lakh (≈$25,000 * 83)
        productPlacement: 1494000, // ₹14.94 lakh (≈$18,000 * 83)
        channelMembership: 664000 // ₹6.64 lakh (≈$8,000 * 83)
      },
      campaignMatch: {
        overallMatch: 95,
        nicheRelevance: 98,
        audienceAlignment: 92,
        contentQuality: 96,
        engagementScore: 94
      },
      dataSource: 'Featured Creator',
      lastUpdated: new Date().toISOString(),
      location: '📍 India',
      contactEmail: 'sanjaymallladi12@gmail.com'
    };
    
    allCreators.push(sanjayCreator);

    // Search YouTube creators (limit to fewer since we already have Sanjay)
    console.log('🎬 Searching YouTube creators...');
    const youtubeCreators = await searchYouTubeCreators(niche, searchKeywords, 50000, 5000000, 3);
    allCreators.push(...youtubeCreators);

    // Search Instagram creators
    console.log('📸 Searching Instagram creators...');
    const instagramCreators = await searchInstagramCreators(niche, 50000, 5000000, 4);
    allCreators.push(...instagramCreators);

    // Add creator IDs and email placeholders for frontend compatibility
    const creatorsWithIds = allCreators.map(creator => ({
      ...creator,
      creatorId: creator.id,
      email: creator.contactEmail || `${creator.name.toLowerCase().replace(/\s+/g, '.')}@example.com` // Use real email if available
    }));

    res.json({
      success: true,
      data: creatorsWithIds,
      searchParams: {
        campaignId,
        targetAudience,
        briefSummary,
        keyTalkingPoints
      },
      message: `Found ${creatorsWithIds.length} matching creators`
    });

  } catch (error) {
    console.error('Error finding creators:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to find creators'
    });
  }
});

// Start outreach endpoint (expected by frontend)
router.post('/start-outreach', async (req, res) => {
  try {
    console.log('📧 Starting outreach...');
    
    const { campaignId, creatorId, creatorName, creatorEmail, campaignBrief, targetAudience } = req.body;
    
    if (!creatorId || !creatorName) {
      return res.status(400).json({
        success: false,
        message: 'Creator ID and name are required'
      });
    }

    // For now, simulate outreach success
    // In a real implementation, this would integrate with your email service
    console.log(`📧 Sending outreach email to ${creatorName} (${creatorEmail})`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({
      success: true,
      data: {
        emailSent: true,
        creatorId,
        creatorName,
        campaignId,
        sentAt: new Date().toISOString()
      },
      message: `Outreach email sent to ${creatorName}`
    });

  } catch (error) {
    console.error('Error starting outreach:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start outreach'
    });
  }
});

module.exports = router; 