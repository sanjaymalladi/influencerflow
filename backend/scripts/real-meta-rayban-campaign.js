const OutreachSpecialistAgent = require('../src/agents/OutreachSpecialistAgent');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize AI and agents
const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const outreachAgent = new OutreachSpecialistAgent();

// Meta Ray-Ban Campaign Configuration
const META_RAYBAN_CAMPAIGN = {
  id: 'meta-rayban-india-2025',
  campaignName: 'Meta Ray-Ban Smart Glasses - India Launch',
  name: 'Meta Ray-Ban Smart Glasses - India Launch',
  description: 'Exclusive launch of Meta Ray-Ban smart glasses in the Indian market, targeting tech-savvy content creators',
  budget: 10000,
  targetNiche: 'Technology, Gadgets, AR/VR, Lifestyle',
  deliverables: 'Unboxing video (10-15 mins), Instagram posts (3-5), Stories (5-7), Reels (2-3)',
  timeline: '3 weeks from agreement',
  brandGuidelines: 'Professional, authentic, tech-focused content showcasing AR capabilities',
  requirements: {
    minimumSubscribers: 50000,
    techContent: true,
    indianAudience: true
  }
};

// Sanjay Malladi - Target Creator
const SANJAY_MALLADI = {
  id: 'sanjay-malladi-tech',
  name: 'Sanjay Malladi',
  channelName: 'Sanjay Malladi',
  email: 'sanjaymallladi12@gmail.com', // User's Gmail
  contactEmail: 'sanjaymallladi12@gmail.com',
  platform: 'YouTube',
  subscribers: '100K+',
  niche: 'Technology, AI/ML, Entrepreneurship',
  description: 'Tech entrepreneur and content creator specializing in AI/ML tutorials, tech reviews, and startup insights',
  location: 'India',
  avgViews: '25K',
  engagementRate: '4.2%',
  demographics: {
    ageGroup: '18-35',
    geography: 'India (70%), International (30%)',
    interests: ['Technology', 'Programming', 'AI', 'Startups']
  }
};

// Campaign sender information
const SENDER_INFO = {
  name: 'Alex Johnson',
  company: 'Meta Partnership Team',
  email: 'malladisanjay29@gmail.com', // Verified SendGrid email
  title: 'Creator Partnership Manager'
};

/**
 * Generate AI-powered campaign brief for Meta Ray-Ban
 */
async function generateCampaignBrief() {
  console.log('🤖 Generating AI-powered campaign brief for Meta Ray-Ban...');
  
  const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Create a comprehensive campaign brief for Meta Ray-Ban Smart Glasses launch in India.
    
    Target Creator: Sanjay Malladi
    - Tech entrepreneur and content creator
    - Specializes in AI/ML tutorials and tech reviews
    - 100K+ subscribers on YouTube
    - Indian audience base with tech focus
    
    Campaign Goals:
    1. Generate authentic unboxing and review content
    2. Showcase AR capabilities and smart features
    3. Demonstrate integration with Meta ecosystem
    4. Create buzz in Indian tech community
    
    Requirements:
    - Professional, authentic approach
    - Technical depth suitable for tech audience
    - Highlight innovation and practical applications
    - Include hands-on demonstrations
    
    Generate a detailed campaign brief including:
    1. Executive summary
    2. Content requirements and deliverables
    3. Key messaging points
    4. Technical specifications to highlight
    5. Timeline and milestones
    6. Success metrics
    
    Format as a professional campaign document.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Error generating campaign brief:', error);
    return null;
  }
}

/**
 * Generate personalized outreach email for Sanjay using AI
 */
async function generatePersonalizedOutreach() {
  console.log('🎯 Generating personalized outreach email for Sanjay Malladi...');
  
  const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Write a personalized outreach email for Sanjay Malladi about the Meta Ray-Ban Smart Glasses collaboration.
    
    About Sanjay:
    - Tech entrepreneur and YouTuber with 100K+ subscribers
    - Specializes in AI/ML tutorials, tech reviews, and startup content
    - Known for clear explanations of complex technical concepts
    - Has an engaged Indian tech audience
    - Creates educational content about emerging technologies
    
    Campaign Details:
    - Meta Ray-Ban Smart Glasses India Launch
    - $10,000 budget for comprehensive content package
    - Deliverables: Unboxing video (10-15 mins), Instagram content, Stories, Reels
    - Timeline: 3 weeks from agreement
    - Focus on AR capabilities and Meta ecosystem integration
    
    Email Requirements:
    - Professional yet personal tone
    - Reference his specific content style and expertise
    - Highlight why he's perfect for this tech product
    - Mention specific benefits for his audience
    - Include clear next steps
    - Keep it concise but compelling
    
    From: Alex Johnson, Creator Partnership Manager, Meta Partnership Team
    
    Generate a complete email with subject line and body.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Error generating personalized outreach:', error);
    return null;
  }
}

