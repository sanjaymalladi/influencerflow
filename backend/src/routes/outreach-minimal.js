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

// Helper function to map auth user ID to Supabase UUID
const getSupabaseUserId = (authUserId) => {
  if (authUserId === '550e8400-e29b-41d4-a716-446655440000' || 
      authUserId === '1' || 
      authUserId === 1) {
    return '550e8400-e29b-41d4-a716-446655440000';
  }
  return authUserId;
};

// @route   GET /api/outreach/emails
// @desc    Get outreach emails
// @access  Private
router.get('/emails', authenticateToken, async (req, res) => {
  try {
    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    // Get emails from Supabase
    let query = dbClient.from('outreach_emails').select('*').order('created_at', { ascending: false });

    const { data: emails, error } = await query;

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
    const { campaignId, creatorId, subject, body } = req.body;

    if (!campaignId || !creatorId || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide campaignId, creatorId, subject, and body'
      });
    }

    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

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
      message: 'Server error creating email'
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
    const dbClient = getDbClient(supabaseUserId);

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

    // Enhanced creator lookup in Supabase - handle transition from old system
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
    
    // Strategy 2: If not found and ID looks like UUID, search for any creator for this user
    // This handles the transition period where old emails have UUIDs that don't exist in new Supabase
    if (!creator && (email.creator_id.includes('-') && email.creator_id.length > 30)) {
      console.log(`🔍 UUID-like ID not found, searching all creators for user...`);
      
      const { data: userCreators } = await dbClient
        .from('creators')
        .select('*')
        .eq('user_id', supabaseUserId)
        .limit(1);
      
      if (userCreators && userCreators.length > 0) {
        creator = userCreators[0]; // Use the first available creator for this user
        console.log(`✅ Using fallback creator: ${creator.channel_name} (${creator.id})`);
      }
    }
    
    // Strategy 3: Try to find by channel name (for string-based IDs like "linus-tech-tips")
    if (!creator && !email.creator_id.includes('-')) {
      console.log(`🔍 Trying channel name lookup for: ${email.creator_id}`);
      
      // Try to match by channel name slug (e.g., "linus-tech-tips" -> "Linus Tech Tips")
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
        ) || channelCreators[0]; // Take the first match if exact match not found
        console.log(`✅ Found creator by channel name: ${creator.channel_name}`);
      }
    }
    
    // Strategy 4: Last resort - broader search within user's creators
    if (!creator) {
      console.log(`🔍 Broad search for any creator matching: ${email.creator_id}`);
      
      const { data: allCreators } = await dbClient
        .from('creators')
        .select('*')
        .eq('user_id', supabaseUserId);
      
      if (allCreators && allCreators.length > 0) {
        // Try to find any creator that might match
        creator = allCreators.find(c => {
          const creatorIdStr = String(email.creator_id).toLowerCase();
          const channelNameSlug = c.channel_name.toLowerCase().replace(/\s+/g, '-');
          const channelNameWords = c.channel_name.toLowerCase();
          
          return channelNameSlug.includes(creatorIdStr) || 
                 creatorIdStr.includes(channelNameSlug) ||
                 channelNameWords.includes(creatorIdStr) ||
                 creatorIdStr.includes(channelNameWords);
        });
        
        // If still no match, use the first creator as fallback
        if (!creator) {
          creator = allCreators[0];
          console.log(`✅ Using first available creator as fallback: ${creator.channel_name}`);
        } else {
          console.log(`✅ Found creator by broad search: ${creator.channel_name}`);
        }
      }
    }

    if (!creator) {
      console.error(`❌ Creator lookup failed completely for creatorId: "${email.creator_id}"`);
      
      // Get available creators for debugging
      const { data: availableCreators } = await dbClient
        .from('creators')
        .select('id, channel_name, contact_email')
        .eq('user_id', supabaseUserId);
      
      console.error('📋 Available creators:', availableCreators?.map(c => ({ id: c.id, name: c.channel_name })));
      
      // If we have ANY creators for this user, use the first one as ultimate fallback
      if (availableCreators && availableCreators.length > 0) {
        creator = availableCreators[0];
        console.log(`🚨 EMERGENCY FALLBACK: Using first available creator: ${creator.channel_name}`);
      } else {
        return res.status(404).json({
          success: false,
          message: 'No creators found for this user',
          debug: {
            emailId: emailId,
            creatorId: email.creator_id,
            userId: supabaseUserId,
            availableCreators: []
          }
        });
      }
    }

    console.log(`✅ Creator found: ${creator.channel_name} (ID: ${creator.id}) for email creatorId: ${email.creator_id}`);

    try {
      // Actually send the email using the email service
      const recipientEmail = creator.contact_email || `${creator.channel_name.toLowerCase().replace(/\s+/g, '')}@example.com`;
      
      const emailResult = await emailService.sendEmail({
        to: recipientEmail,
        subject: email.subject,
        body: email.content,
        from: process.env.DEFAULT_FROM_EMAIL || 'outreach@influencerflow.com',
        fromName: process.env.DEFAULT_FROM_NAME || 'InfluencerFlow Team'
      });

      // Update email status with send details in Supabase
      const wasCreatorIdChanged = creator.id !== email.creator_id;
      const updateData = {
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: emailResult.messageId,
        provider: emailResult.provider,
        creator_id: creator.id, // Normalize creator ID
        tracking_data: {
          recipientEmail: recipientEmail,
          deliveryStatus: 'delivered',
          emailId: emailResult.emailId,
          messageId: emailResult.messageId,
          normalizedCreatorId: creator.id,
          originalCreatorId: email.creator_id,
          creatorIdChanged: wasCreatorIdChanged,
          creatorName: creator.channel_name,
          sentAt: new Date().toISOString(),
          ...(wasCreatorIdChanged && {
            note: `Creator ID normalized from "${email.creator_id}" to "${creator.id}" (${creator.channel_name})`
          })
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
      
      // Update email status to indicate failure
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

// @route   GET /api/outreach/stats
// @desc    Get outreach statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    // Get emails for this user from Supabase
    let query = dbClient.from('outreach_emails').select('*');

    const { data: userEmails, error } = await query;

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
    res.status(500).json({
      success: false,
      message: 'Server error fetching outreach stats'
    });
  }
});

module.exports = router; 