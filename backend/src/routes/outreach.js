const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const emailService = require('../services/emailService');
const newGmailService = require('../services/gmailService');
const { getSupabaseUserId, getDbClient, isSupabaseAvailable, findCreatorById, findCampaignById } = require('../utils/outreachHelpers');

const router = express.Router();

// In-memory storage for mock emails
const mockEmailsStore = new Map();

// Load local JSON data as fallback
let localCreators = [];
let localCampaigns = [];

try {
  localCreators = require('../../data/creators.json');
  console.log(`📂 Loaded ${localCreators.length} creators from local JSON`);
} catch (error) {
  console.log('⚠️ Local creators.json not found, using Supabase only');
}

try {
  localCampaigns = require('../../data/campaigns.json');
  console.log(`📂 Loaded ${localCampaigns.length} campaigns from local JSON`);
} catch (error) {
  console.log('⚠️ Local campaigns.json not found, using Supabase only');
}

// DEBUG ENDPOINT - Remove in production
router.get('/debug', (req, res) => {
  res.json({
    supabaseAvailable: supabase !== null || supabaseAdmin !== null,
    supabaseClient: supabase ? 'AVAILABLE' : 'NULL',
    supabaseAdmin: supabaseAdmin ? 'AVAILABLE' : 'NULL',
    localData: {
      creators: localCreators.length,
      campaigns: localCampaigns.length
    },
    envVars: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'
    }
  });
});

// Placeholder function to get user's Gmail tokens from Supabase
const getUserGmailTokens = async (userId, dbClient) => {
  if (!userId || !dbClient) {
    console.error('getUserGmailTokens: Missing userId or dbClient');
    return null;
  }
  try {
    console.log(`getUserGmailTokens: Fetching Gmail tokens for user ${userId}`);
    const { data: user, error } = await dbClient
      .from('users')
      .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry')
      .eq('id', userId)
        .single();
      
    if (error) {
      console.error(`getUserGmailTokens: Error fetching tokens for user ${userId}:`, error.message);
      return null;
    }

    if (!user || !user.gmail_access_token) {
      console.log(`getUserGmailTokens: No Gmail tokens found for user ${userId}`);
      return null;
    }

    console.log(`getUserGmailTokens: Successfully fetched tokens for user ${userId}`);
    return {
      access_token: user.gmail_access_token,
      refresh_token: user.gmail_refresh_token,
      expiry_date: user.gmail_token_expiry,
    };
  } catch (err) {
    console.error(`getUserGmailTokens: Exception for user ${userId}:`, err.message);
    return null;
    }
};

// Placeholder function to update user's Gmail tokens in Supabase
// YOU MUST IMPLEMENT THIS PROPERLY
const updateUserGmailTokensInDb = async (userId, tokens, dbClient) => {
  if (!userId || !tokens || !dbClient) {
    console.error('updateUserGmailTokensInDb: Missing userId, tokens, or dbClient');
    return;
  }
  try {
    console.log(`updateUserGmailTokensInDb: Updating Gmail tokens for user ${userId}`);
    const updatePayload = {
      gmail_access_token: tokens.access_token,
      gmail_token_expiry: tokens.expiry_date,
      gmail_last_sync: new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      updatePayload.gmail_refresh_token = tokens.refresh_token;
    }

    const { error } = await dbClient
      .from('users')
      .update(updatePayload)
      .eq('id', userId);
      
    if (error) {
      console.error(`updateUserGmailTokensInDb: Failed to update tokens for user ${userId}:`, error.message);
    } else {
      console.log(`updateUserGmailTokensInDb: Successfully updated tokens for user ${userId}`);
    }
  } catch (err) {
    console.error(`updateUserGmailTokensInDb: Exception for user ${userId}:`, err.message);
  }
};