/**
 * Execute the real Meta Ray-Ban campaign
 */
async function executeRealCampaign() {
  console.log('🚀 Starting Real Meta Ray-Ban Campaign with AI-Powered Outreach');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Generate campaign brief
    console.log('\n📋 Step 1: Generating Campaign Brief...');
    const campaignBrief = await generateCampaignBrief();
    if (campaignBrief) {
      console.log('✅ Campaign brief generated successfully');
      console.log('Brief Preview:', campaignBrief.substring(0, 200) + '...');
    }

    // Step 2: Generate personalized outreach
    console.log('\n🎯 Step 2: Generating Personalized Outreach...');
    const personalizedEmail = await generatePersonalizedOutreach();
    if (personalizedEmail) {
      console.log('✅ Personalized email generated successfully');
      console.log('Email Preview:', personalizedEmail.substring(0, 300) + '...');
    }

    // Step 3: Execute real outreach via SendGrid
    console.log('\n📧 Step 3: Executing Real Email Outreach...');
    console.log(`Sending to: ${SANJAY_MALLADI.email}`);
    console.log(`From: ${SENDER_INFO.email} (${SENDER_INFO.name})`);
    
    // Add the generated content to campaign
    const enhancedCampaign = {
      ...META_RAYBAN_CAMPAIGN,
      campaignBrief,
      personalizedHook: personalizedEmail ? personalizedEmail.split('\n').slice(2, 4).join(' ') : 'Tech innovation meets creator excellence'
    };

    // Execute real outreach
    const outreachResult = await outreachAgent.execute(
      [SANJAY_MALLADI],
      enhancedCampaign,
      {
        senderName: SENDER_INFO.name,
        senderEmail: SENDER_INFO.email,
        companyName: SENDER_INFO.company,
        useRealEmail: true
      }
    );

    // Step 4: Display results
    console.log('\n📊 Step 4: Campaign Results');
    console.log('=' .repeat(40));
    
    if (outreachResult.success) {
      console.log('✅ CAMPAIGN EXECUTED SUCCESSFULLY!');
      console.log(`📧 Emails sent: ${outreachResult.summary.emailsSent}`);
      console.log(`❌ Emails failed: ${outreachResult.summary.emailsFailed}`);
      console.log(`📈 Success rate: ${outreachResult.summary.successRate}%`);
      
      if (outreachResult.results && outreachResult.results.length > 0) {
        const result = outreachResult.results[0];
        if (result.emailResult.success) {
          console.log(`🆔 Message ID: ${result.emailResult.messageId}`);
          console.log(`🎯 Provider: ${result.emailResult.provider}`);
          console.log(`🤖 AI Monitoring: ${result.emailResult.aiMonitoring ? 'Enabled' : 'Disabled'}`);
          console.log(`⏰ Sent at: ${result.emailResult.sentAt}`);
        }
      }
    } else {
      console.log('❌ CAMPAIGN FAILED');
      console.log(`Error: ${outreachResult.error}`);
    }

    // Step 5: Show logs
    console.log('\n📋 Campaign Logs:');
    if (outreachResult.logs) {
      outreachResult.logs.forEach(log => console.log(log));
    }

    console.log('\n🎉 Real Meta Ray-Ban Campaign Complete!');
    console.log('Monitor your email for creator responses...');
    
    return outreachResult;

  } catch (error) {
    console.error('❌ Campaign execution failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute the campaign if run directly
if (require.main === module) {
  executeRealCampaign()
    .then(result => {
      console.log('\n🏁 Campaign execution finished');
      if (result.success) {
        console.log('✅ Check your email for real outreach results!');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  executeRealCampaign,
  generateCampaignBrief,
  generatePersonalizedOutreach,
  META_RAYBAN_CAMPAIGN,
  SANJAY_MALLADI,
  SENDER_INFO
}; 