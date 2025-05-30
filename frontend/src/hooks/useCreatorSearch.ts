import { useState, useCallback } from 'react';
import type { CreatorProfile, GeminiCreatorResponseItem, YouTubeChannel } from '../types/creator';
import { searchCreatorsWithGemini } from '../services/geminiService';
import { getChannelDetails, searchChannelByName, extractChannelIdFromUrl, getChannelPopularVideos } from '../services/youtubeService';
import { getEnhancedChannelIcon } from '../services/iconService';
import { YOUTUBE_API_KEY, DEFAULT_ERROR_MESSAGE } from '../lib/constants';

interface UseCreatorSearchReturn {
  creators: CreatorProfile[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  searchCreators: (query: string) => Promise<void>;
  clearResults: () => void;
}

const mapToCreatorProfile = async (
  geminiItem: GeminiCreatorResponseItem,
  youtubeChannelData: YouTubeChannel | null
): Promise<CreatorProfile> => {
  // Add debug logging for Gemini data
  console.log('🔍 Mapping Gemini item:', {
    channelName: geminiItem.channelName,
    followers: geminiItem.followers,
    typicalViews: geminiItem.typicalViews,
    engagementRate: geminiItem.engagementRate,
    matchPercentage: geminiItem.matchPercentage
  });

  if (youtubeChannelData) {
    const officialProfileUrl = youtubeChannelData.snippet.thumbnails?.high?.url ||
                               youtubeChannelData.snippet.thumbnails?.medium?.url ||
                               youtubeChannelData.snippet.thumbnails?.default?.url ||
                               await getEnhancedChannelIcon({
                                 channelName: youtubeChannelData.snippet.title,
                                 youtubeChannelUrl: `https://www.youtube.com/channel/${youtubeChannelData.id}`,
                                 channelId: youtubeChannelData.id
                               });
    
    console.log(`✅ YouTube channel "${youtubeChannelData.snippet.title}" image URL:`, officialProfileUrl);
    
    // Fetch popular videos for this channel
    const popularVideos = await getChannelPopularVideos(youtubeChannelData.id, 3);
    
    // Format subscriber count properly
    const subCount = youtubeChannelData.statistics.hiddenSubscriberCount 
      ? "Hidden" 
      : formatCount(parseInt(youtubeChannelData.statistics.subscriberCount));
    
    return {
      id: youtubeChannelData.id,
      channelName: youtubeChannelData.snippet.title,
      profileImageUrl: officialProfileUrl,
      youtubeChannelUrl: `https://www.youtube.com/channel/${youtubeChannelData.id}`,
      bio: youtubeChannelData.snippet.description || geminiItem.bio,
      subscriberCount: subCount,
      viewCount: formatCount(parseInt(youtubeChannelData.statistics.viewCount)),
      videoCount: youtubeChannelData.statistics.videoCount,
      matchPercentage: geminiItem.matchPercentage,
      categories: geminiItem.categories,
      geminiBio: geminiItem.bio,
      typicalViews: geminiItem.typicalViews,
      engagementRate: geminiItem.engagementRate,
      popularVideos: popularVideos,
      dataSource: 'Hybrid (YouTube primary)',
    };
  } else {
    const channelName = geminiItem.channelName || 'Unknown Channel';
    const channelIcon = await getEnhancedChannelIcon({
      channelName,
      youtubeChannelUrl: geminiItem.youtubeChannelUrl
    });
    
    console.log(`🎨 Gemini channel "${channelName}" using icon:`, channelIcon);
    console.log(`📊 Gemini stats - Subscribers: ${geminiItem.followers}, Views: ${geminiItem.typicalViews}, Engagement: ${geminiItem.engagementRate}`);
    
    return {
      id: channelName.replace(/\s+/g, '-').toLowerCase() + Date.now(),
      channelName: channelName,
      profileImageUrl: channelIcon,
      youtubeChannelUrl: geminiItem.youtubeChannelUrl,
      bio: geminiItem.bio,
      subscriberCount: geminiItem.followers, // This should now show the correct values
      viewCount: null,
      videoCount: null,
      matchPercentage: geminiItem.matchPercentage,
      categories: geminiItem.categories,
      typicalViews: geminiItem.typicalViews,
      engagementRate: geminiItem.engagementRate,
      popularVideos: [],
      dataSource: youtubeChannelData === null && YOUTUBE_API_KEY ? 'Gemini (YouTube lookup failed)' : 'Gemini',
    };
  }
};

// Helper function to format large numbers
const formatCount = (count: number): string => {
  if (count >= 1000000000) {
    return (count / 1000000000).toFixed(1) + 'B';
  } else if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

export const useCreatorSearch = (): UseCreatorSearchReturn => {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const searchCreators = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setCreators([]);
    setHasSearched(true);
    let currentError = null;

    const youtubeApiKeyAvailable = !!YOUTUBE_API_KEY;
    if (!youtubeApiKeyAvailable) {
      currentError = "YouTube API Key is not configured. Results will be limited to Gemini data only. For richer profiles, please set VITE_YOUTUBE_API_KEY.";
    }

    try {
      const geminiResults = await searchCreatorsWithGemini(query);

      if (geminiResults.length === 0) {
        setError(currentError || "No creators found by Gemini matching your query. Try a different search term.");
        setIsLoading(false);
        return;
      }
      
      if (currentError && !error) setError(currentError);

      const processedCreators: CreatorProfile[] = await Promise.all(
        geminiResults.map(async (geminiItem) => {
          if (!youtubeApiKeyAvailable) {
            return await mapToCreatorProfile(geminiItem, null);
          }

          let channelId: string | null = null;
          if (geminiItem.youtubeChannelUrl) {
            channelId = extractChannelIdFromUrl(geminiItem.youtubeChannelUrl);
            if (!channelId) {
              const pathSegments = new URL(geminiItem.youtubeChannelUrl).pathname.split('/');
              const potentialHandle = pathSegments.find(seg => seg.startsWith('@') || seg === 'c' && pathSegments[pathSegments.indexOf(seg)+1]);
              const nameToSearch = potentialHandle ? (potentialHandle.startsWith('@') ? potentialHandle : pathSegments[pathSegments.indexOf(potentialHandle)+1]) : geminiItem.channelName;
              channelId = await searchChannelByName(nameToSearch);
            }
          } else {
            channelId = await searchChannelByName(geminiItem.channelName);
          }

          if (channelId) {
            const youtubeDetails = await getChannelDetails(channelId);
            return await mapToCreatorProfile(geminiItem, youtubeDetails);
          } else {
            return await mapToCreatorProfile(geminiItem, null);
          }
        })
      );
      
      setCreators(processedCreators);
      if (processedCreators.length === 0 && !error) {
         setError(currentError || "No creators found or YouTube details could not be fetched.");
      }

    } catch (err: any) {
      console.error("Search failed:", err);
      setError(err.message || DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const clearResults = useCallback(() => {
    setCreators([]);
    setError(null);
    setHasSearched(false);
  }, []);

  return {
    creators,
    isLoading,
    error,
    hasSearched,
    searchCreators,
    clearResults,
  };
}; 