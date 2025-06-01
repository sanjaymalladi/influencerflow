const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper function to get the appropriate database client
const getDbClient = (userId) => {
  const isDemoUser = userId === '550e8400-e29b-41d4-a716-446655440000' || userId === '1';
  return isDemoUser && supabaseAdmin ? supabaseAdmin : supabase;
};

// Helper function to check if Supabase is available
const isSupabaseAvailable = () => {
  return supabase !== null || supabaseAdmin !== null;
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

    res.json({
      success: true,
      data: { emails: emails || [] }
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
    // If Supabase is not available, create a mock email for demo purposes
    if (!isSupabaseAvailable()) {
      console.log('⚠️ Supabase not available, creating mock email...');
      const { campaignId, creatorId, subject, body } = req.body;

      if (!campaignId || !creatorId || !subject || !body) {
        return res.status(400).json({
          success: false,
          message: 'Please provide campaignId, creatorId, subject, and body'
        });
      }

      // Return a mock email response
      const mockEmail = {
        id: 'mock-' + Date.now(),
        campaign_id: campaignId,
        creator_id: creatorId,
        subject,
        content: body,
        status: 'draft',
        created_at: new Date().toISOString()
      };

      return res.status(201).json({
        success: true,
        message: 'Mock email created successfully (Supabase unavailable)',
        data: mockEmail
      });
    }

    const { campaignId, creatorId, subject, body } = req.body;

    if (!campaignId || !creatorId || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide campaignId, creatorId, subject, and body'
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.status(503).json({
        success: false,
        message: 'Database client not available'
      });
    }

    const emailData = {
      campaign_id: campaignId,
      creator_id: creatorId,
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

    if (error) {
      throw new Error('Error creating email: ' + error.message);
    }

    res.status(201).json({
      success: true,
      message: 'Email created successfully',
      data: newEmail
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
    // Handle mock emails when Supabase is not available
    if (!isSupabaseAvailable()) {
      const emailId = req.params.id;
      
      if (emailId.startsWith('mock-')) {
        console.log('⚠️ Supabase not available, simulating email send for mock email...');
        
        const mockSentEmail = {
          id: emailId,
          status: 'sent',
          sent_at: new Date().toISOString(),
          message: 'Mock email sent successfully (Supabase unavailable)'
        };

        return res.json({
          success: true,
          message: 'Mock email sent successfully',
          data: mockSentEmail
        });
      }
      
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const emailId = req.params.id;
    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.status(503).json({
        success: false,
        message: 'Database client not available'
      });
    }

    // Get email from Supabase
    const { data: email, error: emailError } = await dbClient
      .from('outreach_emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    console.log(`📧 Found email: ${email.subject} for campaign ${email.campaign_id}`);

    // Enhanced creator lookup in Supabase
    let creator = null;
    
    console.log(`🔍 Looking for creator with ID: "${email.creator_id}"`);
    
    // Strategy 1: Direct ID lookup (UUID format)
    const { data: directCreator, error: directError } = await dbClient
      .from('creators')
      .select('*')
      .eq('id', email.creator_id)
      .single();
    
    if (!directError && directCreator) {
      creator = directCreator;
      console.log(`✅ Found creator by direct ID lookup: ${creator.channel_name}`);
    }
    
    // Strategy 2: Fallback for UUID-like IDs that don't exist
    if (!creator && (email.creator_id.includes('-') && email.creator_id.length > 30)) {
      console.log(`🔍 UUID-like ID not found, searching all creators for user...`);
      
      const { data: userCreators } = await dbClient
        .from('creators')
        .select('*')
        .eq('user_id', supabaseUserId)
        .limit(1);
      
      if (userCreators && userCreators.length > 0) {
        creator = userCreators[0];
        console.log(`✅ Using fallback creator: ${creator.channel_name} (${creator.id})`);
      }
    }
    
    // Strategy 3: Channel name lookup for string-based IDs
    if (!creator && !email.creator_id.includes('-')) {
      console.log(`🔍 Trying channel name lookup for: ${email.creator_id}`);
      
      const channelNameFromId = email.creator_id
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const { data: channelCreators } = await dbClient
        .from('creators')
        .select('*')
        .eq('user_id', supabaseUserId)
        .or(`channel_name.ilike.%${channelNameFromId}%,channel_name.ilike.%${email.creator_id}%`);
      
      if (channelCreators && channelCreators.length > 0) {
        creator = channelCreators.find(c => 
          c.channel_name.toLowerCase() === channelNameFromId.toLowerCase() ||
          c.channel_name.toLowerCase().replace(/\s+/g, '-') === email.creator_id.toLowerCase()
        ) || channelCreators[0];
        console.log(`✅ Found creator by channel name: ${creator.channel_name}`);
      }
    }
    
    // Strategy 4: Emergency fallback
    if (!creator) {
      console.log(`🔍 Emergency search for any creator...`);
      
      const { data: allCreators } = await dbClient
        .from('creators')
        .select('*')
        .eq('user_id', supabaseUserId);
      
      if (allCreators && allCreators.length > 0) {
        creator = allCreators[0];
        console.log(`🚨 EMERGENCY FALLBACK: Using first available creator: ${creator.channel_name}`);
      } else {
        return res.status(404).json({
          success: false,
          message: 'No creators found for this user'
        });
      }
    }

    console.log(`✅ Creator found: ${creator.channel_name} (ID: ${creator.id})`);

    try {
      // Send the email
      const recipientEmail = creator.contact_email || `${creator.channel_name.toLowerCase().replace(/\s+/g, '')}@example.com`;
      
      const emailResult = await emailService.sendEmail({
        to: recipientEmail,
        subject: email.subject,
        body: email.content,
        from: process.env.DEFAULT_FROM_EMAIL || 'outreach@influencerflow.com',
        fromName: process.env.DEFAULT_FROM_NAME || 'InfluencerFlow Team'
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
          creatorName: creator.channel_name,
          sentAt: new Date().toISOString()
        }
      };

      const { data: updatedEmail, error: updateError } = await dbClient
        .from('outreach_emails')
        .update(updateData)
        .eq('id', emailId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating email status:', updateError);
      }

      res.json({
        success: true,
        message: 'Email sent successfully',
        data: updatedEmail || { ...email, ...updateData }
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

      const { data: updatedEmail } = await dbClient
        .from('outreach_emails')
        .update(updateData)
        .eq('id', emailId)
        .select()
        .single();

      res.status(500).json({
        success: false,
        message: `Failed to send email: ${emailError.message}`,
        data: updatedEmail || { ...email, ...updateData }
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

// @route   GET /api/outreach/campaigns
// @desc    Get campaigns from Supabase
// @access  Private
router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    if (!isSupabaseAvailable()) {
      return res.json({
        success: true,
        data: { campaigns: [] },
        message: 'Database temporarily unavailable'
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    if (!dbClient) {
      return res.json({
        success: true,
        data: { campaigns: [] },
        message: 'Database client not available'
      });
    }

    const { data: campaigns, error } = await dbClient
      .from('campaigns')
      .select('*')
      .eq('user_id', supabaseUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching campaigns: ' + error.message);
    }

    res.json({
      success: true,
      data: { campaigns: campaigns || [] }
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching campaigns'
    });
  }
});

module.exports = router; 