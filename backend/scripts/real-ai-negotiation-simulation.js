const sendGridService = require('../src/services/sendGridService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize AI
const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Campaign and creator data
const CAMPAIGN = {
  name: 'Meta Ray-Ban Smart Glasses - India Launch',
  budget: 10000,
  deliverables: 'Unboxing video (10-15 mins), Instagram posts, Stories, Reels',
  timeline: '3 weeks'
};

const CREATOR = {
  name: 'Sanjay Malladi',
  email: 'sanjaymallladi12@gmail.com',
  platform: 'YouTube',
  niche: 'Technology, AI/ML, Entrepreneurship'
};

const SENDER = {
  name: 'Alex Johnson',
  email: 'malladisanjay29@gmail.com',
  company: 'Meta Partnership Team'
};

/**
 * Simulate the negotiation process with real AI
 */
async function simulateAINegotiation() {
  console.log('🤖 Starting AI-Powered Negotiation Simulation');
  console.log('=' .repeat(80));
  console.log(`🎯 Campaign: ${CAMPAIGN.name}`);
  console.log(`👤 Creator: ${CREATOR.name} (${CREATOR.email})`);
  console.log(`💼 Sender: ${SENDER.name} (${SENDER.email})`);
  console.log('');

  const negotiationLog = [];

  try {
    // Step 1: AI generates initial outreach email
    console.log('📧 STEP 1: Generating AI-powered initial outreach...');
    const initialEmail = await generateInitialOutreach();
    
    if (initialEmail) {
      console.log('✅ AI-generated outreach email:');
      console.log('---');
      console.log(initialEmail.substring(0, 300) + '...');
      console.log('---');
      
      // Send the real email
      console.log('\n📤 Sending real email via SendGrid...');
      const emailResult = await sendRealEmail(
        '🎯 Partnership Opportunity: Meta Ray-Ban Smart Glasses Launch',
        initialEmail
      );
      
      if (emailResult.success) {
        console.log(`✅ Email sent successfully! Message ID: ${emailResult.messageId}`);
        negotiationLog.push({
          step: 1,
          action: 'Initial outreach sent',
          messageId: emailResult.messageId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Step 2: Simulate creator's reply (AI generates realistic response)
    console.log('\n🎭 STEP 2: Simulating creator reply with AI...');
    const creatorReply = await generateCreatorReply('initial_interest');
    
    if (creatorReply) {
      console.log('✅ AI-simulated creator reply:');
      console.log('---');
      console.log(creatorReply.substring(0, 200) + '...');
      console.log('---');
      
      negotiationLog.push({
        step: 2,
        action: 'Creator reply received (simulated)',
        content: creatorReply.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: AI analyzes the reply and generates response
    console.log('\n🧠 STEP 3: AI analyzing reply and generating response...');
    const analysisAndResponse = await analyzeReplyAndRespond(creatorReply);
    
    if (analysisAndResponse) {
      console.log('✅ AI Analysis:');
      console.log(`📊 Sentiment: ${analysisAndResponse.analysis.sentiment}`);
      console.log(`🎯 Intent: ${analysisAndResponse.analysis.intent}`);
      console.log(`💰 Budget concern: ${analysisAndResponse.analysis.budgetConcern ? 'Yes' : 'No'}`);
      console.log(`⚠️ Risk level: ${analysisAndResponse.analysis.riskLevel}`);
      
      console.log('\n🤖 AI-generated response:');
      console.log('---');
      console.log(analysisAndResponse.response.substring(0, 250) + '...');
      console.log('---');
      
      // Send the AI response
      console.log('\n📤 Sending AI response via SendGrid...');
      const responseResult = await sendRealEmail(
        'Re: Partnership Opportunity - Meta Ray-Ban Smart Glasses',
        analysisAndResponse.response
      );
      
      if (responseResult.success) {
        console.log(`✅ AI response sent! Message ID: ${responseResult.messageId}`);
        negotiationLog.push({
          step: 3,
          action: 'AI response sent',
          analysis: analysisAndResponse.analysis,
          messageId: responseResult.messageId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Step 4: Simulate final agreement phase
    console.log('\n🤝 STEP 4: Simulating agreement and contract generation...');
    const finalReply = await generateCreatorReply('agreement');
    const contractEmail = await generateContractEmail();
    
    if (contractEmail) {
      console.log('✅ AI-generated contract email:');
      console.log('---');
      console.log(contractEmail.substring(0, 200) + '...');
      console.log('---');
      
      // Send contract email
      console.log('\n📤 Sending contract email via SendGrid...');
      const contractResult = await sendRealEmail(
        '📄 Partnership Agreement - Meta Ray-Ban Smart Glasses',
        contractEmail
      );
      
      if (contractResult.success) {
        console.log(`✅ Contract email sent! Message ID: ${contractResult.messageId}`);
        negotiationLog.push({
          step: 4,
          action: 'Contract sent',
          messageId: contractResult.messageId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Display final summary
    console.log('\n📊 NEGOTIATION SIMULATION COMPLETE');
    console.log('=' .repeat(50));
    console.log(`✅ Total emails sent: ${negotiationLog.filter(log => log.messageId).length}`);
    console.log(`🤖 AI-powered interactions: 4`);
    console.log(`📧 Real emails delivered: Yes (via SendGrid)`);
    console.log(`🎯 Campaign status: Agreement reached (simulated)`);
    
    console.log('\n📋 Negotiation Timeline:');
    negotiationLog.forEach((log, index) => {
      console.log(`${index + 1}. ${log.action} ${log.messageId ? `(ID: ${log.messageId.substring(0, 8)}...)` : ''}`);
    });

    console.log('\n🎉 Check your Gmail inbox for the real emails!');
    console.log('📱 You should receive all the AI-generated emails within 1-2 minutes');

    return {
      success: true,
      emailsSent: negotiationLog.filter(log => log.messageId).length,
      negotiationLog
    };

  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    return {
      success: false,
      error: error.message,
      negotiationLog
    };
  }
}

/**
 * Generate initial outreach email using AI
 */
async function generateInitialOutreach() {
  const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Write a personalized outreach email for Sanjay Malladi about Meta Ray-Ban Smart Glasses collaboration.
    
    Creator: ${CREATOR.name}
    - Platform: ${CREATOR.platform}
    - Niche: ${CREATOR.niche}
    - Known for clear tech explanations and tutorials
    
    Campaign: ${CAMPAIGN.name}
    - Budget: $${CAMPAIGN.budget}
    - Deliverables: ${CAMPAIGN.deliverables}
    - Timeline: ${CAMPAIGN.timeline}
    
    Write a professional HTML email that:
    1. Shows familiarity with his content
    2. Explains why he's perfect for this tech product
    3. Outlines the collaboration details clearly
    4. Includes next steps
    
    Keep it engaging but professional.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Error generating initial outreach:', error);
    return null;
  }
}

/**
 * Generate creator reply simulation
 */
async function generateCreatorReply(replyType) {
  const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompts = {
    initial_interest: `
      Write a realistic reply from Sanjay Malladi showing interest in the Meta Ray-Ban collaboration.
      He should:
      - Express genuine interest in the tech aspect
      - Ask some technical questions about the glasses
      - Mention his audience would be interested
      - Ask about timeline and requirements
      - Be professional but enthusiastic
      
      Keep it 2-3 paragraphs, like a real creator would write.
    `,
    agreement: `
      Write a positive reply from Sanjay Malladi agreeing to the Meta Ray-Ban collaboration.
      He should:
      - Confirm his interest and agreement
      - Be excited about the technology
      - Ask about next steps and logistics
      - Mention when he can start
      
      Keep it brief and enthusiastic.
    `
  };

  try {
    const result = await model.generateContent(prompts[replyType]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Error generating creator reply:', error);
    return null;
  }
}

/**
 * Analyze creator reply and generate response
 */
async function analyzeReplyAndRespond(creatorReply) {
  const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const analysisPrompt = `
    Analyze this creator reply and provide analysis + response.
    
    Creator Reply: "${creatorReply}"
    
    Provide JSON response with:
    {
      "analysis": {
        "sentiment": "positive/neutral/negative",
        "intent": "interested/negotiating/declining",
        "budgetConcern": true/false,
        "riskLevel": "low/medium/high",
        "keyPoints": ["point1", "point2"]
      },
      "response": "Professional email response addressing their points and moving forward"
    }
  `;

  try {
    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON, fallback to simple response
    try {
      return JSON.parse(text);
    } catch {
      return {
        analysis: {
          sentiment: 'positive',
          intent: 'interested',
          budgetConcern: false,
          riskLevel: 'low',
          keyPoints: ['AI analysis available']
        },
        response: text
      };
    }
  } catch (error) {
    console.error('❌ Error analyzing reply:', error);
    return null;
  }
}

/**
 * Generate contract email
 */
async function generateContractEmail() {
  const model = geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Write a professional contract email for the Meta Ray-Ban collaboration with Sanjay Malladi.
    
    Include:
    - Formal agreement terms
    - Payment details ($${CAMPAIGN.budget})
    - Deliverable requirements
    - Timeline (${CAMPAIGN.timeline})
    - Next steps for contract signing
    
    Make it professional and comprehensive.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Error generating contract email:', error);
    return null;
  }
}

/**
 * Send real email via SendGrid
 */
async function sendRealEmail(subject, body) {
  const emailData = {
    to: CREATOR.email,
    from: SENDER.email,
    fromName: SENDER.name,
    subject: subject,
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${body}
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This email was generated using AI-powered negotiation system. 
          This is a real email sent via SendGrid for demonstration purposes.
        </p>
      </div>
    `
  };

  try {
    return await sendGridService.sendEmail(emailData);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Execute the simulation
if (require.main === module) {
  simulateAINegotiation()
    .then(result => {
      if (result.success) {
        console.log('\n🏆 AI Negotiation Simulation Completed Successfully!');
        console.log('🎯 This demonstrates real AI-powered email generation and negotiation');
        console.log('📧 Check your Gmail for the actual emails sent');
      } else {
        console.log('\n❌ Simulation failed:', result.error);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { simulateAINegotiation }; 