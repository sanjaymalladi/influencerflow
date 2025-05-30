const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Mock outreach database
let outreachCampaigns = [
  {
    id: '1',
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
  }
];

let outreachEmails = [
  {
    id: '1',
    campaignId: '1',
    creatorId: '1',
    creatorEmail: 'linus@linustechtips.com',
    subject: 'Partnership Opportunity - Tech Product Launch',
    personalizedMessage: 'Hi Linus, We would love to partner with you...',
    status: 'sent',
    sentAt: new Date().toISOString()
  }
];

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

// @route   GET /api/outreach/stats
// @desc    Get outreach statistics
// @access  Private
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const userCampaigns = outreachCampaigns.filter(campaign => 
      campaign.createdBy === req.user.id || req.user.role === 'admin'
    );

    const userCampaignIds = userCampaigns.map(c => c.id);
    const userEmails = outreachEmails.filter(email => 
      userCampaignIds.includes(email.campaignId)
    );

    const stats = {
      totalCampaigns: userCampaigns.length,
      activeCampaigns: userCampaigns.filter(c => c.status === 'active').length,
      totalEmailsSent: userEmails.length,
      emailsOpened: userEmails.filter(e => e.openedAt).length,
      emailsReplied: userEmails.filter(e => e.status === 'replied').length,
      openRate: userEmails.length > 0 ? 
        ((userEmails.filter(e => e.openedAt).length / userEmails.length) * 100).toFixed(1) : '0',
      replyRate: userEmails.length > 0 ? 
        ((userEmails.filter(e => e.status === 'replied').length / userEmails.length) * 100).toFixed(1) : '0'
    };

    res.json({
      success: true,
      data: { stats }
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