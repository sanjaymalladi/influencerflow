import React from 'react';
import { Users, Eye, TrendingUp, ExternalLink, Sparkles, Database, CheckSquare, Square } from 'lucide-react';
import type { CreatorProfile } from '../../types/creator';

interface CreatorSearchResultsProps {
  creators: CreatorProfile[];
  loading: boolean;
  error: string | null;
  onSelect: (creator: CreatorProfile) => void;
  selectedCreators: CreatorProfile[];
}

interface CreatorCardProps {
  creator: CreatorProfile;
  onSelect: (creator: CreatorProfile) => void;
  isSelected: boolean;
}

const CreatorCard = ({ creator, onSelect, isSelected }: CreatorCardProps) => {
  const hasMatchPercentage = creator.matchPercentage !== null && creator.matchPercentage !== undefined;
  const matchPercentage = hasMatchPercentage ? creator.matchPercentage : 0;
  
  // Determine data source for display
  const isEstimated = creator.dataSource === 'Gemini' || creator.dataSource === 'Gemini (YouTube lookup failed)';

  return (
    <div className={`bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="p-6">
        {/* Header with checkbox and match percentage */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelect(creator)}
              className="flex items-center justify-center w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-500 transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            <div className="flex items-center gap-3">
              {creator.profileImageUrl && (
                <img
                  src={creator.profileImageUrl}
                  alt={creator.channelName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {creator.channelName}
                </h3>
                {creator.youtubeChannelUrl && (
                  <a
                    href={creator.youtubeChannelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Channel <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {hasMatchPercentage && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{matchPercentage}%</div>
                <div className="text-xs text-gray-500">Match</div>
              </div>
            </div>
          )}
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            {creator.bio}
          </p>
        )}

        {/* Creator Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {creator.subscriberCount || 'N/A'}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {creator.typicalViews || 'N/A'}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {creator.engagementRate || 'N/A'}
          </span>
        </div>

        {/* Data Source Indicator */}
        <div className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full mb-4 ${
          isEstimated 
            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {isEstimated ? (
            <>
              <Sparkles className="w-3 h-3" />
              <span>AI Estimated Stats</span>
            </>
          ) : (
            <>
              <Database className="w-3 h-3" />
              <span>Live YouTube Data</span>
            </>
          )}
        </div>

        {/* Categories */}
        {creator.categories && creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {creator.categories.map((category, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {category}
              </span>
            ))}
          </div>
        )}

        {/* Popular Videos */}
        {creator.popularVideos && creator.popularVideos.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Popular Videos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {creator.popularVideos.slice(0, 4).map((video, idx) => (
                <div key={idx} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                  {video.thumbnails?.medium && (
                    <img
                      src={video.thumbnails.medium.url}
                      alt={video.title}
                      className="w-16 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                      {video.title}
                    </h5>
                    <p className="text-xs text-gray-500 mt-1">
                      {video.viewCount || 'N/A'} views
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreatorSearchResults: React.FC<CreatorSearchResultsProps> = ({
  creators,
  loading,
  error,
  onSelect,
  selectedCreators
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          No creators found. Try a different search query.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Found {creators.length} creator{creators.length !== 1 ? 's' : ''}
        </h2>
        {selectedCreators.length > 0 && (
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {selectedCreators.length} selected for outreach
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {creators.map((creator, idx) => (
          <CreatorCard
            key={`${creator.channelName}-${idx}`}
            creator={creator}
            onSelect={onSelect}
            isSelected={selectedCreators.some(selected => selected.channelName === creator.channelName)}
          />
        ))}
      </div>
    </div>
  );
};

export default CreatorSearchResults; 