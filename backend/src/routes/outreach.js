const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const emailService = require('../services/emailService');
const replyDetectionService = require('../services/replyDetectionService');

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

// Initialize default outreach campaigns if none exist
const initializeDefaultOutreachCampaigns = () => {
  const existingCampaigns = outreachCampaignsData.getAll();
  if (existingCampaigns.length === 0) {
    const defaultCampaign = {
      name: 'Tech Reviewer Outreach Q1',
      subject: 'Partnership Opportunity - Tech Product Launch',
      message: `Hi {{creatorName}},

I hope this email finds you well! My name is {{senderName}} from {{companyName}}.

We'd love to discuss a potential partnership for our upcoming product launch.

Best regards,
{{senderName}}`,
      status: 'active',
      createdBy: '1',
      targetCreators: ['1', '2'],
      sentCount: 2,
      repliedCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    outreachCampaignsData.add(defaultCampaign);
  }
};

// Initialize default outreach emails if none exist
const initializeDefaultEmails = () => {
  const existingEmails = outreachEmailsData.getAll();
  if (existingEmails.length === 0) {
    const defaultEmails = [
      {
        campaignId: 'demo-campaign-1',
        creatorId: 'linus-tech-tips',
        subject: 'Partnership Opportunity - Tech Product Launch',
        body: `Hi Linus,

I hope this email finds you well! I've been following your incredible tech reviews and I'm really impressed by your thorough analysis and genuine perspective on technology products.

I'm reaching out about an exciting collaboration opportunity with our Tech Product Launch Q1 2024 campaign.

Campaign Details:
- Launch campaign for our new smartphone featuring top tech reviewers
- Budget: $50,000
- Goals: Brand Awareness, Product Reviews, Social Media Buzz
- Deliverables: 5x Video Review ($5,000 each), 10x Social Media Posts ($1,000 each), 3x Unboxing Video ($3,000 each)

We believe your unique voice and engaged audience would be perfect for this campaign, and we're offering competitive compensation.

Would you be interested in learning more about this partnership opportunity?

Best regards,
Campaign Manager`,
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: '1'
      },
      {
        campaignId: 'demo-campaign-1',
        creatorId: 'marques-brownlee',
        subject: 'Exclusive Tech Review Partnership',
        body: `Hi Marques,

I hope you're doing well! I've been following your content for years and your reviews have genuinely influenced my tech purchasing decisions.

I'm excited to reach out about a collaboration opportunity with our Tech Product Launch Q1 2024 campaign.

Campaign Details:
- Launch campaign for our new smartphone featuring top tech reviewers
- Budget: $50,000
- Goals: Brand Awareness, Product Reviews, Social Media Buzz
- Deliverables: 5x Video Review ($5,000 each), 10x Social Media Posts ($1,000 each), 3x Unboxing Video ($3,000 each)

Given your expertise in smartphone reviews and your incredible production quality, we think this would be a perfect fit.

Would you be interested in discussing this further?

Best regards,
Campaign Manager`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: '1'
      }
    ];

    defaultEmails.forEach(email => outreachEmailsData.add(email));
  }
};

// Initialize default data
initializeDefaultEmails();
initializeDefaultOutreachCampaigns();

// Email templates are now handled by persistent storage in dataStorage.js

// @route   GET /api/outreach/stats
// @desc    Get outreach statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    // Get emails for this user from Supabase
    // TODO: Filter by campaigns that belong to the user
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

// @route   GET /api/outreach/emails
// @desc    Get outreach emails
// @access  Private
router.get('/emails', authenticateToken, async (req, res) => {
  try {
    const supabaseUserId = getSupabaseUserId(req.user.id);
    const dbClient = getDbClient(supabaseUserId);

    // For now, get all emails since we don't have user_id in outreach_emails table
    // TODO: Filter by campaigns that belong to the user
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

    // TODO: Check if user owns the email through campaign ownership
    // For now, allow all users to send emails
    console.log(`📧 Found email: ${email.subject} for campaign ${email.campaign_id}`);

    // Enhanced creator lookup in Supabase - try multiple strategies
    let creator = null;
    
    console.log(`🔍 Looking for creator with ID: "${email.creator_id}"`);
    
    // Strategy 1: Direct ID lookup (numeric or UUID)
    const { data: directCreator } = await dbClient
      .from('creators')
      .select('*')
      .eq('id', email.creator_id)
      .single();
    
    creator = directCreator;
    
    // Strategy 2: If not found, try to find by channel name (for string-based IDs)
    if (!creator) {
      console.log(`🔍 Direct ID lookup failed, trying channel name lookup...`);
      
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
      }
    }
    
    // Strategy 3: If still not found, try broader search
    if (!creator) {
      console.log(`🔍 Channel name lookup failed, trying broader search...`);
      
      const { data: allCreators } = await dbClient
        .from('creators')
        .select('*')
        .eq('user_id', supabaseUserId);
      
      if (allCreators && allCreators.length > 0) {
        creator = allCreators.find(c => {
          const creatorIdStr = String(email.creator_id).toLowerCase();
          const channelNameSlug = c.channel_name.toLowerCase().replace(/\s+/g, '-');
          const channelNameWords = c.channel_name.toLowerCase();
          
          return channelNameSlug.includes(creatorIdStr) || 
                 creatorIdStr.includes(channelNameSlug) ||
                 channelNameWords.includes(creatorIdStr) ||
                 creatorIdStr.includes(channelNameWords);
        });
      }
    }

    if (!creator) {
      console.error(`❌ Creator lookup failed for creatorId: "${email.creator_id}"`);
      
      // Get available creators for debugging
      const { data: availableCreators } = await dbClient
        .from('creators')
        .select('id, channel_name, contact_email')
        .eq('user_id', supabaseUserId);
      
      console.error('📋 Available creators:', availableCreators?.map(c => ({ id: c.id, name: c.channel_name })));
      
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
        debug: {
          emailId: emailId,
          creatorId: email.creator_id,
          availableCreators: availableCreators?.map(c => ({ id: c.id, name: c.channel_name })) || []
        }
      });
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

// @route   GET /api/outreach/templates
// @desc    Get email templates
// @access  Private
router.get('/templates', authenticateToken, (req, res) => {
  try {
    const templates = emailTemplatesData.getAll();
    
    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching templates'
    });
  }
});

