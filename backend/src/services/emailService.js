const { v4: uuidv4 } = require('uuid');
const sendGridService = require('./sendGridService');

class EmailService {
  constructor() {
    this.initialized = false;
    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Only initialize SendGrid - our primary email provider
      if (sendGridService.getStatus().initialized) {
        this.initialized = true;
        console.log('✅ Email Service initialized with SendGrid');
      } else {
        console.warn('⚠️ SendGrid not available, email service not fully initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Email Service:', error);
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

  // Main send email method - SendGrid only
  async sendEmail(emailData) {
    const trackingId = emailData.customEmailId || uuidv4();
    const dataWithTracking = { ...emailData, trackingId };

    try {
      // Check if SendGrid is available
      if (!sendGridService.getStatus().initialized) {
        throw new Error('SendGrid email service not initialized');
      }

      console.log('📧 Sending email via SendGrid...');
      const result = await sendGridService.sendEmail(dataWithTracking);

      return {
        success: true,
        messageId: result.messageId,
        provider: 'sendgrid',
        trackingId: trackingId,
        statusCode: result.statusCode
      };

    } catch (error) {
      console.error('❌ SendGrid email sending failed:', error);
      
      // Log the error but don't fall back to other providers
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Send multiple emails
  async sendMultipleEmails(emailsData) {
    try {
      if (!sendGridService.getStatus().initialized) {
        throw new Error('SendGrid email service not initialized');
      }

      console.log(`📧 Sending ${emailsData.length} emails via SendGrid...`);
      const result = await sendGridService.sendMultipleEmails(emailsData);
      
      return {
        success: true,
        results: result.results,
        provider: 'sendgrid'
      };

    } catch (error) {
      console.error('❌ Multiple email sending failed:', error);
      throw new Error(`Multiple email sending failed: ${error.message}`);
    }
  }

  // Send template email
  async sendTemplateEmail(templateData) {
    try {
      if (!sendGridService.getStatus().initialized) {
        throw new Error('SendGrid email service not initialized');
      }

      console.log('📧 Sending template email via SendGrid...');
      const result = await sendGridService.sendTemplateEmail(templateData);
      
      return {
        success: true,
        messageId: result.messageId,
        provider: 'sendgrid',
        statusCode: result.statusCode
      };
      
    } catch (error) {
      console.error('❌ Template email sending failed:', error);
      throw new Error(`Template email sending failed: ${error.message}`);
    }
  }

  // Send campaign outreach email
  async sendCampaignOutreach(campaignData, contactData) {
    try {
      const emailData = {
        to: contactData.email,
        subject: campaignData.subject || `Partnership Opportunity - ${campaignData.campaignName}`,
        body: campaignData.messageBody,
        from: campaignData.fromEmail || process.env.SENDGRID_FROM_EMAIL,
        fromName: campaignData.fromName || 'InfluencerFlow Team',
        categories: ['campaign', 'outreach'],
        customEmailId: uuidv4()
      };

      console.log(`📧 Sending campaign outreach to ${contactData.name} (${contactData.email})`);
      const result = await this.sendEmail(emailData);
      
          return {
        ...result,
        contactId: contactData.id,
        campaignId: campaignData.campaignId,
        type: 'campaign_outreach'
      };

    } catch (error) {
      console.error('❌ Campaign outreach email failed:', error);
      throw new Error(`Campaign outreach failed: ${error.message}`);
    }
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.initialized,
      provider: 'sendgrid',
      sendGridStatus: sendGridService.getStatus()
    };
  }

  // Check for email replies using SendGrid Activity API
  async checkReplies(originalSubject, creatorEmail) {
    try {
      console.log(`🔍 Checking for replies from ${creatorEmail} with subject: ${originalSubject}`);
      
      // Use SendGrid to search for emails from the creator
      const searchQuery = `from_email="${creatorEmail}" AND (subject LIKE "%Re: ${originalSubject}%" OR subject LIKE "%${originalSubject}%")`;
      const replies = await sendGridService.searchEmails(searchQuery, 20);
      
      console.log(`📧 Found ${replies.length} potential replies from ${creatorEmail}`);
      
      return replies.filter(reply => {
        // Filter for emails that are actually replies (not our outbound emails)
        const isFromCreator = reply.from && reply.from.toLowerCase().includes(creatorEmail.toLowerCase());
        const isReply = reply.subject && (
          reply.subject.toLowerCase().includes('re:') ||
          reply.subject.toLowerCase().includes(originalSubject.toLowerCase())
        );
        return isFromCreator && isReply;
      }).map(reply => ({
        id: reply.id,
        messageId: reply.id,
        from: reply.from,
        to: reply.to,
        subject: reply.subject,
        status: reply.status,
        receivedAt: reply.lastEventTime,
        snippet: `Email ${reply.status} - Last activity: ${reply.lastEventTime}`,
        provider: 'sendgrid'
      }));

    } catch (error) {
      console.error(`❌ Error checking replies from ${creatorEmail}:`, error);
      // Return empty array instead of throwing to not break the workflow
      return [];
    }
  }

  // Store outreach email for tracking
  async storeOutreachEmail(emailData) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const outreachFile = path.join(__dirname, '../../data/outreach_emails.json');
      let outreachEmails = [];
      
      // Read existing emails
      if (fs.existsSync(outreachFile)) {
        outreachEmails = JSON.parse(fs.readFileSync(outreachFile, 'utf8'));
    }

      // Add new email
      const emailRecord = {
        ...emailData,
        id: emailData.id || uuidv4(),
        sentAt: new Date().toISOString(),
        status: 'sent'
      };
      
      outreachEmails.push(emailRecord);
      
      // Save back to file
      fs.writeFileSync(outreachFile, JSON.stringify(outreachEmails, null, 2));
      
      console.log(`📝 Stored outreach email record: ${emailRecord.id}`);
      return emailRecord;
      
    } catch (error) {
      console.error('❌ Error storing outreach email:', error);
      throw error;
    }
  }

  // Test email service connection
  async testConnection() {
    try {
      console.log('🧪 Testing email service connection...');
      const testResult = await sendGridService.testConnection();
      
      return {
        success: true,
        provider: 'sendgrid',
        ...testResult
      };
    } catch (error) {
      console.error('❌ Email service test failed:', error);
      throw new Error(`Email service test failed: ${error.message}`);
    }
  }
}

module.exports = new EmailService(); 