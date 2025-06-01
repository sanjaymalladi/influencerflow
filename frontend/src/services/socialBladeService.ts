import axios from 'axios';

// SocialBlade API service
class SocialBladeService {
  private baseURL = '/api/socialblade'; // We'll proxy through our backend to avoid CORS

  // Extract YouTube username from URL or return as-is if it's already a username
  private extractYouTubeUsername(input: string): string {
    try {
      // Handle various YouTube URL formats
      if (input.includes('youtube.com') || input.includes('youtu.be')) {
        const url = new URL(input);
        
        // Handle @username format: youtube.com/@username
        if (url.pathname.startsWith('/@')) {
          return url.pathname.slice(2); // Remove /@
        }
        
        // Handle channel format: youtube.com/channel/CHANNELID
        if (url.pathname.startsWith('/channel/')) {
          return url.pathname.split('/channel/')[1];
        }
        
        // Handle c/ format: youtube.com/c/username
        if (url.pathname.startsWith('/c/')) {
          return url.pathname.split('/c/')[1];
        }
        
        // Handle user format: youtube.com/user/username
        if (url.pathname.startsWith('/user/')) {
          return url.pathname.split('/user/')[1];
        }
        
        // Handle direct username: youtube.com/username
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (pathSegments.length === 1) {
          return pathSegments[0];
        }
      }
      
      // If it's not a URL, assume it's already a username
      return input.replace('@', ''); // Remove @ if present
    } catch (error) {
      console.warn('Failed to parse YouTube URL, using as username:', input);
      return input.replace('@', '');
    }
  }

  // Format follower count to readable format (e.g., 1.5M, 123K)
  private formatCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  // Calculate engagement rate from stats
  private calculateEngagementRate(stats: any): string {
    try {
      if (!stats.table || stats.table.length === 0) return 'N/A';
      
      // Get recent data (last 7 days)
      const recentData = stats.table.slice(-7);
      const avgFollowersDelta = recentData.reduce((sum: number, day: any) => sum + (day.followersDelta || 0), 0) / recentData.length;
      const currentFollowers = stats.table[stats.table.length - 1]?.followers || 0;
      
      if (currentFollowers > 0) {
        const engagementRate = (avgFollowersDelta / currentFollowers) * 100;
        return Math.max(0, engagementRate).toFixed(2) + '%';
      }
      
      return 'N/A';
    } catch (error) {
      console.warn('Failed to calculate engagement rate:', error);
      return 'N/A';
    }
  }

  // Get YouTube statistics for a creator
  async getYouTubeStats(youtubeUrl: string): Promise<{
    subscriberCount: string;
    viewCount: string;
    videoCount: string;
    engagementRate: string;
    recentGrowth: string;
    rawData: any;
  } | null> {
    try {
      const username = this.extractYouTubeUsername(youtubeUrl);
      console.log('Fetching SocialBlade stats for:', username);

      // Make request through our backend proxy
      const response = await axios.post(this.baseURL, {
        source: 'youtube',
        username: username,
        cookie: '27a201068826c051d9d4e4414828e2e64067f01e739b16af8ad8a34d40648a4c'
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const stats = response.data.success ? response.data.data : response.data;
      
      if (!stats || !stats.table || stats.table.length === 0) {
        console.warn('No SocialBlade data found for:', username);
        return null;
      }

      // Get the latest data point
      const latestData = stats.table[stats.table.length - 1];
      
      // Calculate recent growth (last 7 days)
      const recentData = stats.table.slice(-7);
      const totalGrowth = recentData.reduce((sum: number, day: any) => sum + (day.followersDelta || 0), 0);
      
      return {
        subscriberCount: this.formatCount(latestData.followers || 0),
        viewCount: latestData.totalViews ? this.formatCount(latestData.totalViews) : 'N/A',
        videoCount: latestData.posts ? latestData.posts.toString() : 'N/A',
        engagementRate: this.calculateEngagementRate(stats),
        recentGrowth: totalGrowth >= 0 ? `+${this.formatCount(totalGrowth)}` : this.formatCount(totalGrowth),
        rawData: stats
      };
    } catch (error) {
      console.error('SocialBlade API error:', error);
      return null;
    }
  }

  // Enhance creator data with SocialBlade stats
  async enhanceCreatorWithStats(creator: {
    channelName: string;
    youtubeChannelUrl?: string;
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    engagementRate?: string;
  }) {
    if (!creator.youtubeChannelUrl) {
      return { ...creator, dataSource: 'Manual' };
    }

    try {
      console.log(`🔍 Fetching real stats for ${creator.channelName}...`);
      const stats = await this.getYouTubeStats(creator.youtubeChannelUrl);
      
      if (stats) {
        return {
          ...creator,
          subscriberCount: stats.subscriberCount,
          viewCount: stats.viewCount,
          videoCount: stats.videoCount,
          engagementRate: stats.engagementRate,
          recentGrowth: stats.recentGrowth,
          dataSource: 'SocialBlade + Manual',
          socialBladeData: stats.rawData,
          updatedAt: new Date().toISOString()
        };
      } else {
        return { ...creator, dataSource: 'Manual (SocialBlade failed)' };
      }
    } catch (error) {
      console.error('Failed to enhance creator with SocialBlade stats:', error);
      return { ...creator, dataSource: 'Manual (SocialBlade error)' };
    }
  }

  // Bulk enhance multiple creators
  async enhanceMultipleCreators(creators: Array<{
    channelName: string;
    youtubeChannelUrl?: string;
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    engagementRate?: string;
  }>) {
    console.log(`🚀 Enhancing ${creators.length} creators with SocialBlade data...`);
    
    const enhancedCreators = [];
    for (const creator of creators) {
      try {
        const enhanced = await this.enhanceCreatorWithStats(creator);
        enhancedCreators.push(enhanced);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to enhance ${creator.channelName}:`, error);
        enhancedCreators.push({ ...creator, dataSource: 'Manual (SocialBlade error)' });
      }
    }
    
    return enhancedCreators;
  }
}

export const socialBladeService = new SocialBladeService();
export default socialBladeService; 