// @route   POST /api/outreach/templates
// @desc    Create new email template
// @access  Private (Brand/Agency only)
router.post('/templates', authenticateToken, authorizeRole('brand', 'agency', 'admin'), (req, res) => {
  try {
    const { name, subject, body } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, subject, and body'
      });
    }

    const templateData = {
      name,
      subject,
      body,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    const newTemplate = emailTemplatesData.add(templateData);

    res.status(201).json({
      success: true,
      message: 'Email template created successfully',
      data: newTemplate
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating template'
    });
  }
});

// @route   PUT /api/outreach/templates/:id
// @desc    Update email template
// @access  Private (Template owner only)
router.put('/templates/:id', authenticateToken, (req, res) => {
  try {
    const template = emailTemplatesData.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions (only template creator or admin can edit)
    if (template.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to edit this template'
      });
    }

    const { name, subject, body } = req.body;
    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (body !== undefined) updates.body = body;

    const updatedTemplate = emailTemplatesData.update(req.params.id, updates);

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });

  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating template'
    });
  }
});

// @route   DELETE /api/outreach/templates/:id
// @desc    Delete email template
// @access  Private (Template owner only)
router.delete('/templates/:id', authenticateToken, (req, res) => {
  try {
    const template = emailTemplatesData.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions (only template creator or admin can delete)
    if (template.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this template'
      });
    }

    emailTemplatesData.delete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting template'
    });
  }
});

