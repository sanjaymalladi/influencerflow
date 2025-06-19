const sgMail = require('@sendgrid/mail');
const sgClient = require('@sendgrid/client');

class SendGridService {
  constructor() {
    this.initialized = false;
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'malladisanjay29@gmail.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'InfluencerFlow Team';
    
    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
      sgClient.setApiKey(this.apiKey);
      this.initialized = true;
      console.log('✅ SendGrid service initialized successfully');
    } else {
      console.warn('⚠️ SendGrid API key not found in environment variables');
    }
  }

  // Generate tracking pixel for email opens
  generateTrackingPixel(emailId) {
    return `<img src="${process.env.API_URL}/api/email/track/open/${emailId}" width="1" height="1" style="display:none;">`;
  }

  // Create tracking links for email clicks
  createTrackingLink(originalUrl, emailId) {
    return `${process.env.API_URL}/api/email/track/click/${emailId}?url=${encodeURIComponent(originalUrl)}`;
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail({ to, subject, body, from, fromName }) {
    if (!this.initialized) {
      throw new Error('SendGrid service not initialized. Please check API key.');
    }

    try {
      const msg = {
        to: to,
        from: {
          email: from || this.fromEmail,
          name: fromName || this.fromName
        },
        subject: subject,
        html: body,
        // Add custom headers for tracking replies (Reply-To goes in replyTo field, not headers)
        replyTo: {
          email: from || this.fromEmail,
          name: fromName || this.fromName
        },
        headers: {
          'X-Campaign-ID': `campaign-${Date.now()}`,
          'X-Creator-Email': to
        },
        // Enable click and open tracking
        trackingSettings: {
          clickTracking: {
            enable: true
          },
          openTracking: {
            enable: true
          }
        }
      };

      console.log(`📧 Sending email via SendGrid to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 From: ${from || this.fromEmail}`);

      const response = await sgMail.send(msg);
      
      console.log('✅ Email sent successfully via SendGrid');
      console.log(`📬 Message ID: ${response[0].headers['x-message-id']}`);

      return {
        success: true,
        provider: 'sendgrid',
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode,
        response: 'Email sent successfully'
      };

    } catch (error) {
      console.error('❌ SendGrid email sending error:', error);
      
      if (error.response) {
        console.error('SendGrid API Error Response:', error.response.body);
      }
      
      throw new Error(`SendGrid API Error: ${error.message}`);
    }
  }

  /**
   * Process incoming email from SendGrid Inbound Parse
   * This webhook receives emails sent to your configured domain
   */
  async processInboundEmail(webhookData) {
    try {
      console.log('📨 Processing inbound email from SendGrid...');
      
      const {
        from,
        to,
        subject,
        text,
        html,
        headers,
        attachments,
        envelope
      } = webhookData;

      // Extract campaign and creator info from headers or subject
      const campaignId = this.extractCampaignId(subject, headers);
      const isReply = subject.toLowerCase().includes('re:') || 
                     subject.toLowerCase().includes('reply');

      const emailData = {
        id: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: from,
        to: to,
        subject: subject,
        textBody: text,
        htmlBody: html,
        headers: headers,
        attachments: attachments || [],
        envelope: envelope,
        receivedAt: new Date().toISOString(),
        isReply: isReply,
        campaignId: campaignId,
        provider: 'sendgrid'
      };

      console.log(`📧 Processed inbound email: ${from} → ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Is Reply: ${isReply}`);

      return emailData;

    } catch (error) {
      console.error('❌ Error processing inbound email:', error);
      throw error;
    }
  }

  /**
   * Set up SendGrid Inbound Parse webhook
   * This configures SendGrid to forward emails to your webhook endpoint
   */
  async setupInboundParse(webhookUrl, hostname = 'mail.yourdomain.com') {
    try {
      console.log('🔧 Setting up SendGrid Inbound Parse...');
      
      const request = {
        method: 'POST',
        url: '/v3/user/webhooks/parse/settings',
        body: {
          hostname: hostname,
          url: webhookUrl,
          spam_check: true,
          send_raw: false
        }
      };

      const response = await sgClient.request(request);
      
      console.log('✅ SendGrid Inbound Parse configured successfully');
      return response[1];

    } catch (error) {
      console.error('❌ Error setting up Inbound Parse:', error);
      throw error;
    }
  }

  /**
   * Search for emails (using SendGrid Activity API)
   * This searches recent email activity for replies
   */
  async searchEmails(query, limit = 10) {
    try {
      console.log(`🔍 Searching emails with query: ${query}`);
      
      // SendGrid Activity API to search recent email events
      const request = {
        method: 'GET',
        url: '/v3/messages',
        qs: {
          query: query,
          limit: limit
        }
      };

      const response = await sgClient.request(request);
      const messages = response[1].messages || [];

      console.log(`📧 Found ${messages.length} emails matching query`);

      return messages.map(msg => ({
        id: msg.msg_id,
        from: msg.from_email,
        to: msg.to_email,
        subject: msg.subject,
        status: msg.status,
        lastEventTime: msg.last_event_time,
        events: msg.events || []
      }));

    } catch (error) {
      console.error('❌ Error searching emails:', error);
      return [];
    }
  }

  /**
   * Get email activity and events
   */
  async getEmailActivity(messageId) {
    try {
      const request = {
        method: 'GET',
        url: `/v3/messages/${messageId}`
      };

      const response = await sgClient.request(request);
      return response[1];

    } catch (error) {
      console.error('❌ Error getting email activity:', error);
      return null;
    }
  }

  /**
   * Extract campaign ID from email subject or headers
   */
  extractCampaignId(subject, headers) {
    // Try to extract from custom header first
    if (headers && headers['X-Campaign-ID']) {
      return headers['X-Campaign-ID'];
    }

    // Try to extract from subject line
    const match = subject.match(/Campaign[:\s]+([A-Z0-9-]+)/i);
    if (match) {
      return match[1];
    }

    return null;
  }

  /**
   * Test SendGrid connection
   */
  async testConnection() {
    if (!this.initialized) {
      throw new Error('SendGrid not initialized');
    }

    try {
      // Test by getting account details
      const request = {
        method: 'GET',
        url: '/v3/user/account'
      };

      const response = await sgClient.request(request);
      
      return {
        success: true,
        accountType: response[1].type,
        email: response[1].email,
        company: response[1].company || 'N/A'
      };

    } catch (error) {
      console.error('SendGrid connection test failed:', error);
      throw error;
    }
  }

  /**
   * Store outreach email for tracking
   */
  async storeOutreachEmail(emailData) {
    // This would typically store in a database
    // For now, we'll return a mock ID and log the data
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📝 Storing outreach email:', {
      id: emailId,
      campaignId: emailData.campaignId,
      creatorId: emailData.creatorId,
      recipientEmail: emailData.recipientEmail,
      subject: emailData.subject,
      status: emailData.status,
      provider: emailData.provider,
      messageId: emailData.messageId,
      sentAt: new Date().toISOString()
    });

    return {
      id: emailId,
      ...emailData,
      createdAt: new Date().toISOString()
    };
  }

  // Send multiple emails to different recipients
  async sendMultipleEmails(emailsData) {
    if (!this.initialized) {
      throw new Error('SendGrid service not initialized. Please check your API key.');
    }

    const messages = emailsData.map(emailData => this.constructMessage(emailData));

    try {
      console.log(`📧 Sending ${messages.length} emails via SendGrid...`);
      const response = await sgMail.send(messages);

      console.log('✅ Multiple emails sent successfully via SendGrid');
      
      return {
        success: true,
        results: response.map((res, index) => ({
          messageId: res.headers['x-message-id'] || `sendgrid-${Date.now()}-${index}`,
          statusCode: res.statusCode,
          to: messages[index].to
        })),
        provider: 'sendgrid'
      };

    } catch (error) {
      console.error('❌ SendGrid multiple send error:', error);
      throw error;
    }
  }

  // Send email using dynamic template
  async sendTemplateEmail(templateData) {
    const {
      to,
      from,
      fromName,
      templateId,
      dynamicTemplateData,
      trackingId,
      categories,
      customHeaders
    } = templateData;

    const emailData = {
      to,
      from,
      fromName,
      subject: '', // Not needed for dynamic templates
      body: '', // Not needed for dynamic templates
      templateId,
      dynamicTemplateData,
      trackingId,
      categories,
      customHeaders
    };

    return await this.sendEmail(emailData);
  }

  // Helper method to construct message object
  constructMessage(emailData) {
    const {
      to,
      from,
      fromName,
      subject,
      body,
      trackingId,
      templateId,
      dynamicTemplateData,
      attachments,
      categories,
      customHeaders
    } = emailData;

    // Add tracking pixel to email body if trackingId is provided
    let finalBody = body;
    if (trackingId) {
      const trackingPixel = this.generateTrackingPixel(trackingId);
      finalBody = body + trackingPixel;
    }

    const msg = {
      to: to,
      from: {
        email: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@influencerflow.com',
        name: fromName || process.env.SENDGRID_FROM_NAME || 'InfluencerFlow'
      },
      subject: subject,
      html: finalBody,
      text: body.replace(/<[^>]*>/g, '')
    };

    // Add optional fields
    if (templateId) {
      msg.templateId = templateId;
      if (dynamicTemplateData) {
        msg.dynamicTemplateData = dynamicTemplateData;
      }
    }

    if (attachments && attachments.length > 0) {
      msg.attachments = attachments;
    }

    if (categories && categories.length > 0) {
      msg.categories = categories;
    }

    if (customHeaders) {
      msg.headers = customHeaders;
    }

    return msg;
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.initialized,
      apiKeyConfigured: !!process.env.SENDGRID_API_KEY,
      provider: 'sendgrid'
    };
  }
}

module.exports = new SendGridService(); 