// @route   GET /api/outreach/stats
// @desc    Get outreach statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseAvailable()) {
      return res.json({
        success: true,
        data: {
          sentEmails: 0,
          openedEmails: 0,
          repliedEmails: 0,
          responseRate: 0
        }
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.json({
        success: true,
        data: {
          sentEmails: 0,
          openedEmails: 0,
          repliedEmails: 0,
          responseRate: 0
        }
      });
    }

    const { data: userEmails, error } = await dbClient
      .from('outreach_emails')
      .select('*');

    if (error) {
      throw new Error('Error fetching emails: ' + error.message);
    }

    const stats = {
      sentEmails: userEmails.filter(e => e.status === 'sent').length,
      openedEmails: userEmails.filter(e => e.status === 'opened').length,
      repliedEmails: userEmails.filter(e => e.status === 'replied').length,
      responseRate: userEmails.length > 0 ? 
        ((userEmails.filter(e => e.status === 'replied').length / userEmails.filter(e => e.status === 'sent').length) * 100) : 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get outreach stats error:', error);
    res.json({
      success: true,
      data: {
        sentEmails: 0,
        openedEmails: 0,
        repliedEmails: 0,
        responseRate: 0
      }
    });
  }
});

// @route   GET /api/outreach/emails
// @desc    Get outreach emails
// @access  Private
router.get('/emails', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseAvailable()) {
      console.warn('⚠️ Supabase not available, returning empty emails list');
      return res.json({
        success: true,
        data: { emails: [] },
        message: 'Database temporarily unavailable'
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.json({
        success: true,
        data: { emails: [] },
        message: 'Database client not available'
      });
    }

    const { data: emails, error } = await dbClient
      .from('outreach_emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching emails: ' + error.message);
    }

    // Merge Supabase emails with mock emails from memory
    const allEmails = [...(emails || [])];
    
    // Add mock emails from memory store
    for (const [emailId, mockEmail] of mockEmailsStore.entries()) {
      // Remove internal fields before sending to frontend
      const { _creator, _campaign, ...publicEmail } = mockEmail;
      allEmails.push(publicEmail);
    }

    // Sort by creation date (newest first)
    allEmails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      success: true,
      data: { emails: allEmails }
    });

  } catch (error) {
    console.error('Get outreach emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching outreach emails'
    });
  }
});

// @route   POST /api/outreach/emails
// @desc    Create new outreach email
// @access  Private (Brand/Agency only)
router.post('/emails', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const { campaignId, creatorId, subject, body } = req.body;

    if (!campaignId || !creatorId || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide campaignId, creatorId, subject, and body'
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    
    console.log(`📝 Creating email for campaign: ${campaignId}, creator: ${creatorId}`);

    // Validate campaign and creator exist
    const campaign = await findCampaignById(campaignId, supabaseUserId);
    const creator = await findCreatorById(creatorId, supabaseUserId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `Campaign not found: ${campaignId}`
      });
    }

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: `Creator not found: ${creatorId}`
      });
    }

    console.log(`✅ Found campaign: ${campaign.name}`);
    console.log(`✅ Found creator: ${creator.channel_name}`);

    // Try to store in Supabase if available and we have UUID-compatible data
    if (isSupabaseAvailable()) {
      try {
        const dbClient = getDbClient(supabaseUserId);
        
        // For string-based IDs, we need to store them differently or use the local system
        let emailData;
        
        if (campaign.id.includes('-') && campaign.id.length > 30 && 
            creator.id.includes('-') && creator.id.length > 30) {
          // Both are UUIDs, safe to store in Supabase
          emailData = {
            campaign_id: campaign.id,
            creator_id: creator.id,
      subject,
            content: body,
      status: 'draft',
            created_at: new Date().toISOString()
          };

          const { data: newEmail, error } = await dbClient
            .from('outreach_emails')
            .insert([emailData])
            .select()
            .single();

          if (!error && newEmail) {
            console.log(`✅ Email stored in Supabase with ID: ${newEmail.id}`);
            return res.status(201).json({
      success: true,
      message: 'Email created successfully',
      data: newEmail
            });
          }
        }
        
        console.log('⚠️ String-based IDs detected, creating mock email instead of Supabase storage');
      } catch (supabaseError) {
        console.log('⚠️ Supabase storage failed, creating mock email:', supabaseError.message);
      }
    }

    // Fallback: Create mock email with local data
    const timestamp = Date.now();
    const mockEmail = {
      id: `email-${timestamp}`,
      campaign_id: campaign.id,
      creator_id: creator.id,
      campaign_name: campaign.name,
      creator_name: creator.channelName || creator.channel_name,
      subject,
      content: body,
      status: 'draft',
      created_at: new Date().toISOString(),
      // Store the full creator and campaign objects for sending
      _creator: creator,
      _campaign: campaign
    };

    // Store mock email in memory for later retrieval during sending
    mockEmailsStore.set(mockEmail.id, mockEmail);
    console.log(`✅ Mock email created with ID: ${mockEmail.id} for creator: ${creator.channelName || creator.channel_name}`);
    console.log(`📧 STORED EMAIL DEBUG - Subject: "${subject}", Content length: ${body.length}, Creator: ${creator.channelName || creator.channel_name} (${creator.id})`);

    res.status(201).json({
      success: true,
      message: 'Email created successfully (using local data)',
      data: mockEmail
    });

  } catch (error) {
    console.error('Create email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating email',
      debug: {
        error: error.message,
        supabaseAvailable: isSupabaseAvailable(),
        timestamp: new Date().toISOString()
      }
    });
  }
});