// @route   GET /api/outreach/emails/:id
// @desc    Get specific email details with CRM data
// @access  Private
router.get('/emails/:id', authenticateToken, (req, res) => {
  try {
    const email = outreachEmailsData.findById(req.params.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Check permissions
    if (email.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this email'
      });
    }

    // Get creator and campaign data
    const creator = creatorsData.findById(email.creatorId);
    const campaign = outreachCampaignsData.findById(email.campaignId);

    const enrichedEmail = {
      ...email,
      creator: creator ? {
        id: creator.id,
        name: creator.channelName,
        email: creator.email,
        platform: creator.platform,
        followers: creator.subscribers,
        categories: creator.categories
      } : null,
      campaign: campaign ? {
        id: campaign.id,
        name: campaign.name
      } : null
    };

    res.json({
      success: true,
      data: enrichedEmail
    });

  } catch (error) {
    console.error('Get email details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching email details'
    });
  }
});

// @route   PUT /api/outreach/emails/:id/status
// @desc    Update email status (for tracking)
// @access  Private
router.put('/emails/:id/status', authenticateToken, (req, res) => {
  try {
    const { status, openedAt, repliedAt, notes } = req.body;
    const emailId = req.params.id;
    
    const email = outreachEmailsData.findById(emailId);
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (status) updates.status = status;
    if (openedAt) updates.openedAt = openedAt;
    if (repliedAt) updates.repliedAt = repliedAt;
    if (notes !== undefined) updates.notes = notes;

    const updatedEmail = outreachEmailsData.update(emailId, updates);

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

// @route   GET /api/outreach/pipeline
// @desc    Get CRM-style email pipeline with stages
// @access  Private
router.get('/pipeline', authenticateToken, (req, res) => {
  try {
    let emails = outreachEmailsData.getAll();

    // Filter by user permissions
    if (req.user.role !== 'admin') {
      emails = emails.filter(email => email.createdBy === req.user.id);
    }

    // Enrich emails with creator and campaign data
    const enrichedEmails = emails.map(email => {
      const creator = creatorsData.findById(email.creatorId);
      const campaign = outreachCampaignsData.findById(email.campaignId);
      
      return {
        ...email,
        creator: creator ? {
          id: creator.id,
          name: creator.channelName,
          email: creator.email,
          platform: creator.platform,
          followers: creator.subscribers,
          categories: creator.categories,
          avatar: creator.avatar
        } : null,
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name
        } : null
      };
    });

    // Group emails by status for pipeline view
    const pipeline = {
      draft: enrichedEmails.filter(e => e.status === 'draft'),
      sent: enrichedEmails.filter(e => e.status === 'sent'),
      opened: enrichedEmails.filter(e => e.status === 'opened'),
      replied: enrichedEmails.filter(e => e.status === 'replied'),
      failed: enrichedEmails.filter(e => e.status === 'failed')
    };

    // Calculate pipeline metrics
    const totalEmails = enrichedEmails.length;
    const metrics = {
      totalEmails,
      draftCount: pipeline.draft.length,
      sentCount: pipeline.sent.length,
      openedCount: pipeline.opened.length,
      repliedCount: pipeline.replied.length,
      failedCount: pipeline.failed.length,
      openRate: totalEmails > 0 ? ((pipeline.opened.length + pipeline.replied.length) / pipeline.sent.length * 100).toFixed(2) : 0,
      replyRate: totalEmails > 0 ? (pipeline.replied.length / pipeline.sent.length * 100).toFixed(2) : 0,
      deliveryRate: totalEmails > 0 ? ((totalEmails - pipeline.failed.length) / totalEmails * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: {
        pipeline,
        metrics
      }
    });

  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pipeline data'
    });
  }
});

