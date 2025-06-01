const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      channelName,
      profileImageUrl,
      youtubeChannelUrl,
      instagramUrl,
      tiktokUrl,
      bio,
      subscriberCount,
      followerCount,
      viewCount,
      videoCount,
      matchPercentage,
      categories,
      typicalViews,
      engagementRate,
      dataSource,
      geminiBio,
      popularVideos,
      contactEmail,
      notes,
      tags
    } = req.body;

    // Validation
    if (!channelName) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    // Check if creator already exists for this user
    const { data: existingCreators, error: findError } = await supabase
      .from('creators')
      .select('*')
      .eq('user_id', req.user.id)
      .or(`channel_name.ilike.%${channelName}%,youtube_channel_url.eq.${youtubeChannelUrl || ''},contact_email.eq.${contactEmail || ''}`);

    if (findError) {
      throw new Error('Error checking existing creators: ' + findError.message);
    }

    if (existingCreators && existingCreators.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Creator already saved',
        data: { creator: existingCreators[0] }
      });
    }

    // Prepare creator data for Supabase
    const creatorData = {
      user_id: req.user.id,
      channel_name: channelName,
      youtube_channel_url: youtubeChannelUrl || null,
      instagram_url: instagramUrl || null,
      tiktok_url: tiktokUrl || null,
      subscriber_count: subscriberCount || null,
      follower_count: followerCount || null,
      categories: categories || [],
      contact_email: contactEmail || null,
      avatar_url: profileImageUrl || null,
      stats: {
        viewCount: viewCount || null,
        videoCount: videoCount || null,
        matchPercentage: matchPercentage || null,
        typicalViews: typicalViews || null,
        engagementRate: engagementRate || null,
        bio: bio || '',
        geminiBio: geminiBio || null,
        popularVideos: popularVideos || [],
        dataSource: dataSource || 'Manual'
      },
      notes: notes || null,
      tags: tags || [],
      status: 'active'
    };

    // Insert creator into Supabase
    const { data: newCreator, error: insertError } = await supabase
      .from('creators')
      .insert([creatorData])
      .select()
      .single();

    if (insertError) {
      throw new Error('Error saving creator: ' + insertError.message);
    }

    // Log analytics event
    await supabase
      .from('analytics_events')
      .insert([{
        user_id: req.user.id,
        event_type: 'creator_added',
        event_data: {
          creator_id: newCreator.id,
          channel_name: channelName,
          data_source: dataSource
        }
      }]);

    res.status(201).json({
      success: true,
      message: 'Creator saved successfully',
      data: { creator: newCreator }
    });

  } catch (error) {
    console.error('Save creator error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error saving creator'
    });
  }
});

// @route   GET /api/creators
// @desc    Get all saved creators
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, platform, search, status = 'active' } = req.query;
    
    let query = supabase
      .from('creators')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', status);

    // Filter by category
    if (category) {
      query = query.contains('categories', [category]);
    }

    // Filter by platform
    if (platform) {
      if (platform === 'youtube') {
        query = query.not('youtube_channel_url', 'is', null);
      } else if (platform === 'instagram') {
        query = query.not('instagram_url', 'is', null);
      } else if (platform === 'tiktok') {
        query = query.not('tiktok_url', 'is', null);
      }
    }

    // Search by name or email
    if (search) {
      query = query.or(`channel_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('creators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    query = query
      .range(startIndex, startIndex + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    const { data: creators, error } = await query;

    if (error) {
      throw new Error('Error fetching creators: ' + error.message);
    }

    res.json({
      success: true,
      data: {
        creators: creators || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalCreators: count,
          hasNext: startIndex + parseInt(limit) < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get creators error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching creators'
    });
  }
});

// @route   GET /api/creators/:id
// @desc    Get specific creator
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: creator, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Creator not found'
        });
      }
      throw new Error('Error fetching creator: ' + error.message);
    }

    res.json({
      success: true,
      data: { creator }
    });

  } catch (error) {
    console.error('Get creator error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching creator'
    });
  }
});

// @route   PUT /api/creators/:id
// @desc    Update creator
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      channelName,
      contactEmail,
      notes,
      tags,
      status,
      categories,
      instagramUrl,
      tiktokUrl,
      subscriberCount,
      followerCount
    } = req.body;

    const updateData = {};
    
    if (channelName !== undefined) updateData.channel_name = channelName;
    if (contactEmail !== undefined) updateData.contact_email = contactEmail;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    if (categories !== undefined) updateData.categories = categories;
    if (instagramUrl !== undefined) updateData.instagram_url = instagramUrl;
    if (tiktokUrl !== undefined) updateData.tiktok_url = tiktokUrl;
    if (subscriberCount !== undefined) updateData.subscriber_count = subscriberCount;
    if (followerCount !== undefined) updateData.follower_count = followerCount;

    const { data: updatedCreator, error } = await supabase
      .from('creators')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Creator not found'
        });
      }
      throw new Error('Error updating creator: ' + error.message);
    }

    res.json({
      success: true,
      message: 'Creator updated successfully',
      data: { creator: updatedCreator }
    });

  } catch (error) {
    console.error('Update creator error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating creator'
    });
  }
});

// @route   DELETE /api/creators/:id
// @desc    Delete creator
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('creators')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) {
      throw new Error('Error deleting creator: ' + error.message);
    }

    res.json({
      success: true,
      message: 'Creator deleted successfully'
    });

  } catch (error) {
    console.error('Delete creator error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting creator'
    });
  }
});

// @route   POST /api/creators/bulk
// @desc    Save multiple creators
// @access  Private
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { creators } = req.body;

    if (!Array.isArray(creators) || creators.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Creators array is required'
      });
    }

    const creatorsData = creators.map(creator => ({
      user_id: req.user.id,
      channel_name: creator.channelName,
      youtube_channel_url: creator.youtubeChannelUrl || null,
      contact_email: creator.contactEmail || null,
      avatar_url: creator.profileImageUrl || null,
      categories: creator.categories || [],
      stats: {
        subscriberCount: creator.subscriberCount,
        engagementRate: creator.engagementRate,
        bio: creator.bio || '',
        dataSource: creator.dataSource || 'Bulk Import'
      },
      status: 'active'
    }));

    const { data: newCreators, error } = await supabase
      .from('creators')
      .insert(creatorsData)
      .select();

    if (error) {
      throw new Error('Error saving creators: ' + error.message);
    }

    res.json({
      success: true,
      message: `${newCreators.length} creators saved successfully`,
      data: { creators: newCreators }
    });

  } catch (error) {
    console.error('Bulk save creators error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error saving creators'
    });
  }
});

module.exports = router; 