// @route   PUT /api/outreach/emails/:id/send
// @desc    Send outreach email, preferring user's Gmail if connected
// @access  Private (Brand/Agency only)
router.put('/emails/:id/send', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const emailId = req.params.id;
    const authUserId = req.user.id; // User ID from JWT token
    const supabaseUserId = getSupabaseUserId(authUserId); // Potentially maps to a Supabase user ID if different
    const dbClient = getDbClient(supabaseUserId); // Get Supabase client instance
    
    console.log(`📧 Attempting to send email with ID: ${emailId} for user: ${authUserId}`);
    
    let email = null;
    let isMockEmail = emailId.startsWith('email-') || emailId.startsWith('mock-');
    
    if (isMockEmail) {
      console.log('📧 Detected mock email, retrieving from memory...');
      email = mockEmailsStore.get(emailId);
    if (!email) {
        console.log(`❌ Mock email ${emailId} not found in memory store`);
        return res.status(404).json({ success: false, message: 'Mock email not found. Please recreate it.' });
      }
    } else {
      if (!isSupabaseAvailable() || !dbClient) {
        return res.status(503).json({ success: false, message: 'Database service unavailable.' });
      }
      const { data: supabaseEmail, error: emailError } = await dbClient
        .from('outreach_emails')
        .select('*, campaigns(*), creators(*)') // Fetch related campaign and creator
        .eq('id', emailId)
        .single();
      if (emailError || !supabaseEmail) {
        return res.status(404).json({ success: false, message: 'Email not found in database.' });
      }
      email = supabaseEmail;
      // If creator/campaign were joined, they are available as email.creators and email.campaigns
      // If not joined directly, ensure findCreatorById and findCampaignById are called.
    }

    console.log(`📧 Found email: ${email.subject} for campaign ${email.campaign_id}`);

    let creator = isMockEmail ? email._creator : (email.creators || await findCreatorById(email.creator_id, supabaseUserId));
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found for this email.' });
      }
    console.log(`✅ Creator identified: ${creator.channelName || creator.channel_name} (ID: ${creator.id})`);

    const recipientEmail = creator.contact_email || `${(creator.channelName || creator.channel_name || 'default').toLowerCase().replace(/\\s+/g, '')}@example.com`;
    const emailContentWithFooter = `${email.content}\n\n---\nThis email was sent via InfluencerFlow\nReference ID: ${emailId.toUpperCase()}`;

    let emailResult = null;
    let sentViaGmail = false;

    // --- Try sending with newGmailService if user tokens are available ---
    const userGmailTokens = await getUserGmailTokens(authUserId, dbClient);

    if (userGmailTokens && userGmailTokens.access_token) {
      console.log(`Attempting to send via user's connected Gmail for user ${authUserId}`);
      try {
        const onTokensRefreshedCallback = async (newTokens) => {
          await updateUserGmailTokensInDb(authUserId, newTokens, dbClient);
        };
        
        // Constructing the inReplyTo and threadId if this is a follow-up
        // For an initial email, these would be null. This needs more advanced logic if we're sending replies via this same endpoint.
        // For now, assuming initial send:
        const inReplyToHeader = null; // Placeholder: determine if this is a reply based on conversation context
        const existingThreadId = email.email_thread_id; // Get from outreach_emails if it was set by a previous send in this thread

        emailResult = await newGmailService.sendEmail(
          {
            to: recipientEmail,
            subject: email.subject,
            body: email.content, // Send original content, not with footer if Gmail handles it. Or decide.
            inReplyTo: inReplyToHeader,
            threadId: existingThreadId 
          },
          { // Pass tokens in the structure expected by newGmailService
            gmail_access_token: userGmailTokens.access_token,
            gmail_refresh_token: userGmailTokens.refresh_token,
            gmail_token_expiry: userGmailTokens.expiry_date
          },
          onTokensRefreshedCallback
        );
        
        sentViaGmail = true;
        console.log('✅ Email sent successfully via newGmailService (User\'s Gmail). Message ID:', emailResult.id, "Thread ID:", emailResult.threadId);
      } catch (gmailError) {
        console.error('❌ Failed to send via newGmailService (User\'s Gmail):', gmailError.message);
        // Optionally, decide if you want to fallback to default emailer or just fail
        if (gmailError.message.includes("User needs to re-authenticate")) {
             return res.status(401).json({ success: false, message: "Gmail connection error: User needs to re-authenticate.", code: "GMAIL_AUTH_ERROR"});
        }
        // For other errors, we might fallback or return error
        console.log('Falling back to default email service due to Gmail send error.');
        // Fallthrough to legacy emailService
      }
    }

    // --- Fallback to legacy emailService if newGmailService wasn't used or failed (and we decided to fallback) ---
    if (!sentViaGmail) {
      console.log('🥈 Sending via legacy emailService...');
      emailResult = await emailService.sendEmail({ // This is the OLD service
        to: recipientEmail,
        subject: email.subject,
        body: emailContentWithFooter, // Old service might need footer
        from: process.env.DEFAULT_FROM_EMAIL || 'outreach@influencerflow.com',
        fromName: process.env.DEFAULT_FROM_NAME || 'InfluencerFlow Team',
        customEmailId: emailId
      });
      console.log('✅ Email sent successfully via legacy emailService. Message ID:', emailResult.messageId);
    }

    // --- Update database ---
      const updateData = {
      status: 'sent',
        sent_at: new Date().toISOString(),
      provider: sentViaGmail ? 'user_gmail' : (emailResult.provider || 'default_email_service'),
      external_id: sentViaGmail ? emailResult.id : emailResult.messageId, // Gmail's message ID
      email_thread_id: sentViaGmail ? emailResult.threadId : (email.email_thread_id || null), // Store Gmail's thread ID
      // creator_id: creator.id, // Already part of email object, ensure it's correct
        tracking_data: {
        ...(email.tracking_data || {}), // Preserve existing tracking data
        recipientEmail: recipientEmail,
        deliveryStatus: 'delivered', // Assuming delivered, actual status might need webhooks
        messageId: sentViaGmail ? emailResult.id : emailResult.messageId,
        threadId: sentViaGmail ? emailResult.threadId : (email.email_thread_id || null),
        sentAt: new Date().toISOString(),
        sentMethod: sentViaGmail ? 'user_gmail' : 'legacy_service'
        }
      };

    let updatedEmailInDb = null;
    if (!isMockEmail && isSupabaseAvailable() && dbClient) {
        const { data: supabaseUpdatedEmail, error: updateError } = await dbClient
          .from('outreach_emails')
          .update(updateData)
          .eq('id', emailId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating email status in Supabase:', updateError);
        // Don't let DB update failure hide a successful send. Log and continue.
        } else {
        updatedEmailInDb = supabaseUpdatedEmail;
        console.log('📧 Email status updated in Supabase.');
      }
      
      // Also update the conversation table with the thread ID if sent via Gmail
      if (sentViaGmail && emailResult.threadId && email.conversation_id) {
        const { error: convError } = await dbClient
            .from('conversations')
            .update({ email_thread_id: emailResult.threadId, last_message_at: new Date().toISOString() })
            .eq('id', email.conversation_id);
        if (convError) {
            console.error('Error updating conversation with thread ID:', convError);
        } else {
            console.log('Conversation updated with Gmail thread ID:', emailResult.threadId);
        }
      }

    } else if (isMockEmail) {
      email = { ...email, ...updateData };
      mockEmailsStore.set(emailId, email);
      updatedEmailInDb = email;
          console.log(`📧 Updated mock email in memory store: ${emailId}`);
      }

    res.json({
      success: true,
      message: `Email sent successfully via ${sentViaGmail ? "User's Gmail" : "default service"}.`,
      data: updatedEmailInDb || { ...email, ...updateData } // Return the most updated version
    });

  } catch (error) {
    console.error('Send email route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending email: ' + error.message,
      debug: { errorName: error.name, errorMessage: error.message }
    });
  }
});