// @route   POST /api/outreach/emails/:id/simulate-reply
// @desc    Simulate a creator reply for demo purposes with AI analysis
// @access  Private
router.post('/emails/:id/simulate-reply', authenticateToken, async (req, res) => {
  try {
    const emailId = req.params.id;
    const { replyContent } = req.body;

    const email = outreachEmailsData.findById(emailId);
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Get creator data
    const creator = creatorsData.findById(email.creatorId);
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    // Use provided reply content or generate a realistic one
    const defaultReplyContent = replyContent || `Hi there!

Thanks for reaching out about the ${email.campaignId} campaign. This sounds like an interesting opportunity!

I'm definitely interested in learning more about the collaboration. Could you share more details about:
- The specific deliverables you're looking for
- Timeline expectations  
- Compensation structure

I've been working with tech brands for a while and I think this could be a great fit for my audience.

Looking forward to hearing from you!

Best,
${creator.channelName}`;

    // Use the reply detection service to handle the simulated reply
    const result = await replyDetectionService.simulateIncomingReply(emailId, defaultReplyContent);

    res.json({
      success: true,
      message: 'Creator reply simulated and processed with AI analysis',
      data: result
    });

  } catch (error) {
    console.error('Simulate reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error simulating reply'
    });
  }
});

// @route   GET /api/outreach/analytics
// @desc    Get detailed analytics for outreach campaigns
// @access  Private
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    let emails = outreachEmailsData.getAll();
    
    // Filter by user permissions
    if (req.user.role !== 'admin') {
      emails = emails.filter(email => email.createdBy === req.user.id);
    }

    // Filter by date range if provided
    const { startDate, endDate, campaignId } = req.query;
    
    if (startDate) {
      emails = emails.filter(email => new Date(email.createdAt) >= new Date(startDate));
    }
    
    if (endDate) {
      emails = emails.filter(email => new Date(email.createdAt) <= new Date(endDate));
    }
    
    if (campaignId) {
      emails = emails.filter(email => email.campaignId === campaignId);
    }

    // Calculate analytics
    const totalEmails = emails.length;
    const sentEmails = emails.filter(e => e.status === 'sent' || e.status === 'opened' || e.status === 'replied');
    const openedEmails = emails.filter(e => e.status === 'opened' || e.status === 'replied');
    const repliedEmails = emails.filter(e => e.status === 'replied');
    const failedEmails = emails.filter(e => e.status === 'failed');

    // Performance by campaign
    const campaignPerformance = {};
    emails.forEach(email => {
      if (!campaignPerformance[email.campaignId]) {
        const campaign = outreachCampaignsData.findById(email.campaignId);
        campaignPerformance[email.campaignId] = {
          campaignName: campaign?.name || 'Unknown Campaign',
          total: 0,
          sent: 0,
          opened: 0,
          replied: 0,
          failed: 0
        };
      }
      
      campaignPerformance[email.campaignId].total++;
      if (email.status === 'sent' || email.status === 'opened' || email.status === 'replied') {
        campaignPerformance[email.campaignId].sent++;
      }
      if (email.status === 'opened' || email.status === 'replied') {
        campaignPerformance[email.campaignId].opened++;
      }
      if (email.status === 'replied') {
        campaignPerformance[email.campaignId].replied++;
      }
      if (email.status === 'failed') {
        campaignPerformance[email.campaignId].failed++;
      }
    });

    // Calculate rates for each campaign
    Object.keys(campaignPerformance).forEach(campaignId => {
      const data = campaignPerformance[campaignId];
      data.openRate = data.sent > 0 ? (data.opened / data.sent * 100).toFixed(2) : 0;
      data.replyRate = data.sent > 0 ? (data.replied / data.sent * 100).toFixed(2) : 0;
      data.deliveryRate = data.total > 0 ? ((data.total - data.failed) / data.total * 100).toFixed(2) : 0;
    });

    // Timeline data (emails sent over time)
    const timelineData = {};
    emails.forEach(email => {
      if (email.sentAt) {
        const date = new Date(email.sentAt).toISOString().split('T')[0];
        if (!timelineData[date]) {
          timelineData[date] = { sent: 0, opened: 0, replied: 0 };
        }
        timelineData[date].sent++;
        if (email.status === 'opened' || email.status === 'replied') {
          timelineData[date].opened++;
        }
        if (email.status === 'replied') {
          timelineData[date].replied++;
        }
      }
    });

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
      campaignPerformance: Object.values(campaignPerformance),
      timeline: Object.keys(timelineData).sort().map(date => ({
        date,
        ...timelineData[date]
      }))
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

