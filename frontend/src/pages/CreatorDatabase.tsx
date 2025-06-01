import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
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
  Check,
  Database,
  Trash2,
  BarChart3,
  RefreshCw
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { useCreatorSearch } from "@/hooks/useCreatorSearch";
import { creatorsAPI, campaignsAPI, Campaign } from "@/services/apiService";
import { socialBladeService } from "@/services/socialBladeService";
import { toast } from "sonner";
import type { CreatorProfile } from "@/types/creator";

const CreatorDatabase = () => {
  const navigate = useNavigate();
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingCreators, setSavingCreators] = useState<Set<string>>(new Set());
  const [savedCreators, setSavedCreators] = useState<Set<string>>(new Set());
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  
  // New state for saved creators from backend
  const [backendCreators, setBackendCreators] = useState<any[]>([]);
  const [isLoadingBackendCreators, setIsLoadingBackendCreators] = useState(false);
  const [selectedBackendCreators, setSelectedBackendCreators] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("search");
  
  // SocialBlade state
  const [fetchingStats, setFetchingStats] = useState<Set<string>>(new Set());

  const {
    creators,
    isLoading,
    error,
    hasSearched,
    searchCreators,
    clearResults,
  } = useCreatorSearch();

  // Load saved creators from backend
  const loadSavedCreators = async () => {
    try {
      setIsLoadingBackendCreators(true);
      const data = await creatorsAPI.getCreators();
      setBackendCreators(data.creators);
      console.log('Loaded saved creators:', data.creators);
    } catch (error) {
      console.error('Failed to load saved creators:', error);
      toast.error('Failed to load saved creators');
    } finally {
      setIsLoadingBackendCreators(false);
    }
  };

  useEffect(() => {
    loadSavedCreators();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await searchCreators(searchQuery);
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

  const handleSendOutreach = async () => {
    if (selectedCreators.length === 0) {
      toast.error('No creators selected');
      return;
    }
    
    // Load campaigns for selection
    try {
      setIsLoadingCampaigns(true);
      const data = await campaignsAPI.getCampaigns();
      setCampaigns(data.campaigns);
      setIsCampaignDialogOpen(true);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleCampaignSelected = () => {
    if (!selectedCampaignId) {
      toast.error('Please select a campaign');
      return;
    }

    let creatorParams = [];

    // Handle search results creators
    if (selectedCreators.length > 0) {
      const selectedCreatorObjects = creators.filter(creator => 
        selectedCreators.includes(creator.id)
      );
      
      creatorParams = selectedCreatorObjects.map(creator => ({
        id: creator.id,
        name: creator.channelName,
        niche: creator.categories?.join(', ') || ''
      }));
    }

    // Handle saved backend creators
    if (selectedBackendCreators.length > 0) {
      const selectedBackendCreatorObjects = backendCreators.filter(creator => 
        selectedBackendCreators.includes(creator.id)
      );
      
      const backendCreatorParams = selectedBackendCreatorObjects.map(creator => ({
        id: creator.id,
        name: creator.channelName,
        niche: creator.categories?.join(', ') || ''
      }));

      creatorParams = [...creatorParams, ...backendCreatorParams];
    }

    if (creatorParams.length === 0) {
      toast.error('No creators selected');
      return;
    }
    
    // Encode creators data and campaign as URL parameters
    const encodedCreators = encodeURIComponent(JSON.stringify(creatorParams));
    navigate(`/outreach?creators=${encodedCreators}&campaign=${selectedCampaignId}`);
    
    // Reset state
    setIsCampaignDialogOpen(false);
    setSelectedCampaignId("");
    setSelectedCreators([]);
    setSelectedBackendCreators([]);
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

  const toggleBackendCreatorSelection = (creatorId: string) => {
    setSelectedBackendCreators(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  const handleDeleteSavedCreator = async (creatorId: string) => {
    try {
      await creatorsAPI.deleteCreator(creatorId);
      setBackendCreators(prev => prev.filter(c => c.id !== creatorId));
      setSelectedBackendCreators(prev => prev.filter(id => id !== creatorId));
      toast.success('Creator deleted successfully');
    } catch (error) {
      console.error('Failed to delete creator:', error);
      toast.error('Failed to delete creator');
    }
  };

  const handleFetchSocialBladeStats = async (creator: any) => {
    if (!creator.youtubeChannelUrl) {
      toast.error('No YouTube URL available for this creator');
      return;
    }

    try {
      setFetchingStats(prev => new Set(prev).add(creator.id));
      toast.info(`🔍 Fetching real-time stats for ${creator.channelName}...`);

      const stats = await socialBladeService.getYouTubeStats(creator.youtubeChannelUrl);
      
      if (stats) {
        // Update the creator with enhanced stats
        const updatedCreator = {
          ...creator,
          subscriberCount: stats.subscriberCount,
          engagementRate: stats.engagementRate,
          recentGrowth: stats.recentGrowth,
          videoCount: stats.videoCount,
          dataSource: 'SocialBlade (Real-time)',
          updatedAt: new Date().toISOString()
        };

        // Update backend
        await creatorsAPI.updateCreator(creator.id, updatedCreator);
        
        // Update local state
        setBackendCreators(prev => 
          prev.map(c => c.id === creator.id ? updatedCreator : c)
        );

        toast.success(`✅ Updated ${creator.channelName} with real SocialBlade data!`, {
          description: `${stats.subscriberCount} subscribers • ${stats.engagementRate} engagement • ${stats.recentGrowth} recent growth`
        });
      } else {
        toast.error('No SocialBlade data found for this creator');
      }
    } catch (error: any) {
      console.error('Failed to fetch SocialBlade stats:', error);
      toast.error(`Failed to fetch stats: ${error.message}`);
    } finally {
      setFetchingStats(prev => {
        const next = new Set(prev);
        next.delete(creator.id);
        return next;
      });
    }
  };

  const handleSendOutreachToSaved = async () => {
    if (selectedBackendCreators.length === 0) {
      toast.error('No creators selected');
      return;
    }
    
    // Load campaigns for selection
    try {
      setIsLoadingCampaigns(true);
      const data = await campaignsAPI.getCampaigns();
      setCampaigns(data.campaigns);
      setIsCampaignDialogOpen(true);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const SavedCreatorCard = ({ creator }: { creator: any }) => {
    const isSelected = selectedBackendCreators.includes(creator.id);
    
    return (
      <Card 
        className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
          isSelected 
            ? 'border-[#FFE600] bg-[#FFE600] bg-opacity-5' 
            : 'border-gray-200 hover:border-[#FFE600] hover:border-opacity-50'
        } rounded-2xl`}
        onClick={() => toggleBackendCreatorSelection(creator.id)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FFE600] to-[#E6CF00] rounded-full flex items-center justify-center">
              <Youtube className="w-6 h-6 text-[#222222]" />
            </div>
            <div>
              <h3 className="font-bold text-[#222222] text-lg">{creator.channelName}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
                {creator.dataSource?.includes('SocialBlade') && (
                  <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Real-time Stats
                  </Badge>
                )}
                {creator.recentGrowth && (
                  <Badge variant="outline" className={`text-xs ${
                    creator.recentGrowth.startsWith('+') ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'
                  }`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {creator.recentGrowth}
                  </Badge>
                )}
                <span className="text-xs text-gray-500">
                  Added {new Date(creator.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSelected && (
              <div className="w-6 h-6 bg-[#FFE600] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-[#222222]" />
              </div>
            )}
            {creator.youtubeChannelUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFetchSocialBladeStats(creator);
                }}
                disabled={fetchingStats.has(creator.id)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                title="Fetch real-time stats from SocialBlade"
              >
                {fetchingStats.has(creator.id) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSavedCreator(creator.id);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{creator.bio}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="font-bold text-[#222222] text-lg">{formatCount(creator.subscriberCount)}</div>
            <div className="text-xs text-gray-600">Subscribers</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="font-bold text-[#222222] text-lg">{formatCount(creator.typicalViews)}</div>
            <div className="text-xs text-gray-600">Avg Views</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {creator.categories.slice(0, 3).map((category: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {category}
            </Badge>
          ))}
          {creator.categories.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{creator.categories.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>{creator.engagementRate}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Youtube className="w-3 h-3" />
              <span>{creator.dataSource}</span>
            </div>
          </div>
          
          {creator.youtubeChannelUrl && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(creator.youtubeChannelUrl, '_blank');
              }}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Channel
            </Button>
          )}
        </div>
      </Card>
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
        </div>

        {/* Tabs for Search and Saved Creators */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              AI Creator Search
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Saved Creators ({backendCreators.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            {/* Search and Filters */}
            <Card className="p-6 rounded-2xl border border-gray-200">
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
                <Button 
                  onClick={handleSendOutreach}
                  className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
                >
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

          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            {/* Saved Creators Section */}
            <Card className="p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-[#222222]" />
                  </div>
                                  <div>
                  <h2 className="text-2xl font-bold text-[#222222]">Saved Creators</h2>
                  <p className="text-gray-600">Manage your saved creator database</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      SocialBlade Integration Active
                    </Badge>
                  </div>
                </div>
                </div>
                <Button 
                  onClick={loadSavedCreators}
                  variant="outline"
                  className="rounded-xl font-semibold px-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {selectedBackendCreators.length > 0 && (
                <div className="flex items-center justify-between bg-[#FFE600] bg-opacity-10 p-4 rounded-xl mb-6">
                  <span className="font-medium text-[#222222]">
                    {selectedBackendCreators.length} saved creator{selectedBackendCreators.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSendOutreachToSaved}
                      className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Send Outreach
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Saved Creators Results */}
            {isLoadingBackendCreators && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 animate-spin text-[#FFE600] mb-4" />
                <h3 className="text-xl font-semibold text-[#222222] mb-2">
                  Loading saved creators...
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  Fetching your saved creators from the database.
                </p>
              </div>
            )}

            {!isLoadingBackendCreators && backendCreators.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#222222]">
                    {backendCreators.length} Saved Creator{backendCreators.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="text-sm text-gray-500">
                    Select creators to send bulk outreach
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {backendCreators.map((creator) => (
                    <SavedCreatorCard key={creator.id} creator={creator} />
                  ))}
                </div>
              </div>
            )}

            {!isLoadingBackendCreators && backendCreators.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-[#222222] mb-2">
                  No saved creators yet
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Start building your creator database by searching and saving creators from the AI Search tab.
                </p>
                <Button 
                  onClick={() => setActiveTab("search")}
                  className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Start Searching
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Campaign Selection Dialog */}
        <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#222222]">
                Select Campaign for Outreach
              </DialogTitle>
              <DialogDescription>
                Choose a campaign to associate with your outreach to the selected creators.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-[#FFE600] bg-opacity-10 p-4 rounded-xl">
                <p className="text-sm text-[#222222] font-medium">
                  You have selected {selectedCreators.length + selectedBackendCreators.length} creator{(selectedCreators.length + selectedBackendCreators.length) !== 1 ? 's' : ''} for outreach.
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Choose a campaign to associate this outreach with.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-select" className="text-sm font-semibold text-[#222222]">
                  Campaign
                </Label>
                <Select 
                  value={selectedCampaignId}
                  onValueChange={setSelectedCampaignId}
                  disabled={isLoadingCampaigns}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={isLoadingCampaigns ? "Loading campaigns..." : "Select a campaign"} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{campaign.name}</span>
                          <span className="text-xs text-gray-500">
                            Budget: ${campaign.budget.toLocaleString()} • Status: {campaign.status}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCampaignDialogOpen(false);
                    setSelectedCampaignId("");
                  }}
                  className="rounded-xl border-2 border-gray-200 px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCampaignSelected}
                  disabled={!selectedCampaignId || isLoadingCampaigns}
                  className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6"
                >
                  {isLoadingCampaigns ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Continue to Outreach
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CreatorDatabase;