// @route   GET /api/outreach/templates
// @desc    Get email templates (fallback)
// @access  Private
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching templates'
    });
  }
});

// @route   GET /api/outreach/pipeline
// @desc    Get CRM-style email pipeline with stages
// @access  Private
router.get('/pipeline', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseAvailable()) {
      return res.json({
      success: true,
        data: {
          pipeline: {
            draft: [],
            sent: [],
            opened: [],
            replied: [],
            failed: []
          },
          metrics: {
            totalEmails: 0,
            draftCount: 0,
            sentCount: 0,
            openedCount: 0,
            repliedCount: 0,
            failedCount: 0,
            openRate: '0',
            replyRate: '0',
            deliveryRate: '0'
          }
        }
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.json({
      success: true,
        data: {
          pipeline: { draft: [], sent: [], opened: [], replied: [], failed: [] },
          metrics: { totalEmails: 0, draftCount: 0, sentCount: 0, openedCount: 0, repliedCount: 0, failedCount: 0, openRate: '0', replyRate: '0', deliveryRate: '0' }
        }
      });
    }

    const { data: emails, error } = await dbClient
      .from('outreach_emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching pipeline emails: ' + error.message);
    }

    // Merge with mock emails
    const allEmails = [...(emails || [])];
    for (const [emailId, mockEmail] of mockEmailsStore.entries()) {
      const { _creator, _campaign, ...publicEmail } = mockEmail;
      allEmails.push(publicEmail);
    }

    // Group emails by status
    const pipeline = {
      draft: allEmails.filter(e => e.status === 'draft'),
      sent: allEmails.filter(e => e.status === 'sent'),
      opened: allEmails.filter(e => e.status === 'opened'),
      replied: allEmails.filter(e => e.status === 'replied'),
      failed: allEmails.filter(e => e.status === 'failed')
    };

    const totalEmails = allEmails.length;
    const sentEmails = pipeline.sent.length + pipeline.opened.length + pipeline.replied.length;
    
    const metrics = {
      totalEmails,
      draftCount: pipeline.draft.length,
      sentCount: pipeline.sent.length,
      openedCount: pipeline.opened.length,
      repliedCount: pipeline.replied.length,
      failedCount: pipeline.failed.length,
      openRate: sentEmails > 0 ? (((pipeline.opened.length + pipeline.replied.length) / sentEmails) * 100).toFixed(2) : '0',
      replyRate: sentEmails > 0 ? ((pipeline.replied.length / sentEmails) * 100).toFixed(2) : '0',
      deliveryRate: totalEmails > 0 ? (((totalEmails - pipeline.failed.length) / totalEmails) * 100).toFixed(2) : '0'
    };

    res.json({
      success: true,
      data: { pipeline, metrics }
    });

  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pipeline data'
    });
  }
});

