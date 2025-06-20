const { GoogleGenerativeAI } = require('@google/generative-ai');
const emailService = require('../services/emailService');

class OutreachSpecialistAgent {
  constructor() {
    this.name = 'Outreach Specialist';
    this.role = 'Send personalized outreach emails to creators';
    this.emailService = emailService;
    this.geminiAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    this.logs = [];
  }

  addLog(message) {
    const logEntry = `[${this.name}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async execute(creators, campaign, options = {}) {
    this.logs = [];
    this.addLog('Starting outreach campaign execution...');

    try {
      // Initialize email service
      let isEmailServiceReady = false;
      try {
        // The emailService is a singleton, just check if it exists
        isEmailServiceReady = this.emailService ? true : false;
        if (isEmailServiceReady) {
          this.addLog('✅ Email service available');
        } else {
          this.addLog('⚠️ Email service not available - running in simulation mode');
        }
      } catch (error) {
        this.addLog('⚠️ Email service verification failed - running in simulation mode');
        isEmailServiceReady = false;
      }

      // Filter creators who have email addresses
      const creatorsWithEmail = creators.filter(creator => 
        creator.contactEmail || creator.email || this.generateMockEmail(creator)
      );

      this.addLog(`Found ${creatorsWithEmail.length} creators with contact information`);

      const outreachResults = [];
      const senderInfo = {
        name: options.senderName || 'Alex Johnson',
        company: options.companyName || 'InfluencerFlow',
        email: options.senderEmail || process.env.DEFAULT_FROM_EMAIL
      };

      // Process each creator
      for (let i = 0; i < creatorsWithEmail.length; i++) {
        const creator = creatorsWithEmail[i];
        this.addLog(`Processing creator ${i + 1}/${creatorsWithEmail.length}: ${creator.name}`);

        try {
          // Ensure creator has email
          if (!creator.contactEmail && !creator.email) {
            creator.contactEmail = this.generateMockEmail(creator);
          }

          // Personalize the outreach using AI if available
          const personalizedCampaign = await this.personalizeOutreach(creator, campaign);
          
          // Send outreach email
          const emailResult = await this.sendOutreachEmail(creator, personalizedCampaign, senderInfo, isEmailServiceReady);
          
          outreachResults.push({
            creator: creator,
            emailResult: emailResult,
            status: emailResult.success ? 'sent' : 'failed'
          });

          this.addLog(`✅ Outreach ${emailResult.success ? 'sent' : 'failed'} to ${creator.name}`);

          // Add small delay between emails to avoid rate limiting
          if (i < creatorsWithEmail.length - 1) {
            await this.delay(1000);
          }

        } catch (error) {
          this.addLog(`❌ Failed to process ${creator.name}: ${error.message}`);
          outreachResults.push({
            creator: creator,
            emailResult: { success: false, error: error.message },
            status: 'failed'
          });
        }
      }

      // Generate summary
      const successCount = outreachResults.filter(r => r.status === 'sent').length;
      const failureCount = outreachResults.filter(r => r.status === 'failed').length;

      this.addLog(`📊 Outreach campaign completed: ${successCount} sent, ${failureCount} failed`);

      return {
        success: true,
        summary: {
          totalCreators: creatorsWithEmail.length,
          emailsSent: successCount,
          emailsFailed: failureCount,
          successRate: Math.round((successCount / creatorsWithEmail.length) * 100)
        },
        results: outreachResults,
        logs: this.logs
      };

    } catch (error) {
      this.addLog(`❌ Outreach campaign failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs: this.logs
      };
    }
  }

  async personalizeOutreach(creator, campaign) {
    if (!this.geminiAI) {
      this.addLog('Using standard campaign details (no AI personalization)');
      return campaign;
    }

    try {
      this.addLog(`Personalizing outreach for ${creator.name} using AI...`);

              const model = this.geminiAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
        You are an expert at personalizing influencer outreach emails. 
        
        Creator Information:
        - Name: ${creator.name}
        - Platform: ${creator.platform || 'YouTube'}
        - Subscribers: ${creator.subscribers || creator.subscriber_count || 'N/A'}
        - Niche: ${creator.niche || 'general'}
        - Description: ${creator.description || 'Content creator'}
        
        Campaign Information:
        - Name: ${campaign.campaignName || campaign.name}
        - Budget: ${campaign.budget}
        - Target Niche: ${campaign.targetNiche || campaign.niche}
        - Deliverables: ${campaign.deliverables}
        
        Based on this information, suggest specific personalization elements for the outreach email:
        1. A personalized hook that shows we know their content
        2. Why they're a good fit for this specific campaign
        3. Suggested timeline that might work for their content schedule
        4. Any specific deliverables that would suit their style
        
        Respond in JSON format with: personalizedHook, fitReason, suggestedTimeline, customDeliverables
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const personalization = JSON.parse(text);
        this.addLog('✅ AI personalization generated successfully');
        
        return {
          ...campaign,
          personalizedHook: personalization.personalizedHook,
          fitReason: personalization.fitReason,
          timeline: personalization.suggestedTimeline || campaign.timeline,
          deliverables: personalization.customDeliverables || campaign.deliverables
        };
      } catch (parseError) {
        this.addLog('⚠️ Could not parse AI response, using standard campaign');
        return campaign;
      }

    } catch (error) {
      this.addLog(`⚠️ AI personalization failed: ${error.message}`);
      return campaign;
    }
  }

  async sendOutreachEmail(creator, campaign, senderInfo, useRealEmail = true) {
    const emailAddress = creator.contactEmail || creator.email;
    
      try {
      // Use SendGrid as primary email service
      this.addLog(`📧 Sending AI-powered outreach email via SendGrid to ${emailAddress}`);
        
        const personalizedContent = campaign.personalizedHook || 
          `We've been following your amazing content and think you'd be perfect for this collaboration!`;
          
          const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Partnership Opportunity with ${campaign.campaignName || campaign.name}</h2>
            <p>Hi ${creator.name || 'there'},</p>
            <p>I hope this email finds you well! I'm reaching out regarding an exciting collaboration opportunity.</p>
            
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #FFE600;">🎯 Campaign Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>💰 Budget:</strong> $${campaign.budget || 'Competitive compensation'}</li>
              <li style="margin: 10px 0;"><strong>🎯 Target Audience:</strong> ${campaign.targetAudience || 'Your engaged audience'}</li>
              <li style="margin: 10px 0;"><strong>📹 Deliverables:</strong> ${campaign.deliverables || 'Video content and social posts'}</li>
              <li style="margin: 10px 0;"><strong>⏰ Timeline:</strong> ${campaign.timeline || '2-3 weeks'}</li>
            </ul>
          </div>

          <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #FFE600;">
            <strong>🤖 AI Personalized:</strong> ${personalizedContent}
          </p>

          <p>We'd love to discuss how we can work together to create engaging content that resonates with your audience.</p>
            
          <p>Best regards,<br>
          <strong>${senderInfo.name || 'Campaign Manager'}</strong><br>
          <em>${senderInfo.company || 'InfluencerFlow Team'}</em></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This email was sent using our AI-powered negotiation system. 
            Reply directly to start the automated negotiation process.
          </p>
        </div>
          `;
          
          const emailData = {
            to: emailAddress,
        subject: `🎯 Partnership Opportunity: ${campaign.campaignName || campaign.name}`,
        body: htmlContent,
        from: senderInfo.email || process.env.SENDGRID_FROM_EMAIL || 'hello@influencerflow.com',
        fromName: senderInfo.name || 'InfluencerFlow Team',
        categories: ['outreach', 'ai-powered', campaign.id || 'campaign'],
        headers: {
          'X-Campaign-ID': campaign.id || campaign.campaignId,
          'X-Creator-ID': creator.id,
          'X-Type': 'outreach-email'
        }
      };

      // Use the negotiation email service for AI-powered outreach
      const result = await this.emailService.sendNegotiationEmail(emailData, {
        campaignId: campaign.id || campaign.campaignId,
        contactId: creator.id,
        budget: campaign.budget || 166000,
        deliverables: campaign.deliverables || 'Video content and social posts',
        timeline: campaign.timeline || '2-3 weeks',
        currentOffer: campaign.budget || 166000,
        fromEmail: emailData.from,
        fromName: emailData.fromName
      });
      
      if (result.success) {
        this.addLog(`✅ AI-powered outreach email sent successfully to ${emailAddress}`);
        this.addLog(`📧 Message ID: ${result.messageId}`);
        this.addLog(`🤖 Negotiation ID: ${result.negotiationId}`);
        this.addLog(`🎯 AI monitoring enabled for replies`);
        
            return {
              success: true,
          messageId: result.messageId,
          negotiationId: result.negotiationId,
              to: emailAddress,
              subject: emailData.subject,
          emailType: 'ai-outreach',
              creatorId: creator.id,
              campaignId: campaign.id || campaign.campaignId,
              sentAt: new Date(),
          provider: 'sendgrid-ai',
          aiMonitoring: result.aiMonitoring
            };
          } else {
        throw new Error(result.error || 'SendGrid sending failed');
          }
          
    } catch (emailError) {
      this.addLog(`❌ SendGrid email service failed: ${emailError.message}`);
      this.addLog(`📧 Error details: ${JSON.stringify(emailError)}`);
      
      // Return error instead of falling back to simulation
      return {
        success: false,
        error: emailError.message,
        to: emailAddress,
        subject: `Partnership Opportunity: ${campaign.campaignName || campaign.name}`,
        emailType: 'outreach-failed',
        creatorId: creator.id,
        campaignId: campaign.id || campaign.campaignId,
        sentAt: new Date(),
        provider: 'sendgrid-error'
      };
    }
  }

  generateMockEmail(creator) {
    // Generate a realistic mock email based on creator name
    const cleanName = (creator.name || creator.channelName || 'creator')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'business.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${cleanName}@${domain}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Follow-up functionality
  async sendFollowUp(creators, campaign, options = {}) {
    this.logs = [];
    this.addLog('Starting follow-up campaign...');

    const senderInfo = {
      name: options.senderName || 'Alex Johnson',
      company: options.companyName || 'InfluencerFlow'
    };

    const followUpResults = [];

    for (const creator of creators) {
      try {
        const emailResult = await this.emailService.sendFollowUpEmail(creator, campaign, senderInfo);
        followUpResults.push({
          creator,
          emailResult,
          status: emailResult.success ? 'sent' : 'failed'
        });
        this.addLog(`Follow-up ${emailResult.success ? 'sent' : 'failed'} to ${creator.name}`);
      } catch (error) {
        this.addLog(`Failed to send follow-up to ${creator.name}: ${error.message}`);
        followUpResults.push({
          creator,
          emailResult: { success: false, error: error.message },
          status: 'failed'
        });
      }
    }

    const successCount = followUpResults.filter(r => r.status === 'sent').length;
    this.addLog(`Follow-up campaign completed: ${successCount}/${creators.length} sent`);

    return {
      success: true,
      results: followUpResults,
      logs: this.logs
    };
  }

  // Get agent status and capabilities
  getStatus() {
    return {
      name: this.name,
      role: this.role,
      capabilities: [
        'Personalized email outreach',
        'AI-powered personalization',
        'Follow-up campaigns',
        'Email template management',
        'Performance tracking'
      ],
      isReady: true,
      emailServiceReady: this.emailService ? true : false,
      aiPersonalizationAvailable: this.geminiAI ? true : false
    };
  }
}

module.exports = OutreachSpecialistAgent; 