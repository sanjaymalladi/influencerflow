import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Zap, 
  Flag, 
  Users, 
  Eye, 
  Video, 
  TrendingUp, 
  ExternalLink, 
  Youtube,
  Play,
  Sparkles,
  Loader2,
  Heart,
  HeartHandshake,
  Save,
  Check
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useCreatorSearch } from "@/hooks/useCreatorSearch";
import { creatorsAPI } from "@/services/apiService";
import { toast } from "sonner";
import type { CreatorProfile } from "@/types/creator";

const CreatorDatabase = () => {
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [platform, setPlatform] = useState("all-platforms");
  const [size, setSize] = useState("all-sizes");
  const [engagement, setEngagement] = useState("all-engagement");
  const [region, setRegion] = useState("all-regions");
  const [savingCreators, setSavingCreators] = useState<Set<string>>(new Set());
  const [savedCreators, setSavedCreators] = useState<Set<string>>(new Set());

  const {
    creators,
    isLoading,
    error,
    hasSearched,
    searchCreators,
    clearResults,
  } = useCreatorSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    let enhancedQuery = searchQuery;
    
    // Add platform filter to query
    if (platform !== "all-platforms") {
      enhancedQuery += ` on ${platform}`;
    }
    
    // Add size filter to query
    if (size !== "all-sizes") {
      const sizeMap = {
        "micro": "under 100K subscribers",
        "macro": "100K to 1M subscribers", 
        "mega": "over 1M subscribers"
      };
      enhancedQuery += ` with ${sizeMap[size as keyof typeof sizeMap]}`;
    }
    
    // Add engagement filter to query
    if (engagement !== "all-engagement") {
      const engagementMap = {
        "high": "high engagement rate over 5%",
        "medium": "medium engagement rate 2-5%",
        "low": "low engagement rate under 2%"
      };
      enhancedQuery += ` with ${engagementMap[engagement as keyof typeof engagementMap]}`;
    }
    
    await searchCreators(enhancedQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSaveCreator = async (creator: CreatorProfile) => {
    try {
      setSavingCreators(prev => new Set(prev).add(creator.id));
      
      const creatorData = {
        channelName: creator.channelName,
        youtubeChannelUrl: creator.youtubeChannelUrl || '',
        bio: creator.bio || '',
        subscriberCount: creator.subscriberCount || 'N/A',
        categories: creator.categories || [],
        typicalViews: creator.typicalViews || creator.viewCount || 'N/A',
        engagementRate: creator.engagementRate || 'N/A',
        dataSource: creator.dataSource || 'Manual',
        socialPlatforms: ['YouTube'], // Default to YouTube
        location: undefined, // Not available in current type
        pricing: undefined // Could be added later
      };

      await creatorsAPI.saveCreator(creatorData);
      setSavedCreators(prev => new Set(prev).add(creator.id));
      toast.success(`${creator.channelName} saved to your database!`);
    } catch (error: any) {
      console.error('Failed to save creator:', error);
      toast.error(error.response?.data?.error || 'Failed to save creator');
    } finally {
      setSavingCreators(prev => {
        const next = new Set(prev);
        next.delete(creator.id);
        return next;
      });
    }
  };

  const handleSaveSelected = async () => {
    const selectedCreatorObjects = creators.filter(creator => 
      selectedCreators.includes(creator.id)
    );

    if (selectedCreatorObjects.length === 0) {
      toast.error('No creators selected');
      return;
    }

    toast.promise(
      Promise.all(selectedCreatorObjects.map(creator => handleSaveCreator(creator))),
      {
        loading: `Saving ${selectedCreatorObjects.length} creators...`,
        success: `Successfully saved ${selectedCreatorObjects.length} creators!`,
        error: 'Some creators failed to save',
      }
    );

    setSelectedCreators([]);
  };

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

  const toggleCreatorSelection = (creatorId: string) => {
    setSelectedCreators(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  const CreatorCard = ({ creator }: { creator: CreatorProfile }) => {
    const [imageError, setImageError] = useState(false);
    const isSelected = selectedCreators.includes(creator.id);
    const isSaving = savingCreators.has(creator.id);
    const isSaved = savedCreators.has(creator.id);
    
    const fallbackImageUrl = `https://avatar.vercel.sh/${encodeURIComponent(creator.channelName)}?size=80&text=${encodeURIComponent(creator.channelName.substring(0, 2).toUpperCase())}`;

    return (
      <Card className={`h-full hover:shadow-lg transition-all cursor-pointer ${isSelected ? 'ring-2 ring-[#FFE600]' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">View Channel</span>
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {creator.matchPercentage !== null && (
                <Badge className={`${getMatchColor(creator.matchPercentage)} text-xs`}>
                  {creator.matchPercentage}%
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isSaved ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSaved && !isSaving) {
                      handleSaveCreator(creator);
                    }
                  }}
                  disabled={isSaving || isSaved}
                  className={`h-8 w-8 p-0 ${isSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isSaved ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCreatorSelection(creator.id)}
                  className="w-4 h-4 text-[#FFE600] border-gray-300 rounded focus:ring-[#FFE600]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
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
                    ? (creator.videoCount ? formatCount(creator.videoCount) : 'N/A')
                    : (creator.engagementRate || 'N/A')
                  }
                </span>
              </div>
            )}
            
            {creator.dataSource && (
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-xs">
                  {creator.dataSource.split(',')[0]}
                </span>
              </div>
            )}
          </div>

          {/* Categories */}
          {creator.categories && creator.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {creator.categories.slice(0, 3).map((category, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {creator.categories.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{creator.categories.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Bio */}
          {creator.bio && (
            <p className="text-sm text-gray-600 line-clamp-2">{creator.bio}</p>
          )}

          {/* Popular Videos */}
          {creator.popularVideos && creator.popularVideos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#222222] flex items-center gap-2">
                <Play className="w-4 h-4" />
                Popular Videos
              </h4>
              <div className="space-y-1">
                {creator.popularVideos.slice(0, 2).map((video, idx) => (
                  <a
                    key={idx}
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-gray-600 hover:text-blue-600 truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {video.title} ({formatCount(video.viewCount)} views)
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Data Source */}
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span>Source: {creator.dataSource}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#222222] mb-2">Creator Database</h1>
            <p className="text-gray-600">AI-powered creator discovery and management</p>
          </div>
          {hasSearched && (
            <Button 
              onClick={clearResults}
              variant="outline"
              className="rounded-xl font-semibold px-6"
            >
              Clear Results
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="p-6 rounded-2xl border border-gray-200 mb-6">
          <div className="space-y-4">
            {/* Main Search */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFE600]" />
                <span className="text-sm font-medium text-[#222222]">AI Search:</span>
              </div>
              <div className="flex-1 flex gap-3">
                <Input 
                  placeholder="e.g., 'tech reviewers on YouTube', 'travel vloggers in Japan'" 
                  className="rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading || !searchQuery.trim()}
                  className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Creators
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-[#222222]">Filters:</span>
              </div>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-platforms">All Platforms</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-sizes">All Sizes</SelectItem>
                  <SelectItem value="micro">Micro (10K-100K)</SelectItem>
                  <SelectItem value="macro">Macro (100K-1M)</SelectItem>
                  <SelectItem value="mega">Mega (1M+)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={engagement} onValueChange={setEngagement}>
                <SelectTrigger className="w-36 rounded-xl">
                  <SelectValue placeholder="Engagement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-engagement">All Engagement</SelectItem>
                  <SelectItem value="high">High (5%+)</SelectItem>
                  <SelectItem value="medium">Medium (2-5%)</SelectItem>
                  <SelectItem value="low">Low (&lt;2%)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-regions">
                    <div className="flex items-center">
                      <Flag className="w-4 h-4 mr-2" />
                      All Regions
                    </div>
                  </SelectItem>
                  <SelectItem value="us">🇺🇸 United States</SelectItem>
                  <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedCreators.length > 0 && (
            <div className="flex items-center justify-between bg-[#FFE600] bg-opacity-10 p-4 rounded-xl mt-4">
              <span className="font-medium text-[#222222]">
                {selectedCreators.length} creators selected
              </span>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveSelected}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Selected
                </Button>
                <Button className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold">
                  <Zap className="w-4 h-4 mr-2" />
                  Send Outreach
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Results */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-[#FFE600] mb-4" />
            <h3 className="text-xl font-semibold text-[#222222] mb-2">
              Searching for creators...
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Our AI is finding the best content creators that match your criteria. This may take a moment.
            </p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && !error && creators.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#222222]">
                Found {creators.length} Creator{creators.length !== 1 ? 's' : ''}
              </h2>
              <div className="text-sm text-gray-500">
                Results powered by AI and enriched with real-time data
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          </div>
        )}
        
        {!isLoading && creators.length === 0 && hasSearched && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#222222] mb-2">
              No creators found
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your search terms or being more specific about the type of creator you're looking for.
            </p>
          </div>
        )}
        
        {!isLoading && !error && !hasSearched && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FFE600] to-[#E6CF00] rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-[#222222]" />
            </div>
            <h3 className="text-2xl font-bold text-[#222222] mb-3">
              AI-Powered Creator Discovery
            </h3>
            <p className="text-gray-600 max-w-lg mx-auto mb-6">
              Search for content creators using natural language. Our AI will find relevant creators 
              and enrich the results with real YouTube data and popular videos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="block text-[#222222] mb-1">Example searches:</strong>
                <div className="text-gray-600">
                  "Tech reviewers on YouTube"
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="block text-[#222222] mb-1">Be specific:</strong>
                <div className="text-gray-600">
                  "Travel vloggers in Japan"
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="block text-[#222222] mb-1">Include niches:</strong>
                <div className="text-gray-600">
                  "Fitness influencers under 100K"
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorDatabase;
