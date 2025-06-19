const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailAutomationService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
    this.templates = new Map();
    this.loadTemplates();
  }

  setupTransporter() {
    // Use Gmail OAuth2 configuration from environment
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || process.env.DEFAULT_FROM_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });

    // Fallback to SMTP if OAuth2 is not configured
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.log('⚠️ Gmail OAuth2 not configured, using SMTP fallback');
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || process.env.DEFAULT_FROM_EMAIL,
          pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
        },
      });
    }
  }

  async loadTemplates() {
    try {
      this.setupFallbackTemplates();
      console.log('✅ Email templates loaded successfully');
    } catch (error) {
      console.log('⚠️ Could not load email templates:', error.message);
      this.setupFallbackTemplates();
    }
  }

  setupFallbackTemplates() {
    const outreachTemplate = `
      <h2>Partnership Opportunity with {{campaignName}}</h2>
      <p>Hi {{creatorName}},</p>
      <p>I hope this email finds you well! I'm reaching out regarding an exciting collaboration opportunity for our campaign: <strong>{{campaignName}}</strong>.</p>
      
      <h3>Campaign Details:</h3>
      <ul>
        <li><strong>Budget:</strong> ${{budget}}</li>
        <li><strong>Target Niche:</strong> {{targetNiche}}</li>
        <li><strong>Deliverables:</strong> {{deliverables}}</li>
        <li><strong>Timeline:</strong> {{timeline}}</li>
      </ul>

      <p>Your channel perfectly aligns with our target audience of <strong>{{targetNiche}}</strong> enthusiasts. We'd love to discuss how we can work together to create engaging content that resonates with your audience.</p>

      <p><strong>What we're offering:</strong></p>
      <ul>
        <li>Competitive compensation based on your rates</li>
        <li>Creative freedom to maintain your authentic voice</li>
        <li>Long-term partnership opportunities</li>
        <li>Performance bonuses for exceptional results</li>
      </ul>

      <p>Would you be interested in a quick call this week to discuss the details? I'm available at your convenience.</p>

      <p>Looking forward to potentially working together!</p>
      
      <p>Best regards,<br>{{senderName}}<br>{{companyName}}</p>
    `;

    this.templates.set('outreach', handlebars.compile(outreachTemplate));
    console.log('✅ Fallback email templates loaded');
  }

  async sendOutreachEmail(creator, campaign, senderInfo) {
    const template = this.templates.get('outreach');
    if (!template) {
      throw new Error('Outreach template not found');
    }

    const emailData = {
      creatorName: creator.name || creator.channelName,
      campaignName: campaign.campaignName || campaign.name,
      budget: campaign.budget || 'Competitive',
      targetNiche: campaign.targetNiche || campaign.niche,
      deliverables: campaign.deliverables || '1 video, 2 social posts',
      timeline: campaign.timeline || '2-3 weeks',
      senderName: senderInfo.name || 'Campaign Manager',
      companyName: senderInfo.company || 'InfluencerFlow',
    };

    const htmlContent = template(emailData);
    const subject = `Partnership Opportunity: ${emailData.campaignName}`;

    return await this.sendEmail({
      to: creator.contactEmail || creator.email,
      subject,
      html: htmlContent,
      creatorId: creator.id,
      campaignId: campaign.id,
      emailType: 'outreach'
    });
  }

  async sendEmail({ to, subject, html, template, data, creatorId, campaignId, emailType }) {
    try {
      // If template and data provided, compile template
      if (template && data) {
        const compiledTemplate = this.templates.get(template);
        if (compiledTemplate) {
          html = compiledTemplate(data);
        }
      }

      const mailOptions = {
        from: process.env.DEFAULT_FROM_EMAIL || 'noreply@influencerflow.com',
        to,
        subject,
        html,
        // Add tracking headers
        headers: {
          'X-Campaign-ID': campaignId || 'unknown',
          'X-Creator-ID': creatorId || 'unknown',
          'X-Email-Type': emailType || 'general'
        }
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email sent successfully to ${to}`);
      console.log(`📧 Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        to,
        subject,
        emailType,
        sentAt: new Date(),
        provider: 'nodemailer'
      };

    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      
      // Return simulation result in case of error (for development)
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [SIMULATION] Email would have been sent with content:', { to, subject, html: html?.substring(0, 100) + '...' });
        return {
          success: true,
          messageId: 'sim-' + Date.now(),
          to,
          subject,
          emailType,
          sentAt: new Date(),
          provider: 'simulation',
          note: 'Simulated due to email configuration issues'
        };
      }
      
      throw error;
    }
  }

  async verifyConnection() {
    try {
      const verified = await this.transporter.verify();
      if (verified) {
        console.log('✅ Email service is ready to send emails');
        return true;
      }
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = EmailAutomationService; 