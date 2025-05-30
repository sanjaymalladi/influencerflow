// YouTube API Response Interfaces
export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeLocalized {
  title: string;
  description: string;
}

export interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: YouTubeThumbnails;
  localized?: YouTubeLocalized;
  country?: string;
}

export interface YouTubeChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  hiddenSubscriberCount: boolean;
  videoCount: string;
}

export interface YouTubeChannelBrandingSettingsImage {
  bannerExternalUrl?: string;
}

export interface YouTubeChannelBrandingSettings {
  channel?: {
    title?: string;
    description?: string;
    keywords?: string;
    unsubscribedTrailer?: string;
  };
  image?: YouTubeChannelBrandingSettingsImage;
}

export interface YouTubeChannel {
  kind: "youtube#channel";
  etag: string;
  id: string;
  snippet: YouTubeChannelSnippet;
  statistics: YouTubeChannelStatistics;
  brandingSettings?: YouTubeChannelBrandingSettings;
}

export interface YouTubeSearchItemSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  liveBroadcastContent: string;
}

export interface YouTubeSearchItemId {
  kind: string;
  channelId?: string;
  videoId?: string;
}

export interface YouTubeSearchItem {
  kind: "youtube#searchResult";
  etag: string;
  id: YouTubeSearchItemId;
  snippet: YouTubeSearchItemSnippet;
}

export interface YouTubeSearchListResponse {
  kind: "youtube#searchListResponse";
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeSearchItem[];
}

export interface YouTubeChannelListResponse {
  kind: "youtube#channelListResponse";
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeChannel[];
}

// YouTube Video Interface
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  publishedAt: string;
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
}

// Unified CreatorProfile
export interface CreatorProfile {
  id: string;
  channelName: string;
  profileImageUrl: string;
  youtubeChannelUrl: string | null;
  bio: string;
  subscriberCount: string | null;
  viewCount: string | null;
  videoCount: string | null;
  matchPercentage: number | null;
  categories: string[] | null;
  geminiBio?: string;
  typicalViews: string | null;
  engagementRate: string | null;
  popularVideos?: YouTubeVideo[];
  dataSource: 'YouTube' | 'Gemini' | 'Hybrid (YouTube primary)' | 'Gemini (YouTube lookup failed)';
}

// Intermediate type for what Gemini service returns
export interface GeminiCreatorResponseItem {
  channelName: string;
  bio: string;
  youtubeChannelUrl: string | null;
  matchPercentage: number | null;
  followers: string | null;
  typicalViews: string | null;
  engagementRate: string | null;
  categories: string[] | null;
} 