const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// Helper function to map auth user ID to Supabase UUID
const getSupabaseUserId = (authUserId) => {
  // Map the demo user ID to the expected Supabase UUID
  if (authUserId === '550e8400-e29b-41d4-a716-446655440000' || 
      authUserId === '1' || 
      authUserId === 1 ||
      authUserId === 'demo' ||
      authUserId === 'sanjay') {
    return '550e8400-e29b-41d4-a716-446655440000';
  }
  return authUserId; // For other users, assume they're already UUIDs
};

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

    const supabaseUserId = getSupabaseUserId(req.user.id);
    
    // Use admin client for demo user to bypass RLS
    const isDemoUser = supabaseUserId === '550e8400-e29b-41d4-a716-446655440000';
    const dbClient = isDemoUser && supabaseAdmin ? supabaseAdmin : supabase;

    if (isDemoUser && !supabaseAdmin) {
      console.warn('⚠️ Demo user detected but no admin client available. Using regular client.');
    }

    // Check if creator already exists for this user
    const { data: existingCreators, error: findError } = await dbClient
      .from('creators')
      .select('*')
      .eq('user_id', supabaseUserId)
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
      user_id: supabaseUserId,
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
    const { data: newCreator, error: insertError } = await dbClient
      .from('creators')
      .insert([creatorData])
      .select()
      .single();

    if (insertError) {
      throw new Error('Error saving creator: ' + insertError.message);
    }

    // Log analytics event (optional, may fail if table doesn't exist)
    try {
      await dbClient
        .from('analytics_events')
        .insert([{
          user_id: supabaseUserId,
          event_type: 'creator_added',
          event_data: {
            creator_id: newCreator.id,
            channel_name: channelName,
            data_source: dataSource
          }
        }]);
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError.message);
    }

    // Transform data from Supabase format to frontend format
    const transformedCreator = {
      id: newCreator.id,
      channelName: newCreator.channel_name,
      profileImageUrl: newCreator.avatar_url,
      youtubeChannelUrl: newCreator.youtube_channel_url,
      instagramUrl: newCreator.instagram_url,
      tiktokUrl: newCreator.tiktok_url,
      bio: newCreator.stats?.bio || '',
      subscriberCount: newCreator.subscriber_count,
      followerCount: newCreator.follower_count,
      viewCount: newCreator.stats?.viewCount,
      videoCount: newCreator.stats?.videoCount,
      matchPercentage: newCreator.stats?.matchPercentage,
      categories: newCreator.categories || [],
      typicalViews: newCreator.stats?.typicalViews,
      engagementRate: newCreator.stats?.engagementRate,
      recentGrowth: newCreator.stats?.recentGrowth,
      dataSource: newCreator.stats?.dataSource || 'Manual',
      geminiBio: newCreator.stats?.geminiBio,
      popularVideos: newCreator.stats?.popularVideos || [],
      socialPlatforms: newCreator.social_stats?.socialPlatforms || ['YouTube'],
      location: newCreator.social_stats?.location,
      contactEmail: newCreator.contact_email,
      notes: newCreator.notes,
      tags: newCreator.tags || [],
      status: newCreator.status,
      createdAt: newCreator.created_at,
      updatedAt: newCreator.updated_at,
      addedBy: newCreator.user_id
    };

    res.status(201).json({
      success: true,
      message: 'Creator saved successfully',
      data: { creator: transformedCreator }
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
    const supabaseUserId = getSupabaseUserId(req.user.id);
    
    // Use admin client for demo user to bypass RLS
    const isDemoUser = supabaseUserId === '550e8400-e29b-41d4-a716-446655440000';
    const dbClient = isDemoUser && supabaseAdmin ? supabaseAdmin : supabase;
    
    let query = dbClient
      .from('creators')
      .select('*')
      .eq('user_id', supabaseUserId)
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
    const { count } = await dbClient
      .from('creators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', supabaseUserId);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    query = query
      .range(startIndex, startIndex + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    const { data: creators, error } = await query;

    if (error) {
      throw new Error('Error fetching creators: ' + error.message);
    }

    // Transform data from Supabase format to frontend format
    const transformedCreators = (creators || []).map(creator => ({
      id: creator.id,
      channelName: creator.channel_name,
      profileImageUrl: creator.avatar_url,
      youtubeChannelUrl: creator.youtube_channel_url,
      instagramUrl: creator.instagram_url,
      tiktokUrl: creator.tiktok_url,
      bio: creator.stats?.bio || '',
      subscriberCount: creator.subscriber_count,
      followerCount: creator.follower_count,
      viewCount: creator.stats?.viewCount,
      videoCount: creator.stats?.videoCount,
      matchPercentage: creator.stats?.matchPercentage,
      categories: creator.categories || [],
      typicalViews: creator.stats?.typicalViews,
      engagementRate: creator.stats?.engagementRate,
      recentGrowth: creator.stats?.recentGrowth,
      dataSource: creator.stats?.dataSource || 'Manual',
      geminiBio: creator.stats?.geminiBio,
      popularVideos: creator.stats?.popularVideos || [],
      socialPlatforms: creator.social_stats?.socialPlatforms || ['YouTube'],
      location: creator.social_stats?.location,
      contactEmail: creator.contact_email,
      notes: creator.notes,
      tags: creator.tags || [],
      status: creator.status,
      createdAt: creator.created_at,
      updatedAt: creator.updated_at,
      addedBy: creator.user_id
    }));

    // For demo user, always ensure Sanjay Malladi is included as a fallback
    if (isDemoUser) {
      const hasSanjay = transformedCreators.some(creator => 
        creator.channelName === 'Sanjay Malladi' || 
        creator.contactEmail === 'malladisanjay29@gmail.com'
      );
      
      if (!hasSanjay) {
        // Add Sanjay as fallback if not found in database
        const sanjayFallback = {
          id: 'fallback_sanjay_001',
          channelName: 'Sanjay Malladi',
          profileImageUrl: 'https://avatar.vercel.sh/sanjaymalladi?size=80&text=SM',
          youtubeChannelUrl: 'https://www.youtube.com/@sanjaymalladi',
          instagramUrl: null,
          tiktokUrl: null,
          bio: 'Tech entrepreneur and content creator passionate about emerging technologies, AI/ML, and startup ecosystems.',
          subscriberCount: '2.8M',
          followerCount: '2.8M',
          viewCount: '850M',
          videoCount: '1,247',
          matchPercentage: 98,
          categories: ['Technology', 'AI/Machine Learning', 'Entrepreneurship', 'Coding Tutorials'],
          typicalViews: '450K',
          engagementRate: '8.2%',
          recentGrowth: '+15.2% (30 days)',
          dataSource: 'Fallback Data',
          geminiBio: 'Innovative tech content creator with expertise in AI, machine learning, and startup development.',
          popularVideos: [
            'Building an AI Startup from Scratch - Complete Guide',
            'React vs Next.js - Which Should You Choose in 2024?',
            'My $100M AI Startup Journey - Lessons Learned'
          ],
          socialPlatforms: ['YouTube', 'LinkedIn', 'Twitter', 'Instagram'],
          location: 'San Francisco, CA',
          contactEmail: 'malladisanjay29@gmail.com',
          notes: 'Demo creator profile - always available',
          tags: ['tech', 'ai', 'startup', 'premium'],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          addedBy: supabaseUserId
        };
        
        transformedCreators.unshift(sanjayFallback); // Add at the beginning
        console.log('✅ Added Sanjay Malladi as fallback creator for demo user');
      }
    }

    res.json({
      success: true,
      data: {
        creators: transformedCreators,
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
    const supabaseUserId = getSupabaseUserId(req.user.id);

    const { data: creator, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', supabaseUserId)
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

    // Transform data from Supabase format to frontend format
    const transformedCreator = {
      id: creator.id,
      channelName: creator.channel_name,
      profileImageUrl: creator.avatar_url,
      youtubeChannelUrl: creator.youtube_channel_url,
      instagramUrl: creator.instagram_url,
      tiktokUrl: creator.tiktok_url,
      bio: creator.stats?.bio || '',
      subscriberCount: creator.subscriber_count,
      followerCount: creator.follower_count,
      viewCount: creator.stats?.viewCount,
      videoCount: creator.stats?.videoCount,
      matchPercentage: creator.stats?.matchPercentage,
      categories: creator.categories || [],
      typicalViews: creator.stats?.typicalViews,
      engagementRate: creator.stats?.engagementRate,
      recentGrowth: creator.stats?.recentGrowth,
      dataSource: creator.stats?.dataSource || 'Manual',
      geminiBio: creator.stats?.geminiBio,
      popularVideos: creator.stats?.popularVideos || [],
      socialPlatforms: creator.social_stats?.socialPlatforms || ['YouTube'],
      location: creator.social_stats?.location,
      contactEmail: creator.contact_email,
      notes: creator.notes,
      tags: creator.tags || [],
      status: creator.status,
      createdAt: creator.created_at,
      updatedAt: creator.updated_at,
      addedBy: creator.user_id
    };

    res.json({
      success: true,
      data: { creator: transformedCreator }
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

    const supabaseUserId = getSupabaseUserId(req.user.id);

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
      .eq('user_id', supabaseUserId)
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

    // Transform data from Supabase format to frontend format
    const transformedCreator = {
      id: updatedCreator.id,
      channelName: updatedCreator.channel_name,
      profileImageUrl: updatedCreator.avatar_url,
      youtubeChannelUrl: updatedCreator.youtube_channel_url,
      instagramUrl: updatedCreator.instagram_url,
      tiktokUrl: updatedCreator.tiktok_url,
      bio: updatedCreator.stats?.bio || '',
      subscriberCount: updatedCreator.subscriber_count,
      followerCount: updatedCreator.follower_count,
      viewCount: updatedCreator.stats?.viewCount,
      videoCount: updatedCreator.stats?.videoCount,
      matchPercentage: updatedCreator.stats?.matchPercentage,
      categories: updatedCreator.categories || [],
      typicalViews: updatedCreator.stats?.typicalViews,
      engagementRate: updatedCreator.stats?.engagementRate,
      recentGrowth: updatedCreator.stats?.recentGrowth,
      dataSource: updatedCreator.stats?.dataSource || 'Manual',
      geminiBio: updatedCreator.stats?.geminiBio,
      popularVideos: updatedCreator.stats?.popularVideos || [],
      socialPlatforms: updatedCreator.social_stats?.socialPlatforms || ['YouTube'],
      location: updatedCreator.social_stats?.location,
      contactEmail: updatedCreator.contact_email,
      notes: updatedCreator.notes,
      tags: updatedCreator.tags || [],
      status: updatedCreator.status,
      createdAt: updatedCreator.created_at,
      updatedAt: updatedCreator.updated_at,
      addedBy: updatedCreator.user_id
    };

    res.json({
      success: true,
      message: 'Creator updated successfully',
      data: { creator: transformedCreator }
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
    const supabaseUserId = getSupabaseUserId(req.user.id);

    const { error } = await supabase
      .from('creators')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', supabaseUserId);

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

    const supabaseUserId = getSupabaseUserId(req.user.id);

    const creatorsData = creators.map(creator => ({
      user_id: supabaseUserId,
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

    // Transform data from Supabase format to frontend format
    const transformedCreators = newCreators.map(creator => ({
      id: creator.id,
      channelName: creator.channel_name,
      profileImageUrl: creator.avatar_url,
      youtubeChannelUrl: creator.youtube_channel_url,
      instagramUrl: creator.instagram_url,
      tiktokUrl: creator.tiktok_url,
      bio: creator.stats?.bio || '',
      subscriberCount: creator.subscriber_count,
      followerCount: creator.follower_count,
      viewCount: creator.stats?.viewCount,
      videoCount: creator.stats?.videoCount,
      matchPercentage: creator.stats?.matchPercentage,
      categories: creator.categories || [],
      typicalViews: creator.stats?.typicalViews,
      engagementRate: creator.stats?.engagementRate,
      recentGrowth: creator.stats?.recentGrowth,
      dataSource: creator.stats?.dataSource || 'Manual',
      geminiBio: creator.stats?.geminiBio,
      popularVideos: creator.stats?.popularVideos || [],
      socialPlatforms: creator.social_stats?.socialPlatforms || ['YouTube'],
      location: creator.social_stats?.location,
      contactEmail: creator.contact_email,
      notes: creator.notes,
      tags: creator.tags || [],
      status: creator.status,
      createdAt: creator.created_at,
      updatedAt: creator.updated_at,
      addedBy: creator.user_id
    }));

    res.json({
      success: true,
      message: `${newCreators.length} creators saved successfully`,
      data: { creators: transformedCreators }
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