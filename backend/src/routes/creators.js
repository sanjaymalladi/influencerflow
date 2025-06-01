const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { creatorsData } = require('../utils/dataStorage');

const router = express.Router();

// @route   GET /api/creators/search
// @desc    Search creators (integrates with frontend Gemini search)
// @access  Public (with optional auth)
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { query, platform, size, engagement, region, limit = 10 } = req.query;

    // This endpoint can be used to log searches or provide cached results
    // The actual search logic remains in the frontend for now
    
    res.json({
      success: true,
      message: 'Search endpoint ready - frontend handles Gemini/YouTube integration',
      data: {
        query,
        filters: { platform, size, engagement, region },
        limit: parseInt(limit),
        searchId: `search_${Date.now()}`,
        frontendSearchUrl: 'Use your existing frontend Gemini service'
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search'
    });
  }
});

// @route   POST /api/creators
// @desc    Save a creator to database (from frontend search results)
// @access  Private
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      channelName,
      profileImageUrl,
      youtubeChannelUrl,
      bio,
      subscriberCount,
      viewCount,
      videoCount,
      matchPercentage,
      categories,
      typicalViews,
      engagementRate,
      dataSource,
      geminiBio,
      popularVideos
    } = req.body;

    // Validation
    if (!channelName) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    // Check if creator already exists
    const existingCreators = creatorsData.getAll();
    const existingCreator = existingCreators.find(
      creator => creator.channelName.toLowerCase() === channelName.toLowerCase() ||
                 (youtubeChannelUrl && creator.youtubeChannelUrl === youtubeChannelUrl)
    );

    if (existingCreator) {
      return res.status(409).json({
        success: false,
        message: 'Creator already saved',
        data: { creator: existingCreator }
      });
    }

    // Create new creator
    const creatorData = {
      channelName,
      profileImageUrl: profileImageUrl || null,
      youtubeChannelUrl: youtubeChannelUrl || null,
      bio: bio || '',
      subscriberCount: subscriberCount || null,
      viewCount: viewCount || null,
      videoCount: videoCount || null,
      matchPercentage: matchPercentage || null,
      categories: categories || [],
      typicalViews: typicalViews || null,
      engagementRate: engagementRate || null,
      dataSource: dataSource || 'Manual',
      geminiBio: geminiBio || null,
      popularVideos: popularVideos || [],
      createdAt: new Date().toISOString(),
      addedBy: req.user.id
    };

    const newCreator = creatorsData.add(creatorData);

    res.status(201).json({
      success: true,
      message: 'Creator saved successfully',
      data: { creator: newCreator }
    });

  } catch (error) {
    console.error('Save creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving creator'
    });
  }
});

// @route   GET /api/creators
// @desc    Get all saved creators
// @access  Private
router.get('/', authenticateToken, (req, res) => {
  try {
    const { page = 1, limit = 20, category, platform, search } = req.query;
    
    let filteredCreators = creatorsData.getAll();

    // Filter by category
    if (category) {
      filteredCreators = filteredCreators.filter(creator =>
        creator.categories.some(cat => 
          cat.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Filter by platform (based on data source)
    if (platform) {
      if (platform === 'youtube') {
        filteredCreators = filteredCreators.filter(creator =>
          creator.youtubeChannelUrl || creator.dataSource.includes('YouTube')
        );
      }
    }

    // Search by name
    if (search) {
      filteredCreators = filteredCreators.filter(creator =>
        creator.channelName.toLowerCase().includes(search.toLowerCase()) ||
        creator.bio.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCreators = filteredCreators.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        creators: paginatedCreators,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredCreators.length / limit),
          totalCreators: filteredCreators.length,
          hasNext: endIndex < filteredCreators.length,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get creators error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching creators'
    });
  }
});

// @route   GET /api/creators/:id
// @desc    Get specific creator
// @access  Private
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const creator = creatorsData.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    res.json({
      success: true,
      data: { creator }
    });

  } catch (error) {
    console.error('Get creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching creator'
    });
  }
});

// @route   PUT /api/creators/:id
// @desc    Update creator information
// @access  Private
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const creator = creatorsData.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'bio', 'categories', 'notes', 'subscriberCount', 'engagementRate', 
      'recentGrowth', 'videoCount', 'dataSource', 'typicalViews', 'viewCount'
    ];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Add notes field if it doesn't exist
    if (!creator.notes) {
      updates.notes = '';
    }

    updates.updatedAt = new Date().toISOString();

    const updatedCreator = creatorsData.update(req.params.id, updates);

    res.json({
      success: true,
      message: 'Creator updated successfully',
      data: { creator: updatedCreator }
    });

  } catch (error) {
    console.error('Update creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating creator'
    });
  }
});

// @route   DELETE /api/creators/:id
// @desc    Delete creator
// @access  Private
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const creator = creatorsData.findById(req.params.id);

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    const deleted = creatorsData.delete(req.params.id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Creator deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete creator'
      });
    }

  } catch (error) {
    console.error('Delete creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting creator'
    });
  }
});

// @route   POST /api/creators/lists
// @desc    Create a creator list
// @access  Private
router.post('/lists', authenticateToken, (req, res) => {
  try {
    const { name, description, creatorIds } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'List name is required'
      });
    }

    const newList = {
      id: (creatorLists.length + 1).toString(),
      name,
      description: description || '',
      creatorIds: creatorIds || [],
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    creatorLists.push(newList);

    res.status(201).json({
      success: true,
      message: 'Creator list created successfully',
      data: { list: newList }
    });

  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating list'
    });
  }
});

// @route   GET /api/creators/lists
// @desc    Get user's creator lists
// @access  Private
router.get('/lists', authenticateToken, (req, res) => {
  try {
    const userLists = creatorLists.filter(list => list.userId === req.user.id);

    const listsWithCreators = userLists.map(list => ({
      ...list,
      creators: list.creatorIds.map(id => 
        creatorsData.findById(id)
      ).filter(Boolean)
    }));

    res.json({
      success: true,
      data: { lists: listsWithCreators }
    });

  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching lists'
    });
  }
});

module.exports = router; 