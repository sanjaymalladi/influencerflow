const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const emailService = require('../services/emailService');

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

// Helper function to get the appropriate database client
const getDbClient = (userId) => {
  const isDemoUser = userId === '550e8400-e29b-41d4-a716-446655440000' || userId === '1';
  return isDemoUser && supabaseAdmin ? supabaseAdmin : supabase;
};

// Helper function to check if Supabase is available
const isSupabaseAvailable = () => {
  return supabase !== null || supabaseAdmin !== null;
};

// Helper function to find creator by ID from both sources
const findCreatorById = async (creatorId, userId) => {
  console.log(`🔍 Finding creator with ID: "${creatorId}"`);
  
  // First try Supabase if available and ID looks like UUID
  if (isSupabaseAvailable() && (creatorId.includes('-') && creatorId.length > 30)) {
    try {
      const dbClient = getDbClient(userId);
      const { data: creator, error } = await dbClient
        .from('creators')
        .select('*')
        .eq('id', creatorId)
        .single();
      
      if (!error && creator) {
        console.log(`✅ Found creator in Supabase: ${creator.channel_name || creator.channelName}`);
        return creator;
      }
    } catch (error) {
      console.log('⚠️ Supabase creator lookup failed:', error.message);
    }
  }
  
  // Fallback to local JSON data
  if (localCreators.length > 0) {
    // Try direct ID match first
    let creator = localCreators.find(c => c.id === creatorId);
    
    if (!creator) {
      // Try channel name based search for string IDs
      const searchName = creatorId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      creator = localCreators.find(c => {
        const creatorName = c.channel_name || c.channelName || '';
        return creatorName.toLowerCase() === searchName.toLowerCase() ||
               creatorName.toLowerCase().replace(/\s+/g, '-') === creatorId.toLowerCase();
      });
    }
    
    if (creator) {
      console.log(`✅ Found creator in local JSON: ${creator.channel_name || creator.channelName}`);
      return creator;
    }
  }
  
  // Final fallback - return first available creator
  if (localCreators.length > 0) {
    console.log(`🚨 Using fallback creator: ${localCreators[0].channel_name || localCreators[0].channelName}`);
    return localCreators[0];
  }
  
  return null;
};

// Helper function to find campaign by ID from both sources
const findCampaignById = async (campaignId, userId) => {
  console.log(`🔍 Finding campaign with ID: "${campaignId}"`);
  
  // First try Supabase if available and ID looks like UUID
  if (isSupabaseAvailable() && (campaignId.includes('-') && campaignId.length > 30)) {
    try {
      const dbClient = getDbClient(userId);
      const { data: campaign, error } = await dbClient
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (!error && campaign) {
        console.log(`✅ Found campaign in Supabase: ${campaign.name}`);
        return campaign;
      }
    } catch (error) {
      console.log('⚠️ Supabase campaign lookup failed:', error.message);
    }
  }
  
  // Fallback to local JSON data
  if (localCampaigns.length > 0) {
    let campaign = localCampaigns.find(c => c.id === campaignId);
    
    if (campaign) {
      console.log(`✅ Found campaign in local JSON: ${campaign.name}`);
      return campaign;
    }
    
    // Return first campaign as fallback
    if (localCampaigns.length > 0) {
      console.log(`🚨 Using fallback campaign: ${localCampaigns[0].name}`);
      return localCampaigns[0];
    }
  }
  
  return null;
};

