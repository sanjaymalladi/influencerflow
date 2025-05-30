const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Mock campaigns database
let campaigns = [
  {
    id: '1',
    name: 'Tech Product Launch Q1 2024',
    description: 'Launch campaign for our new smartphone featuring top tech reviewers',
    status: 'active',
    budget: 50000,
    spent: 12500,
    startDate: '2024-01-15',
    endDate: '2024-03-15',
    goals: ['Brand Awareness', 'Product Reviews', 'Social Media Buzz'],
    targetAudience: {
      ageRange: '18-45',
      interests: ['Technology', 'Gadgets', 'Reviews'],
      platforms: ['YouTube', 'Instagram', 'TikTok']
    },
    deliverables: [
      { type: 'Video Review', quantity: 5, price: 5000 },
      { type: 'Social Media Posts', quantity: 10, price: 1000 },
      { type: 'Unboxing Video', quantity: 3, price: 3000 }
    ],
    assignedCreators: ['1', '2'],
    createdBy: '1',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let campaignApplications = [
  {
    id: '1',
    campaignId: '1',
    creatorId: '2',
    status: 'pending',
    message: 'I would love to be part of this campaign. I have experience with tech reviews.',
    proposedRate: 4500,
    deliverables: ['Video Review', 'Social Media Posts'],
    appliedAt: new Date().toISOString()
  }
];

// @route   POST /api/campaigns
// @desc    Create a new campaign
// @access  Private (Brand/Agency only)
router.post('/', authenticateToken, authorizeRole('brand', 'agency', 'admin'), (req, res) => {
  try {
    const {
      name,
      description,
      budget,
      startDate,
      endDate,
      goals,
      targetAudience,
      deliverables
    } = req.body;

    // Validation
    if (!name || !description || !budget || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, description, budget, startDate, and endDate'
      });
    }

    // Create new campaign
    const newCampaign = {
      id: (campaigns.length + 1).toString(),
      name,
      description,
      status: 'draft',
      budget: parseFloat(budget),
      spent: 0,
      startDate,
      endDate,
      goals: goals || [],
      targetAudience: targetAudience || {},
      deliverables: deliverables || [],
      assignedCreators: [],
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    campaigns.push(newCampaign);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign: newCampaign }
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating campaign'
    });
  }
});

// @route   GET /api/campaigns
// @desc    Get all campaigns (filtered by user role)
// @access  Private
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filteredCampaigns = campaigns;

    // Filter by user role
    if (req.user.role === 'brand' || req.user.role === 'agency') {
      // Brands/Agencies see only their campaigns
      filteredCampaigns = campaigns.filter(campaign => campaign.createdBy === req.user.id);
    } else if (req.user.role === 'creator') {
      // Creators see only public/active campaigns they can apply to
      filteredCampaigns = campaigns.filter(campaign => 
        campaign.status === 'active' || campaign.status === 'recruiting'
      );
    }
    // Admins see all campaigns

    // Filter by status
    if (status) {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.status === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        campaigns: paginatedCampaigns,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredCampaigns.length / limit),
          totalCampaigns: filteredCampaigns.length,
          hasNext: endIndex < filteredCampaigns.length,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching campaigns'
    });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get specific campaign
// @access  Private
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const campaign = campaigns.find(c => c.id === req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check permissions
    const canView = 
      req.user.role === 'admin' ||
      campaign.createdBy === req.user.id ||
      (req.user.role === 'creator' && (campaign.status === 'active' || campaign.status === 'recruiting'));

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get applications for this campaign (if user is campaign owner)
    let applications = [];
    if (campaign.createdBy === req.user.id || req.user.role === 'admin') {
      applications = campaignApplications.filter(app => app.campaignId === req.params.id);
    }

    res.json({
      success: true,
      data: { 
        campaign,
        applications: applications.length > 0 ? applications : undefined
      }
    });

  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching campaign'
    });
  }
});

// @route   PUT /api/campaigns/:id
// @desc    Update campaign
// @access  Private (Campaign owner only)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const campaignIndex = campaigns.findIndex(c => c.id === req.params.id);

    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaigns[campaignIndex];

    // Check permissions
    if (campaign.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'description', 'budget', 'status', 'startDate', 
      'endDate', 'goals', 'targetAudience', 'deliverables'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(campaigns[campaignIndex], updates);
    campaigns[campaignIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign: campaigns[campaignIndex] }
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating campaign'
    });
  }
});

// @route   DELETE /api/campaigns/:id
// @desc    Delete campaign
// @access  Private (Campaign owner only)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const campaignIndex = campaigns.findIndex(c => c.id === req.params.id);

    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaigns[campaignIndex];

    // Check permissions
    if (campaign.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    campaigns.splice(campaignIndex, 1);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting campaign'
    });
  }
});

// @route   POST /api/campaigns/:id/apply
// @desc    Apply to a campaign (Creator only)
// @access  Private (Creator only)
router.post('/:id/apply', authenticateToken, authorizeRole('creator'), (req, res) => {
  try {
    const campaign = campaigns.find(c => c.id === req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'active' && campaign.status !== 'recruiting') {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not accepting applications'
      });
    }

    // Check if already applied
    const existingApplication = campaignApplications.find(
      app => app.campaignId === req.params.id && app.creatorId === req.user.id
    );

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied to this campaign'
      });
    }

    const { message, proposedRate, deliverables } = req.body;

    const newApplication = {
      id: (campaignApplications.length + 1).toString(),
      campaignId: req.params.id,
      creatorId: req.user.id,
      status: 'pending',
      message: message || '',
      proposedRate: proposedRate || null,
      deliverables: deliverables || [],
      appliedAt: new Date().toISOString()
    };

    campaignApplications.push(newApplication);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application: newApplication }
    });

  } catch (error) {
    console.error('Apply to campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting application'
    });
  }
});

// @route   PUT /api/campaigns/:id/applications/:applicationId
// @desc    Update application status (Campaign owner only)
// @access  Private
router.put('/:id/applications/:applicationId', authenticateToken, (req, res) => {
  try {
    const campaign = campaigns.find(c => c.id === req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check permissions
    if (campaign.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const applicationIndex = campaignApplications.findIndex(
      app => app.id === req.params.applicationId && app.campaignId === req.params.id
    );

    if (applicationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const { status, feedback } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }

    campaignApplications[applicationIndex].status = status;
    if (feedback) campaignApplications[applicationIndex].feedback = feedback;
    campaignApplications[applicationIndex].updatedAt = new Date().toISOString();

    // If approved, add creator to campaign
    if (status === 'approved') {
      const creatorId = campaignApplications[applicationIndex].creatorId;
      if (!campaign.assignedCreators.includes(creatorId)) {
        campaign.assignedCreators.push(creatorId);
        campaign.updatedAt = new Date().toISOString();
      }
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: { application: campaignApplications[applicationIndex] }
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating application'
    });
  }
});

module.exports = router; 