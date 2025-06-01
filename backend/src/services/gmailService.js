let google;
try {
  const googleapis = require('googleapis');
  google = googleapis.google;
} catch (error) {
  console.log('Gmail service disabled - googleapis not available');
  google = null;
}

const fs = require('fs');
const path = require('path');

class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.isAuthenticated = false;
    this.watchExpiration = null;
    this.setupOAuth();
  }

  setupOAuth() {
    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/auth/gmail/callback'
      );

      // Load saved refresh token if exists
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      if (refreshToken && refreshToken !== 'your_gmail_refresh_token_here') {
        this.oauth2Client.setCredentials({
          refresh_token: refreshToken
        });
        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        this.isAuthenticated = true;
        console.log('✅ Gmail API authenticated with refresh token');
        this.setupWatch();
      } else {
        console.log('⚠️ Gmail refresh token not configured');
      }
    } catch (error) {
      console.error('❌ Failed to setup Gmail OAuth:', error);
    }
  }

  // Generate OAuth URL for first-time authentication
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async authenticate(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      console.log('✅ Gmail authentication successful!');
      console.log('📝 Add this to your .env file:');
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.isAuthenticated = true;
      
      await this.setupWatch();
      return tokens;
    } catch (error) {
      console.error('❌ Gmail authentication failed:', error);
      throw error;
    }
  }

  // Setup Gmail push notifications
  async setupWatch() {
    if (!this.isAuthenticated) return;

    try {
      // First, get user's email address
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      console.log(`📧 Gmail connected for: ${profile.data.emailAddress}`);

      // Only try to setup watch if we have a valid project ID and topic
      if (process.env.GMAIL_PROJECT_ID && process.env.GMAIL_PUBSUB_TOPIC) {
        try {
          // Setup watch for new messages
          const watchResponse = await this.gmail.users.watch({
            userId: 'me',
            requestBody: {
              topicName: `projects/${process.env.GMAIL_PROJECT_ID}/topics/${process.env.GMAIL_PUBSUB_TOPIC}`,
              labelIds: ['INBOX'],
              labelFilterAction: 'include'
            }
          });

          this.watchExpiration = watchResponse.data.expiration;
          console.log('✅ Gmail watch setup successful');
          console.log(`📅 Watch expires: ${new Date(parseInt(this.watchExpiration))}`);
        } catch (watchError) {
          console.log('⚠️ Gmail watch setup failed (falling back to polling):', watchError.message);
          if (watchError.message.includes('Resource not found')) {
            console.log('💡 To enable real-time notifications, create a Cloud Pub/Sub topic and update your environment variables');
          }
        }
      } else {
        console.log('⚠️ Gmail Pub/Sub not configured - using polling only');
        console.log('💡 Set GMAIL_PROJECT_ID and GMAIL_PUBSUB_TOPIC environment variables for real-time notifications');
      }

      // Start polling for new emails as fallback
      this.startPolling();
      
    } catch (error) {
      console.error('❌ Failed to setup Gmail integration:', error);
      // Still try to start polling as a fallback
      this.startPolling();
    }
  }

  // Start polling for new emails (fallback method)
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    console.log('🔄 Starting Gmail polling every 30 seconds...');
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewReplies();
    }, 30000); // Check every 30 seconds
  }

  // Check for new email replies
  async checkForNewReplies() {
    if (!this.isAuthenticated) return;

    try {
      // Get recent messages (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const query = `after:${Math.floor(fiveMinutesAgo.getTime() / 1000)} in:inbox`;

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      if (response.data.messages) {
        console.log(`📬 Found ${response.data.messages.length} recent messages`);
        
        for (const message of response.data.messages) {
          await this.processMessage(message.id);
        }
      }
    } catch (error) {
      console.error('❌ Error checking for replies:', error);
    }
  }

  // Process individual message
  async processMessage(messageId) {
    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = message.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const messageIdHeader = headers.find(h => h.name === 'Message-ID')?.value || '';
      const references = headers.find(h => h.name === 'References')?.value || '';
      const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value || '';

      // Check if this is a reply to our outreach email
      if (subject.toLowerCase().includes('re:') || references || inReplyTo) {
        console.log(`📧 Potential reply detected: ${subject}`);
        
        // Extract email body
        const body = this.extractEmailBody(message.data.payload);
        
        if (body) {
          // Create email data structure for reply detection service
          const emailData = {
            from: { email: this.extractEmail(from), name: this.extractName(from) },
            to: { email: this.extractEmail(to), name: this.extractName(to) },
            subject: subject,
            text: body,
            messageId: messageIdHeader,
            references: references ? references.split(' ') : [],
            inReplyTo: inReplyTo,
            timestamp: new Date(parseInt(message.data.internalDate)).toISOString()
          };

          // Process through our reply detection service (lazy load to avoid circular dependency)
          try {
            const replyDetectionService = require('./replyDetectionService');
            await replyDetectionService.handleIncomingEmail(emailData);
          } catch (error) {
            console.error('❌ Error processing reply with AI service:', error);
          }
          
          // Mark message as processed (add label)
          await this.markAsProcessed(messageId);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing message ${messageId}:`, error);
    }
  }

  // Extract email body from Gmail message payload
  extractEmailBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString();
          break;
        } else if (part.mimeType === 'text/html' && part.body && part.body.data && !body) {
          // Fallback to HTML if no plain text
          body = Buffer.from(part.body.data, 'base64').toString();
          // Basic HTML to text conversion
          body = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        } else if (part.parts) {
          // Nested parts
          const nestedBody = this.extractEmailBody(part);
          if (nestedBody) body = nestedBody;
        }
      }
    }

    return body.trim();
  }

  // Extract email address from "Name <email@domain.com>" format
  extractEmail(emailString) {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString.split(' ').pop();
  }

  // Extract name from "Name <email@domain.com>" format
  extractName(emailString) {
    const match = emailString.match(/^(.+?)\s*</);
    return match ? match[1].trim().replace(/"/g, '') : emailString;
  }

  // Mark message as processed
  async markAsProcessed(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD'], // Keep as unread for now
          removeLabelIds: []
        }
      });
    } catch (error) {
      console.error('❌ Error marking message as processed:', error);
    }
  }

  // Send email through Gmail
  async sendEmail({ to, subject, body, from, fromName }) {
    if (!this.isAuthenticated) {
      throw new Error('Gmail not authenticated');
    }

    try {
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      const senderEmail = profile.data.emailAddress;

      // Create email with unique identifier for reply tracking
      const emailId = `EMAIL-ID-${Date.now()}`;
      const subjectWithId = `${subject} [${emailId}]`;

      const email = [
        `From: ${fromName || 'InfluencerFlow'} <${senderEmail}>`,
        `To: ${to}`,
        `Subject: ${subjectWithId}`,
        `Content-Type: text/plain; charset=utf-8`,
        '',
        body,
        '',
        `---`,
        `This email was sent via InfluencerFlow`,
        `Reference ID: ${emailId}`
      ].join('\n');

      const base64Email = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64Email
        }
      });

      console.log('✅ Email sent via Gmail:', response.data.id);

      return {
        messageId: response.data.id,
        provider: 'gmail',
        emailId: emailId
      };

    } catch (error) {
      console.error('❌ Gmail send error:', error);
      throw error;
    }
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ Gmail polling stopped');
    }
  }

  // Check authentication status
  isReady() {
    return this.isAuthenticated;
  }

  // Get authentication status
  getStatus() {
    return {
      authenticated: this.isAuthenticated,
      watchExpiration: this.watchExpiration ? new Date(parseInt(this.watchExpiration)) : null,
      polling: !!this.pollingInterval
    };
  }
}

module.exports = new GmailService(); 