// @route   GET /api/outreach/pending-approvals
// @desc    Get pending approvals (placeholder for now)
// @access  Private
router.get('/pending-approvals', authenticateToken, async (req, res) => {
  try {
    // For now, return empty array - can be extended with actual approval system
    res.json({
      success: true,
      data: { approvals: [] }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending approvals'
    });
  }
});

// @route   PUT /api/outreach/emails/:id/status
// @desc    Update email status (for tracking)
// @access  Private
router.put('/emails/:id/status', authenticateToken, async (req, res) => {
  try {
    const emailId = req.params.id;
    const { status, openedAt, repliedAt, notes } = req.body;
    const supabaseUserId = getSupabaseUserId(req.user.id);

    console.log('🔧 Updating email status:', { emailId, status, openedAt, repliedAt, notes });

    let email = null;
    let updatedEmail = null;

    // Check if this is a mock email
    if (emailId.startsWith('email-') || emailId.startsWith('mock-')) {
      email = mockEmailsStore.get(emailId);
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Mock email not found'
        });
      }

      // Update mock email
      const updateData = { ...email };
      if (status) updateData.status = status;
      if (openedAt) updateData.openedAt = openedAt;
      if (repliedAt) updateData.repliedAt = repliedAt;
      if (notes) updateData.notes = notes;
      updateData.updatedAt = new Date().toISOString();

      mockEmailsStore.set(emailId, updateData);
      updatedEmail = updateData;
      console.log('✅ Mock email status updated:', updateData);
    } else {
      // Update real email in Supabase
      if (!isSupabaseAvailable()) {
        return res.status(503).json({
          success: false,
          message: 'Database temporarily unavailable'
        });
      }

      const dbClient = getDbClient(supabaseUserId);
      if (!dbClient) {
        return res.status(503).json({
          success: false,
          message: 'Database client not available'
        });
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (openedAt) updateData.opened_at = openedAt;
      if (repliedAt) updateData.replied_at = repliedAt;
      if (notes) updateData.notes = notes;
      updateData.updated_at = new Date().toISOString();

      const { data: supabaseUpdatedEmail, error } = await dbClient
        .from('outreach_emails')
        .update(updateData)
        .eq('id', emailId)
        .select()
        .single();

      if (error) {
        console.error('Error updating email status in Supabase:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update email status: ' + error.message
        });
      }

      updatedEmail = supabaseUpdatedEmail;
      console.log('✅ Supabase email status updated:', updatedEmail);
    }

    res.json({
      success: true,
      message: 'Email status updated successfully',
      data: updatedEmail
    });

  } catch (error) {
    console.error('Update email status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating email status'
    });
  }
});

