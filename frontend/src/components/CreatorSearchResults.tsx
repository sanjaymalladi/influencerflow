import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Youtube, Users, Eye, Video, TrendingUp } from "lucide-react";
import type { CreatorProfile } from '../types/creator';

interface CreatorSearchResultsProps {
  creators: CreatorProfile[];
  onAddToOutreach?: (creator: CreatorProfile) => void;
}

const CreatorCard: React.FC<{ 
  creator: CreatorProfile; 
  onAddToOutreach?: (creator: CreatorProfile) => void;
}> = ({ creator, onAddToOutreach }) => {
  const [imageError, setImageError] = useState(false);
  
  const formatCount = (value: string | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    if (value === "Hidden") return "Hidden";
    
    // Check if value is already formatted (contains M, K, B, or %)
    if (typeof value === 'string' && /[MKB%]/.test(value)) {
      return value; // Already formatted by Gemini, return as-is
    }
    
    // Try to parse as number for YouTube API data
    const num = parseInt(value, 10);
    if (isNaN(num)) return value; // If parsing fails, return original value
    
    // Format numeric values
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  };

  const getMatchColor = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return "bg-gray-100 text-gray-800";
    if (percentage >= 75) return "bg-green-100 text-green-800";
    if (percentage >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const fallbackImageUrl = `https://avatar.vercel.sh/${encodeURIComponent(creator.channelName)}?size=80&text=${encodeURIComponent(creator.channelName.substring(0, 2).toUpperCase())}`;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="relative">
            <img 
              className="w-12 h-12 rounded-full object-cover" 
              src={imageError ? fallbackImageUrl : creator.profileImageUrl} 
              alt={`${creator.channelName} avatar`}
              onError={() => setImageError(true)}
            />
            {creator.youtubeChannelUrl && (
              <Youtube className="absolute -bottom-1 -right-1 w-4 h-4 text-red-600 bg-white rounded-full p-0.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#222222] truncate">{creator.channelName}</h3>
            {creator.youtubeChannelUrl && (
              <a 
                href={creator.youtubeChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">View Channel</span>
              </a>
            )}
          </div>
          {creator.matchPercentage !== null && (
            <Badge 
              className={`${getMatchColor(creator.matchPercentage)} text-xs`}
            >
              {creator.matchPercentage}%
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {creator.subscriberCount && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{formatCount(creator.subscriberCount)}</span>
            </div>
          )}
          
          {(creator.viewCount || creator.typicalViews) && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <span className="font-medium">
                {creator.dataSource.includes('YouTube') 
                  ? formatCount(creator.viewCount)
                  : creator.typicalViews || 'N/A'
                }
              </span>
            </div>
          )}
          
          {(creator.videoCount || creator.engagementRate) && (
            <div className="flex items-center gap-2">
              {creator.dataSource.includes('YouTube') ? (
                <Video className="w-4 h-4 text-gray-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-medium">
                {creator.dataSource.includes('YouTube') 
                  ? formatCount(creator.videoCount)
                  : creator.engagementRate || 'N/A'
                }
              </span>
            </div>
          )}
        </div>

        {/* Categories */}
        {creator.categories && creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {creator.categories.slice(0, 3).map(category => (
              <Badge 
                key={category} 
                variant="secondary" 
                className="text-xs bg-blue-50 text-blue-700"
              >
                {category}
              </Badge>
            ))}
            {creator.categories.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600">
                +{creator.categories.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Bio */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {creator.bio || 'No bio available'}
        </p>

        {/* Data source indicator */}
        <div className="text-xs text-gray-400 border-t pt-2">
          Data: {creator.dataSource}
        </div>

        {/* Action Button */}
        {onAddToOutreach && (
          <Button 
            onClick={() => onAddToOutreach(creator)}
            className="w-full bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] font-semibold"
          >
            Add to Outreach
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const CreatorSearchResults: React.FC<CreatorSearchResultsProps> = ({ 
  creators, 
  onAddToOutreach 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#222222]">
          Found {creators.length} Creator{creators.length !== 1 ? 's' : ''}
        </h2>
        {creators.length > 0 && (
          <div className="text-sm text-gray-500">
            Results powered by AI and enriched with real-time data
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map((creator) => (
          <CreatorCard 
            key={creator.id} 
            creator={creator} 
            onAddToOutreach={onAddToOutreach}
          />
        ))}
      </div>
    </div>
  );
}; 