// Helper function to map auth user ID to Supabase UUID
const getSupabaseUserId = (authUserId) => {
  if (authUserId === '550e8400-e29b-41d4-a716-446655440000' || 
      authUserId === '1' || 
      authUserId === 1) {
    return '550e8400-e29b-41d4-a716-446655440000';
  }
  return authUserId;
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
// @desc    Send outreach email
// @access  Private (Brand/Agency only)
router.put('/emails/:id/send', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
    try {
    const emailId = req.params.id;
    const supabaseUserId = getSupabaseUserId(req.user.id);
    
    console.log(`📧 Attempting to send email with ID: ${emailId}`);
    
    let email = null;
    
    // Check if this is a mock email (created with local data)
    if (emailId.startsWith('email-') || emailId.startsWith('mock-')) {
      console.log('📧 Detected mock email, retrieving from memory...');
      
      // Retrieve the stored mock email
      email = mockEmailsStore.get(emailId);
      
      if (!email) {
        console.log(`❌ Mock email ${emailId} not found in memory store`);
        console.log(`📧 Available mock emails: ${Array.from(mockEmailsStore.keys()).join(', ')}`);
        return res.status(404).json({
          success: false,
          message: 'Mock email not found in memory. Please recreate the email.'
        });
      }
      
      console.log(`📧 RETRIEVED EMAIL DEBUG - ID: ${emailId}`);
      console.log(`📧 RETRIEVED EMAIL DEBUG - Subject: "${email.subject}"`);
      console.log(`📧 RETRIEVED EMAIL DEBUG - Content: "${email.content?.substring(0, 100)}..."`);
      console.log(`📧 RETRIEVED EMAIL DEBUG - Creator: ${email.creator_name} (${email.creator_id})`);
      console.log(`📧 RETRIEVED EMAIL DEBUG - Stored creator: ${email._creator?.channelName || email._creator?.channel_name}`);
    } else {
      // Try to get real email from Supabase
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

      // Get email from Supabase
      const { data: supabaseEmail, error: emailError } = await dbClient
        .from('outreach_emails')
        .select('*')
        .eq('id', emailId)
        .single();

      if (emailError || !supabaseEmail) {
        return res.status(404).json({
          success: false,
          message: 'Email not found in database'
        });
      }
      
      email = supabaseEmail;
    }

    console.log(`📧 Found email: ${email.subject} for campaign ${email.campaign_id}`);

    // For mock emails, use the stored creator data; for real emails, lookup from database
    let creator;
    if (emailId.startsWith('email-') || emailId.startsWith('mock-')) {
      creator = email._creator;
      console.log(`✅ Using stored creator data: ${creator.channelName || creator.channel_name} (ID: ${creator.id})`);
    } else {
      // Use the enhanced creator lookup function for real emails
      creator = await findCreatorById(email.creator_id, supabaseUserId);
      
      if (!creator) {
        return res.status(404).json({
          success: false,
          message: 'Creator not found for this email'
        });
      }
      
      console.log(`✅ Creator found: ${creator.channelName || creator.channel_name} (ID: ${creator.id})`);
    }

    try {
      // Extract email from creator data with multiple fallback strategies
      let recipientEmail = null;
      
      // Strategy 1: Direct contactEmail field
      if (creator.contactEmail) {
        recipientEmail = creator.contactEmail;
        console.log(`📧 Using contactEmail: ${recipientEmail}`);
      }
      // Strategy 2: Extract from bio (business emails or general emails)
      else if (creator.bio) {
        // Look for business emails first
        let emailMatch = creator.bio.match(/business@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (!emailMatch) {
          // Look for any email in bio
          emailMatch = creator.bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        }
        if (emailMatch) {
          recipientEmail = emailMatch[0];
          console.log(`📧 Extracted from bio: ${recipientEmail}`);
        }
      }
      
      // Strategy 3: Generate from channel name
      if (!recipientEmail) {
        const channelName = creator.channelName || creator.channel_name || 'creator';
        recipientEmail = `${channelName.toLowerCase().replace(/\s+/g, '')}@example.com`;
        console.log(`📧 Generated email: ${recipientEmail}`);
      }
      
      console.log(`📧 FINAL DEBUG - Creator: ${creator.channelName || creator.channel_name} (ID: ${creator.id})`);
      console.log(`📧 FINAL DEBUG - Email will be sent to: ${recipientEmail}`);
      console.log(`📧 FINAL DEBUG - Subject: ${email.subject}`);
      console.log(`📧 FINAL DEBUG - Content length: ${email.content?.length || 0} characters`);
      
      // Add tracking footer to email content
      const emailContentWithFooter = `${email.content}

---
This email was sent via InfluencerFlow
Reference ID: ${emailId.toUpperCase()}`;

      const emailResult = await emailService.sendEmail({
        to: recipientEmail,
        subject: email.subject,
        body: emailContentWithFooter,
        from: process.env.DEFAULT_FROM_EMAIL || 'outreach@influencerflow.com',
        fromName: process.env.DEFAULT_FROM_NAME || 'InfluencerFlow Team',
        // Add reference ID for tracking
        customEmailId: emailId
      });

            // Update email status
      const updateData = {
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: emailResult.messageId,
        provider: emailResult.provider,
        creator_id: creator.id,
        tracking_data: {
          recipientEmail: recipientEmail,
          deliveryStatus: 'delivered',
          emailId: emailResult.emailId,
          messageId: emailResult.messageId,
          creatorName: creator.channelName || creator.channel_name,
          sentAt: new Date().toISOString()
        }
      };

      let updatedEmail = null;
      
      // Only update in Supabase if it's a real email (not mock)
      if (!emailId.startsWith('email-') && !emailId.startsWith('mock-') && isSupabaseAvailable()) {
        const { data: supabaseUpdatedEmail, error: updateError } = await dbClient
          .from('outreach_emails')
          .update(updateData)
          .eq('id', emailId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating email status in Supabase:', updateError);
        } else {
          updatedEmail = supabaseUpdatedEmail;
        }
      }
      
      // For mock emails, update the memory store and return merged data
      if (!updatedEmail) {
        updatedEmail = { ...email, ...updateData };
        
        // Update the mock email in memory store
        if (emailId.startsWith('email-') || emailId.startsWith('mock-')) {
          mockEmailsStore.set(emailId, updatedEmail);
          console.log(`📧 Updated mock email in memory store: ${emailId}`);
        }
      }
    
      console.log(`✅ Email sent successfully to ${recipientEmail}`);
    
      res.json({
        success: true,
        message: 'Email sent successfully',
        data: updatedEmail
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      const updateData = {
        status: 'failed',
        sent_at: new Date().toISOString(),
        bounce_reason: emailError.message,
        tracking_data: {
          deliveryStatus: 'failed',
          errorMessage: emailError.message,
          failedAt: new Date().toISOString()
        }
      };

      let updatedEmail = null;
      
      // Only update in Supabase if it's a real email (not mock)
      if (!emailId.startsWith('email-') && !emailId.startsWith('mock-') && isSupabaseAvailable()) {
        const { data: supabaseUpdatedEmail } = await dbClient
          .from('outreach_emails')
          .update(updateData)
          .eq('id', emailId)
          .select()
          .single();
        
        updatedEmail = supabaseUpdatedEmail;
      }
      
      // For mock emails, just return the merged data
      if (!updatedEmail) {
        updatedEmail = { ...email, ...updateData };
      }

      res.status(500).json({
        success: false,
        message: `Failed to send email: ${emailError.message}`,
        data: updatedEmail
      });
    }

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending email'
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