// @route   POST /api/outreach/emails/:id/simulate-reply
// @desc    Simulate a creator reply for demo purposes
// @access  Private
router.post('/emails/:id/simulate-reply', authenticateToken, async (req, res) => {
  try {
    const emailId = req.params.id;
    const { replyContent } = req.body;

    // Check if this is a mock email
    let email = null;
    if (emailId.startsWith('email-') || emailId.startsWith('mock-')) {
      email = mockEmailsStore.get(emailId);
    } else if (isSupabaseAvailable()) {
      const supabaseUserId = getSupabaseUserId(req.user.id);
      const dbClient = getDbClient(supabaseUserId);
      const { data: supabaseEmail } = await dbClient
        .from('outreach_emails')
        .select('*')
        .eq('id', emailId)
        .single();
      email = supabaseEmail;
    }

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Get creator data
    const creator = await findCreatorById(email.creator_id, req.user.id);
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    // Use provided reply content or generate a realistic one
    const defaultReplyContent = replyContent || `Hi there!

Thanks for reaching out about the collaboration opportunity. This sounds interesting!

I'm definitely interested in learning more. Could you share more details about:
- The specific deliverables you're looking for
- Timeline expectations  
- Compensation structure

Looking forward to hearing from you!

Best,
${creator.channelName || creator.channel_name}`;

    // Update email status to replied
    const updateData = {
      status: 'replied',
      replied_at: new Date().toISOString(),
      reply_content: defaultReplyContent
    };

    let updatedEmail = null;

    // Update in appropriate storage
    if (emailId.startsWith('email-') || emailId.startsWith('mock-')) {
      updatedEmail = { ...email, ...updateData };
      mockEmailsStore.set(emailId, updatedEmail);
    } else if (isSupabaseAvailable()) {
      const supabaseUserId = getSupabaseUserId(req.user.id);
      const dbClient = getDbClient(supabaseUserId);
      const { data: supabaseUpdatedEmail } = await dbClient
        .from('outreach_emails')
        .update(updateData)
        .eq('id', emailId)
        .select()
        .single();
      updatedEmail = supabaseUpdatedEmail;
    }

    res.json({
      success: true,
      message: 'Creator reply simulated successfully',
      data: {
        email: updatedEmail,
        replyContent: defaultReplyContent,
        creator: {
          name: creator.channelName || creator.channel_name,
          email: creator.contactEmail
        }
      }
    });

  } catch (error) {
    console.error('Simulate reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error simulating reply'
    });
  }
});

