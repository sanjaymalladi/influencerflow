const { google } = require('googleapis');
const { MailerSend, Recipient, EmailParams } = require('mailersend');
const { v4: uuidv4 } = require('uuid');
const gmailService = require('./gmailService');

class EmailService {
  constructor() {
    this.gmailClient = null;
    this.mailerSend = null;
    this.initializeServices();
  }

  async initializeServices() {
    // Initialize Gmail API
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );

      if (process.env.GMAIL_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
        
        this.gmailClient = google.gmail({
          version: 'v1',
          auth: this.oauth2Client
        });
      }
    }

    // Initialize MailerSend
    if (process.env.MAILERSEND_API_KEY) {
      this.mailerSend = new MailerSend({
        apiKey: process.env.MAILERSEND_API_KEY,
      });
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

  // Send email via Gmail API
  async sendViaGmail(emailData) {
    if (!this.gmailClient) {
      throw new Error('Gmail API not configured');
    }

    const { to, subject, body, trackingId } = emailData;
    
    // Add tracking pixel to email body
    const trackingPixel = this.generateTrackingPixel(trackingId);
    const trackedBody = body + trackingPixel;

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      trackedBody
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64');

    try {
      const result = await this.gmailClient.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return {
        success: true,
        messageId: result.data.id,
        provider: 'gmail'
      };
    } catch (error) {
      console.error('Gmail send error:', error);
      throw error;
    }
  }

  // Send email via MailerSend
  async sendViaMailerSend(emailData) {
    if (!this.mailerSend) {
      throw new Error('MailerSend not configured');
    }

    const { to, subject, body, trackingId, from, fromName } = emailData;
    
    // Add tracking pixel to email body
    const trackingPixel = this.generateTrackingPixel(trackingId);
    const trackedBody = body + trackingPixel;

    // Create recipients array
    const recipients = [new Recipient(to, to.split('@')[0])];

    // Create email parameters using the correct API structure
    const emailParams = new EmailParams();
    
    // Set email properties
    emailParams.from = {
      email: from || process.env.MAILERSEND_FROM_EMAIL || 'noreply@influencerflow.com',
      name: fromName || process.env.MAILERSEND_FROM_NAME || 'InfluencerFlow'
    };
    
    emailParams.to = recipients;
    emailParams.subject = subject;
    emailParams.html = trackedBody;
    emailParams.text = body.replace(/<[^>]*>/g, ''); // Strip HTML for text version

    try {
      const result = await this.mailerSend.email.send(emailParams);
      
      return {
        success: true,
        messageId: result?.data?.messageId || 'mailersend-' + Date.now(),
        provider: 'mailersend'
      };
    } catch (error) {
      console.error('MailerSend send error:', error);
      throw error;
    }
  }

  // Main send email method
  async sendEmail(emailData) {
    const trackingId = emailData.customEmailId || uuidv4();
    const dataWithTracking = { ...emailData, trackingId };

    try {
      // Priority 1: Try Gmail API service first (with reply detection)
      try {
        // Lazy load to avoid circular dependency
        const gmailSvc = require('./gmailService');
        if (gmailSvc && gmailSvc.isReady && gmailSvc.isReady()) {
          console.log('🥇 Sending via Gmail API service (Priority 1)...');
          const result = await gmailSvc.sendEmail(dataWithTracking);
          return {
            success: true,
            messageId: result.messageId,
            provider: 'gmail',
            trackingId: trackingId
          };
        }
      } catch (e) {
        console.log('⚠️ Gmail service not ready, trying fallback...');
      }

      // Priority 2: Fallback to legacy Gmail implementation
      if (this.gmailClient) {
        console.log('🥈 Sending via legacy Gmail API (Priority 2)...');
        return await this.sendViaGmail(dataWithTracking);
      } 

      // Priority 3: Fallback to MailerSend
      if (this.mailerSend) {
        console.log('🥉 Sending via MailerSend (Priority 3)...');
        return await this.sendViaMailerSend(dataWithTracking);
      } 

      throw new Error('No email service configured');

    } catch (error) {
      console.error('Primary email service failed:', error);
      
      // Emergency fallback chain
      try {
        if (this.mailerSend) {
          console.log('🆘 Emergency fallback: MailerSend...');
          return await this.sendViaMailerSend(dataWithTracking);
        } else if (this.gmailClient) {
          console.log('🆘 Emergency fallback: Legacy Gmail...');
          return await this.sendViaGmail(dataWithTracking);
        }
      } catch (fallbackError) {
        console.error('All email services failed:', fallbackError);
      }
      
      throw error;
    }
  }

  // Get Gmail messages (for reply tracking)
  async getGmailMessages(query = '', maxResults = 10) {
    if (!this.gmailClient) {
      throw new Error('Gmail API not configured');
    }

    try {
      const response = await this.gmailClient.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      if (!response.data.messages) {
        return [];
      }

      const messages = await Promise.all(
        response.data.messages.map(async (message) => {
          const details = await this.gmailClient.users.messages.get({
            userId: 'me',
            id: message.id
          });
          
          return this.parseGmailMessage(details.data);
        })
      );

      return messages;
    } catch (error) {
      console.error('Gmail messages fetch error:', error);
      throw error;
    }
  }

  // Parse Gmail message
  parseGmailMessage(message) {
    const headers = message.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      snippet: message.snippet,
      body: this.extractMessageBody(message.payload)
    };
  }

  // Extract message body from Gmail payload
  extractMessageBody(payload) {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body && part.body.data) {
            return Buffer.from(part.body.data, 'base64').toString();
          }
        }
      }
    }

    return '';
  }

  // Check for replies to sent emails
  async checkReplies(originalSubject, senderEmail) {
    try {
      const query = `from:${senderEmail} subject:"Re: ${originalSubject}"`;
      const replies = await this.getGmailMessages(query);
      return replies;
    } catch (error) {
      console.error('Check replies error:', error);
      return [];
    }
  }

  // Generate OAuth URL for Gmail setup
  generateGmailAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    if (!this.oauth2Client) {
      throw new Error('Gmail OAuth not configured');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 