// @route   POST /api/outreach/campaigns
// @desc    Create new outreach campaign
// @access  Private (Brand/Agency only)
router.post('/campaigns', authenticateToken, authorizeRole('brand', 'agency', 'admin'), (req, res) => {
  try {
    const { name, subject, message, targetCreators } = req.body;

    if (!name || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, subject, and message'
      });
    }

    const newCampaign = {
      id: (outreachCampaigns.length + 1).toString(),
      name,
      subject,
      message,
      status: 'draft',
      createdBy: req.user.id,
      targetCreators: targetCreators || [],
      sentCount: 0,
      repliedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    outreachCampaigns.push(newCampaign);

    res.status(201).json({
      success: true,
      message: 'Outreach campaign created successfully',
      data: { campaign: newCampaign }
    });

  } catch (error) {
    console.error('Create outreach campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating outreach campaign'
    });
  }
});

// @route   GET /api/outreach/campaigns
// @desc    Get outreach campaigns
// @access  Private
router.get('/campaigns', authenticateToken, (req, res) => {
  try {
    let filteredCampaigns = outreachCampaigns;

    if (req.user.role !== 'admin') {
      filteredCampaigns = outreachCampaigns.filter(campaign => campaign.createdBy === req.user.id);
    }

    res.json({
      success: true,
      data: { campaigns: filteredCampaigns }
    });

  } catch (error) {
    console.error('Get outreach campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching outreach campaigns'
    });
  }
});

// @route   POST /api/outreach/email-webhook
// @desc    Handle incoming email replies (webhook from email service)
// @access  Public (webhook)
router.post('/email-webhook', async (req, res) => {
  try {
    // This would be called by MailerSend/Gmail when someone replies
    const emailData = req.body;
    
    console.log('📧 Webhook received:', emailData);
    
    const result = await replyDetectionService.handleIncomingEmail(emailData);
    
    res.json({
      success: true,
      message: 'Email reply processed',
      data: result
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing email webhook'
    });
  }
});

// @route   GET /api/outreach/pending-approvals
// @desc    Get pending human approvals for email replies
// @access  Private (Brand/Agency only)
router.get('/pending-approvals', authenticateToken, authorizeRole('brand', 'agency', 'admin'), (req, res) => {
  try {
    const pendingApprovals = replyDetectionService.getPendingApprovals();
    
    res.json({
      success: true,
      data: { approvals: pendingApprovals }
    });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending approvals'
    });
  }
});

// @route   POST /api/outreach/approve-response/:escalationId
// @desc    Approve and send human-crafted response
// @access  Private (Brand/Agency only)
router.post('/approve-response/:escalationId', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const { escalationId } = req.params;
    const { responseText } = req.body;

    if (!responseText) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const result = await replyDetectionService.approveResponse(escalationId, responseText);
    
    res.json({
      success: true,
      message: 'Response approved and sent',
      data: result
    });

  } catch (error) {
    console.error('Approve response error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error approving response'
    });
  }
});

