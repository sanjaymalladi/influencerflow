import type { 
  YouTubeChannel, 
  YouTubeSearchListResponse, 
  YouTubeChannelListResponse 
} from '../types/creator';
import { 
  YOUTUBE_API_KEY, 
  YOUTUBE_SEARCH_BASE_URL, 
  YOUTUBE_CHANNELS_BASE_URL,
  YOUTUBE_CHANNEL_URL_REGEX 
} from '../lib/constants';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default?: { url: string; width: number; height: number; };
    medium?: { url: string; width: number; height: number; };
    high?: { url: string; width: number; height: number; };
  };
  publishedAt: string;
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
}

export const extractChannelIdFromUrl = (url: string): string | null => {
  try {
    const match = url.match(YOUTUBE_CHANNEL_URL_REGEX);
    if (match && match[1]) {
      // For custom URLs and @handles, we can't extract channel ID directly
      // These need to be resolved via search
      if (url.includes('/c/') || url.includes('/@') || url.includes('/user/')) {
        return null;
      }
      return match[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting channel ID from URL:", error);
    return null;
  }
};

export const searchChannelByName = async (channelName: string): Promise<string | null> => {
  if (!YOUTUBE_API_KEY) {
    console.warn("YouTube API key not configured");
    return null;
  }

  try {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: channelName,
      type: 'channel',
      maxResults: '1',
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${YOUTUBE_SEARCH_BASE_URL}?${searchParams}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        console.error("YouTube API quota exceeded or invalid key");
        return null;
      }
      throw new Error(`YouTube search failed: ${response.status}`);
    }

    const data: YouTubeSearchListResponse = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0].id.channelId || null;
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching for channel "${channelName}":`, error);
    return null;
  }
};

export const getChannelDetails = async (channelId: string): Promise<YouTubeChannel | null> => {
  if (!YOUTUBE_API_KEY) {
    console.warn("YouTube API key not configured");
    return null;
  }

  try {
    const searchParams = new URLSearchParams({
      part: 'snippet,statistics,brandingSettings',
      id: channelId,
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${YOUTUBE_CHANNELS_BASE_URL}?${searchParams}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        console.error("YouTube API quota exceeded or invalid key");
        return null;
      }
      throw new Error(`YouTube channel details fetch failed: ${response.status}`);
    }

    const data: YouTubeChannelListResponse = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching details for channel ID "${channelId}":`, error);
    return null;
  }
};

export const getChannelPopularVideos = async (channelId: string, maxResults: number = 3): Promise<YouTubeVideo[]> => {
  if (!YOUTUBE_API_KEY) {
    console.warn("YouTube API key not configured");
    return [];
  }

  try {
    // First, search for videos from this channel, ordered by view count
    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      order: 'viewCount',
      maxResults: maxResults.toString(),
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${YOUTUBE_SEARCH_BASE_URL}?${searchParams}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        console.error("YouTube API quota exceeded or invalid key");
        return [];
      }
      throw new Error(`YouTube video search failed: ${response.status}`);
    }

    const data: YouTubeSearchListResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }

    // Get video IDs to fetch detailed statistics
    const videoIds = data.items.map(item => item.id.videoId).filter(Boolean).join(',');
    
    if (!videoIds) {
      return [];
    }

    // Fetch detailed video statistics
    const videosParams = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoIds,
      key: YOUTUBE_API_KEY,
    });

    const videosResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${videosParams}`);
    
    if (!videosResponse.ok) {
      // If we can't get detailed stats, return basic info
      return data.items.map(item => ({
        id: item.id.videoId || '',
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnails: item.snippet.thumbnails,
        publishedAt: item.snippet.publishedAt,
      }));
    }

    const videosData = await videosResponse.json();
    
    return videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnails: video.snippet.thumbnails,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      commentCount: video.statistics.commentCount,
    }));

  } catch (error) {
    console.error(`Error fetching popular videos for channel ID "${channelId}":`, error);
    return [];
  }
}; 