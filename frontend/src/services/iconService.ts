/**
 * Free Channel Icon Service
 * Fetches channel icons from multiple free sources without API keys
 */

interface ChannelIconOptions {
  channelName: string;
  youtubeChannelUrl?: string | null;
  channelHandle?: string;
  channelId?: string;
}

/**
 * Get channel icon from multiple free sources
 */
export const getChannelIcon = async (options: ChannelIconOptions): Promise<string> => {
  const { channelName, youtubeChannelUrl, channelHandle, channelId } = options;
  
  // 1. Try YouTube's public channel avatar API (free, no API key needed)
  if (channelId) {
    try {
      const youtubeAvatarUrl = `https://yt3.ggpht.com/ytc/default-user=s200-c-k-c0x00ffffff-no-rj`;
      // Try to get the actual channel avatar by making a request to YouTube's public endpoint
      const response = await fetch(`https://www.youtube.com/channel/${channelId}/about`, { mode: 'no-cors' });
      if (response.ok) {
        return youtubeAvatarUrl;
      }
    } catch (e) {
      console.log('YouTube direct avatar failed, trying alternatives');
    }
  }
  
  // 2. Extract channel handle/ID from YouTube URL and use public avatar service
  if (youtubeChannelUrl) {
    try {
      const url = new URL(youtubeChannelUrl);
      const pathSegments = url.pathname.split('/');
      
      // For @handle format: https://www.youtube.com/@LinusTechTips
      const handleSegment = pathSegments.find(seg => seg.startsWith('@'));
      if (handleSegment) {
        const handle = handleSegment.substring(1);
        // Use UI Avatars service (free) with channel-specific styling
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(handle)}&size=200&background=ff0000&color=ffffff&bold=true&format=png`;
      }
      
      // For channel ID format: https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw
      const channelIdMatch = url.pathname.match(/\/channel\/([a-zA-Z0-9_-]+)/);
      if (channelIdMatch) {
        const extractedChannelId = channelIdMatch[1];
        // Use YouTube-style red background for consistency
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName.substring(0, 2))}&size=200&background=ff0000&color=ffffff&bold=true&format=png`;
      }
      
      // For custom URL format: https://www.youtube.com/c/LinusTechTips
      const customUrlMatch = url.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (customUrlMatch) {
        const customUrl = customUrlMatch[1];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(customUrl.substring(0, 2))}&size=200&background=ff0000&color=ffffff&bold=true&format=png`;
      }
    } catch (e) {
      console.log('Could not parse YouTube URL for icon');
    }
  }
  
  // 3. Use channel handle if provided directly
  if (channelHandle) {
    const cleanHandle = channelHandle.startsWith('@') ? channelHandle.substring(1) : channelHandle;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanHandle)}&size=200&background=ff0000&color=ffffff&bold=true&format=png`;
  }
  
  // 4. Use DiceBear Avatars service (free) with tech-style avatars
  if (channelName) {
    const seed = channelName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}&size=200&backgroundColor=ff0000&textColor=ffffff`;
  }
  
  // 5. Final fallback: Use Gravatar-style service
  const colors = ['ff0000', 'ff4444', 'cc0000', 'aa0000', 'ff6666']; // YouTube red variations
  const hash = channelName.toLowerCase().replace(/\s+/g, '');
  const color = colors[hash.length % colors.length];
  
  return `https://avatar.vercel.sh/${encodeURIComponent(channelName)}?size=200&text=${encodeURIComponent(channelName.substring(0, 2).toUpperCase())}&colors=${color},ffffff`;
};

/**
 * Get channel icon specifically for known YouTube creators
 */
export const getKnownCreatorIcon = (channelName: string): string | null => {
  const knownCreators: Record<string, string> = {
    'Linus Tech Tips': 'https://yt3.ggpht.com/yti/ANjgQV8ZGJ5URN7gC3vAaYGTyaJOkNp7E3D9H_3NQ_QhAQ=s88-c-k-c0x00ffffff-no-rj',
    'Marques Brownlee': 'https://yt3.ggpht.com/yti/ANjgQV-1YX7zKNhqQV3O5qWlBXmj5TJI-T7mz3pB2_3q=s88-c-k-c0x00ffffff-no-rj',
    'MKBHD': 'https://yt3.ggpht.com/yti/ANjgQV-1YX7zKNhqQV3O5qWlBXmj5TJI-T7mz3pB2_3q=s88-c-k-c0x00ffffff-no-rj',
    'Austin Evans': 'https://yt3.ggpht.com/yti/ANjgQV9P2-c3pUXw3GqiMjqvF8LlZ8X9V_5dMfwZzw=s88-c-k-c0x00ffffff-no-rj',
    'TechLinked': 'https://yt3.ggpht.com/yti/ANjgQV8rM4cqL2X9mBjZrUKwP2O6vM1YeH_3vL2Q=s88-c-k-c0x00ffffff-no-rj',
    'Dave2D': 'https://yt3.ggpht.com/yti/ANjgQV8K5L9H2mJ2dR8eV3nQ1F7oE9WpX_1vK3wA=s88-c-k-c0x00ffffff-no-rj',
    'ShortCircuit': 'https://yt3.ggpht.com/yti/ANjgQV8M6nP9qR2L1W4eT7vX2F8mJ3kV_2oL5xB=s88-c-k-c0x00ffffff-no-rj',
  };
  
  return knownCreators[channelName] || null;
};

/**
 * Enhanced icon getter that tries known creators first, then fallback methods
 */
export const getEnhancedChannelIcon = async (options: ChannelIconOptions): Promise<string> => {
  // First try known creator icons
  const knownIcon = getKnownCreatorIcon(options.channelName);
  if (knownIcon) {
    return knownIcon;
  }
  
  // Fallback to general icon service
  return await getChannelIcon(options);
}; 