// @route   POST /api/outreach/emails/:id/manual-reply
// @desc    Manually process a reply content (for testing real email replies)
// @access  Private
router.post('/emails/:id/manual-reply', authenticateToken, async (req, res) => {
  try {
    const emailId = req.params.id;
    const { replyContent, fromEmail } = req.body;

    if (!replyContent) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const email = outreachEmailsData.findById(emailId);
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    const creator = creatorsData.findById(email.creatorId);
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    // Simulate the email data structure that would come from a real reply
    const emailData = {
      from: {
        email: fromEmail || creator.contactEmail || creator.email || `${creator.channelName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        name: creator.channelName
      },
      subject: `Re: ${email.subject}`,
      text: replyContent,
      messageId: `manual-reply-${Date.now()}@example.com`,
      references: [email.messageId],
      timestamp: new Date().toISOString()
    };

    const result = await replyDetectionService.handleIncomingEmail(emailData);

    res.json({
      success: true,
      message: 'Manual reply processed with AI analysis',
      data: result
    });

  } catch (error) {
    console.error('Manual reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing manual reply'
    });
  }
});

// @route   GET /api/outreach/conversations
// @desc    Get all conversations with their current state
// @access  Private
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const conversations = replyDetectionService.getAllConversations();
    
    // Enrich conversations with creator and campaign data
    const enrichedConversations = conversations.map(conv => {
      const email = outreachEmailsData.findById(conv.emailId);
      const creator = creatorsData.findById(conv.creatorId);
      const campaign = outreachCampaignsData.findById(conv.campaignId);
      
      return {
        ...conv,
        email,
        creator: creator ? {
          id: creator.id,
          name: creator.channelName,
          email: creator.email,
          platform: creator.platform,
          followers: creator.subscribers,
          categories: creator.categories,
          avatar: creator.avatar
        } : null,
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name
        } : null
      };
    });

    res.json({
      success: true,
      data: { conversations: enrichedConversations }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching conversations'
    });
  }
});

// @route   GET /api/outreach/conversations/:emailId
// @desc    Get specific conversation by email ID
// @access  Private
router.get('/conversations/:emailId', authenticateToken, (req, res) => {
  try {
    const conversation = replyDetectionService.getConversationByEmailId(req.params.emailId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Enrich with related data
    const email = outreachEmailsData.findById(conversation.emailId);
    const creator = creatorsData.findById(conversation.creatorId);
    const campaign = outreachCampaignsData.findById(conversation.campaignId);
    
    const enrichedConversation = {
      ...conversation,
      email,
      creator: creator ? {
        id: creator.id,
        name: creator.channelName,
        email: creator.email,
        platform: creator.platform,
        followers: creator.subscribers,
        categories: creator.categories,
        avatar: creator.avatar
      } : null,
      campaign: campaign ? {
        id: campaign.id,
        name: campaign.name
      } : null
    };

    res.json({
      success: true,
      data: enrichedConversation
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching conversation'
    });
  }
});

// @route   POST /api/outreach/approvals/:approvalId/handle
// @desc    Handle human approval for AI conversations
// @access  Private (Brand/Agency only)
router.post('/approvals/:approvalId/handle', authenticateToken, authorizeRole('brand', 'agency', 'admin'), async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { action, customResponse, humanNotes } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const result = await replyDetectionService.handleHumanApproval(
      approvalId, 
      action, 
      customResponse, 
      humanNotes
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: `Conversation ${action}ed successfully`,
        data: result.conversation
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Handle approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error handling approval'
    });
  }
});

// @route   PUT /api/outreach/conversations/:conversationId/stage
// @desc    Manually update conversation stage
// @access  Private (Brand/Agency only)
router.put('/conversations/:conversationId/stage', authenticateToken, authorizeRole('brand', 'agency', 'admin'), (req, res) => {
  try {
    const { conversationId } = req.params;
    const { stage, humanNotes } = req.body;

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: 'Stage is required'
      });
    }

    const updatedConversation = replyDetectionService.updateConversationStage(
      conversationId, 
      stage, 
      humanNotes
    );

    if (updatedConversation) {
      res.json({
        success: true,
        message: 'Conversation stage updated successfully',
        data: updatedConversation
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

  } catch (error) {
    console.error('Update conversation stage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating conversation stage'
    });
  }
});

module.exports = router; 