// @route   GET /api/outreach/campaigns
// @desc    Get campaigns from both Supabase and local data
// @access  Private
router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const supabaseUserId = getSupabaseUserId(req.user.id);
    let allCampaigns = [];

    // Try to get campaigns from Supabase first
    if (isSupabaseAvailable()) {
      try {
        const dbClient = getDbClient(supabaseUserId);
        const { data: supabaseCampaigns, error } = await dbClient
          .from('campaigns')
          .select('*')
          .eq('user_id', supabaseUserId)
          .order('created_at', { ascending: false });

        if (!error && supabaseCampaigns) {
          allCampaigns = [...supabaseCampaigns];
          console.log(`✅ Loaded ${supabaseCampaigns.length} campaigns from Supabase`);
        }
  } catch (error) {
        console.log('⚠️ Supabase campaigns fetch failed:', error.message);
      }
    }

    // Add local campaigns as fallback or additional options
    if (localCampaigns.length > 0) {
      // Filter out duplicates (by ID) and add local campaigns
      const existingIds = new Set(allCampaigns.map(c => c.id));
      const newLocalCampaigns = localCampaigns.filter(c => !existingIds.has(c.id));
      
      allCampaigns = [...allCampaigns, ...newLocalCampaigns];
      console.log(`✅ Added ${newLocalCampaigns.length} campaigns from local JSON`);
    }
    
    res.json({
      success: true,
      data: { 
        campaigns: allCampaigns,
        sources: {
          supabase: allCampaigns.filter(c => c.id.includes('-') && c.id.length > 30).length,
          local: allCampaigns.filter(c => !c.id.includes('-') || c.id.length <= 30).length
        }
      }
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    
    // Final fallback to local data only
    res.json({
      success: true,
      data: { 
        campaigns: localCampaigns,
        sources: { supabase: 0, local: localCampaigns.length }
      },
      message: 'Using local campaigns only due to error'
    });
  }
});

// @route   GET /api/outreach/analytics
// @desc    Get detailed analytics for outreach campaigns
// @access  Private
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseAvailable()) {
      return res.json({
      success: true,
        data: {
          overview: {
            totalEmails: 0,
            sentEmails: 0,
            openedEmails: 0,
            repliedEmails: 0,
            failedEmails: 0,
            openRate: 0,
            replyRate: 0,
            deliveryRate: 0
          },
          campaignPerformance: [],
          timeline: []
        }
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.json({
      success: true,
        data: {
          overview: { totalEmails: 0, sentEmails: 0, openedEmails: 0, repliedEmails: 0, failedEmails: 0, openRate: 0, replyRate: 0, deliveryRate: 0 },
          campaignPerformance: [],
          timeline: []
        }
      });
    }

    const { data: emails, error } = await dbClient
      .from('outreach_emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching analytics emails: ' + error.message);
    }

    // Merge with mock emails
    const allEmails = [...(emails || [])];
    for (const [emailId, mockEmail] of mockEmailsStore.entries()) {
      const { _creator, _campaign, ...publicEmail } = mockEmail;
      allEmails.push(publicEmail);
    }

    // Calculate analytics
    const totalEmails = allEmails.length;
    const sentEmails = allEmails.filter(e => ['sent', 'opened', 'replied'].includes(e.status));
    const openedEmails = allEmails.filter(e => ['opened', 'replied'].includes(e.status));
    const repliedEmails = allEmails.filter(e => e.status === 'replied');
    const failedEmails = allEmails.filter(e => e.status === 'failed');

    const analytics = {
      overview: {
        totalEmails,
        sentEmails: sentEmails.length,
        openedEmails: openedEmails.length,
        repliedEmails: repliedEmails.length,
        failedEmails: failedEmails.length,
        openRate: sentEmails.length > 0 ? (openedEmails.length / sentEmails.length * 100).toFixed(2) : 0,
        replyRate: sentEmails.length > 0 ? (repliedEmails.length / sentEmails.length * 100).toFixed(2) : 0,
        deliveryRate: totalEmails > 0 ? ((totalEmails - failedEmails.length) / totalEmails * 100).toFixed(2) : 0
      },
      campaignPerformance: [], // Can be extended later
      timeline: [] // Can be extended later
    };

      res.json({
        success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

module.exports = router; 