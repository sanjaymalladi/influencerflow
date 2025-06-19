const { Resend } = require('resend');

class ResendEmailService {
  constructor() {
    // Initialize Resend with API key from environment
    this.resend = new Resend(process.env.RESEND_API_KEY);
    
    // Default sender email (should be a verified domain in Resend)
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    console.log('📧 Resend Email Service initialized');
  }

  /**
   * Send an email using Resend
   * @param {Object} emailData 
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - HTML content
   * @param {string} emailData.text - Plain text content
   * @param {string} emailData.from - Sender email (optional)
   * @returns {Promise<Object>} - Email send result
   */
  async sendEmail(emailData) {
    try {
      const { to, subject, html, text, from } = emailData;
      
      console.log(`📧 [Resend] Sending email to: ${to}`);
      console.log(`📧 [Resend] Subject: ${subject}`);

      const emailPayload = {
        from: from || this.defaultFrom,
        to: [to],
        subject: subject,
        html: html,
        text: text || this.extractTextFromHtml(html)
      };

      const result = await this.resend.emails.send(emailPayload);

      if (result.data) {
        console.log(`✅ [Resend] Email sent successfully! ID: ${result.data.id}`);
        
        return {
          success: true,
          messageId: result.data.id,
          provider: 'resend',
          to: to,
          subject: subject,
          sentAt: new Date(),
          deliveryStatus: 'sent'
        };
      } else {
        throw new Error('No data returned from Resend API');
      }

    } catch (error) {
      console.error('❌ [Resend] Email send failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        provider: 'resend',
        to: emailData.to,
        subject: emailData.subject,
        sentAt: new Date(),
        deliveryStatus: 'failed'
      };
    }
  }

  /**
   * Send outreach email with professional template
   */
  async sendOutreachEmail(creatorData, campaignData, personalizedContent) {
    const { name, email } = creatorData;
    const { campaignName, brandName } = campaignData;

    const subject = `Partnership Opportunity: ${campaignName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #ddd; border-top: none; }
            .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #666; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Partnership Opportunity</h1>
              <p>We'd love to collaborate with you!</p>
            </div>
            
            <div class="content">
              <p>Hi ${name},</p>
              
              <p>I hope this email finds you well! We've been following your amazing content and would love to explore a partnership opportunity with you.</p>
              
              <div class="highlight">
                <strong>Campaign:</strong> ${campaignName}<br>
                <strong>Brand:</strong> ${brandName || 'Our Brand'}
              </div>
              
              ${personalizedContent ? `<p>${personalizedContent}</p>` : ''}
              
              <p>We believe your audience would love what we have to offer, and we're excited about the possibility of working together.</p>
              
              <p>Would you be interested in learning more about this collaboration? I'd be happy to share more details about the campaign, compensation, and deliverables.</p>
              
              <a href="mailto:${process.env.CONTACT_EMAIL || 'hello@example.com'}" class="cta-button">Let's Chat!</a>
              
              <p>Looking forward to hearing from you!</p>
              
              <p>Best regards,<br>
              The ${brandName || 'Our'} Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent as part of our influencer outreach campaign.</p>
              <p>If you're not interested, please reply with "No thanks" and we'll respect your decision.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Hi ${name},

I hope this email finds you well! We've been following your amazing content and would love to explore a partnership opportunity with you.

Campaign: ${campaignName}
Brand: ${brandName || 'Our Brand'}

${personalizedContent ? personalizedContent : ''}

We believe your audience would love what we have to offer, and we're excited about the possibility of working together.

Would you be interested in learning more about this collaboration? I'd be happy to share more details about the campaign, compensation, and deliverables.

Looking forward to hearing from you!

Best regards,
The ${brandName || 'Our'} Team

---
This email was sent as part of our influencer outreach campaign.
If you're not interested, please reply with "No thanks" and we'll respect your decision.
    `;

    return await this.sendEmail({
      to: email,
      subject: subject,
      html: html,
      text: textContent
    });
  }

  /**
   * Extract plain text from HTML (simple implementation)
   */
  extractTextFromHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Health check for the email service
   */
  async healthCheck() {
    try {
      // Test if API key is configured
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured');
      }
      
      console.log('✅ [Resend] Health check passed');
      return { status: 'healthy', provider: 'resend' };
    } catch (error) {
      console.error('❌ [Resend] Health check failed:', error.message);
      return { status: 'unhealthy', provider: 'resend', error: error.message };
    }
  }
}

module.exports = ResendEmailService; 