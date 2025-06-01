const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { campaignsData, campaignApplicationsData } = require('../utils/dataStorage');

const router = express.Router();

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
    const campaignData = {
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

    const newCampaign = campaignsData.add(campaignData);

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
    
    let filteredCampaigns = campaignsData.getAll();

    // Filter by user role
    if (req.user.role === 'brand' || req.user.role === 'agency') {
      // Brands/Agencies see only their campaigns
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.createdBy === req.user.id);
    } else if (req.user.role === 'creator') {
      // Creators see only public/active campaigns they can apply to
      filteredCampaigns = filteredCampaigns.filter(campaign => 
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
    const campaign = campaignsData.findById(req.params.id);

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
      applications = campaignApplicationsData.findByCampaignId(req.params.id);
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
    const campaign = campaignsData.findById(req.params.id);

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

    updates.updatedAt = new Date().toISOString();
    const updatedCampaign = campaignsData.update(req.params.id, updates);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign: updatedCampaign }
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating campaign'
    });
  }
});

// @route   PUT /api/campaigns/:id/status
// @desc    Update campaign status
// @access  Private (Campaign owner only)
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    const campaign = campaignsData.findById(req.params.id);

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

    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'active', 'paused', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const updatedCampaign = campaignsData.update(req.params.id, {
      status,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Campaign status updated to ${status} successfully`,
      data: { campaign: updatedCampaign }
    });

  } catch (error) {
    console.error('Update campaign status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating campaign status'
    });
  }
});

// @route   DELETE /api/campaigns/:id
// @desc    Delete campaign
// @access  Private (Campaign owner only)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const campaign = campaignsData.findById(req.params.id);

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

    campaignsData.delete(req.params.id);

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
    const campaign = campaignsData.findById(req.params.id);

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
    const existingApplications = campaignApplicationsData.findByCampaignId(req.params.id);
    const existingApplication = existingApplications.find(app => app.creatorId === req.user.id);

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied to this campaign'
      });
    }

    const { message, proposedRate, deliverables } = req.body;

    const applicationData = {
      campaignId: req.params.id,
      creatorId: req.user.id,
      status: 'pending',
      message: message || '',
      proposedRate: proposedRate || null,
      deliverables: deliverables || [],
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const newApplication = campaignApplicationsData.add(applicationData);

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
    const campaign = campaignsData.findById(req.params.id);
    
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

    const application = campaignApplicationsData.findById(req.params.applicationId);

    if (!application || application.campaignId !== req.params.id) {
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

    const updates = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (feedback) updates.feedback = feedback;

    const updatedApplication = campaignApplicationsData.update(req.params.applicationId, updates);

    // If approved, add creator to campaign
    if (status === 'approved') {
      const creatorId = updatedApplication.creatorId;
      if (!campaign.assignedCreators) campaign.assignedCreators = [];
      if (!campaign.assignedCreators.includes(creatorId)) {
        campaignsData.update(req.params.id, {
          assignedCreators: [...campaign.assignedCreators, creatorId],
          updatedAt: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: { application: updatedApplication }
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