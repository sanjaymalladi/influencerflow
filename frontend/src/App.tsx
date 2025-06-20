import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import RealNegotiationAgent from './components/RealNegotiationAgent';
import VoiceAssistant from './components/VoiceAssistant';
import { getApiUrl } from '@/lib/constants';

// Magic UI Components
import { MagicCard } from "@/components/ui/magic-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedTerminal } from "@/components/ui/animated-terminal";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { CustomSpinner } from "@/components/ui/custom-spinner";



// API configuration for development/production
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? '/api' : 'https://influencerflow.onrender.com/api';

interface Creator {
  id: string;
  creatorId: string;
  name: string;
  platform: string;
  platforms: string[];
  description: string;
  bio: string;
  url?: string;
  youtubeChannelUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  channelUrl: string;
  subscribers?: string;
  subscriberCount?: number;
  followerCount?: number;
  avgViews?: string;
  viewCount?: number;
  videoCount?: number;
  niche: string;
  categories: string[];
  profileImageUrl?: string;
  email?: string;
  stats: {
    avgViewsPerVideo?: number;
    avgLikesPerPost?: number;
    engagementRate: string;
    totalViews?: number;
    totalPosts?: number;
    videosUploaded?: number;
    storiesPerWeek?: number;
    reelsPerMonth?: number;
  };
  estimatedPricing?: {
    sponsoredVideo?: number;
    sponsored_post?: number;
    sponsored_story?: number;
    sponsored_reel?: number;
    currency?: string;
  };
  pricing?: {
    sponsoredVideo?: number;
    sponsored_post?: number;
    postPrice?: number;
    storyPrice?: number;
    reelPrice?: number;
    productPlacement?: number;
    channelMembership?: number;
    currency?: string;
  };
  campaignMatch?: {
    audienceAlignment: number;
    contentStyle: number;
    brandSafety: number;
    overallMatch: number;
  };
  matchPercentage: number;
  dataSource: string;
  location: string;
  verifiedStatus: string;
}

interface CampaignData {
  campaignId: string;
  briefSummary: string;
  targetAudience: string;
  keyTalkingPoints: string[];
  budget?: number;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [results, setResults] = useState<Creator[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showNegotiationInterface, setShowNegotiationInterface] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
  };

  const handleStartCampaign = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a campaign brief file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    addLog("📄 Processing campaign brief...");

    try {
      const formData = new FormData();
      formData.append('campaignBrief', file);

      const response = await fetch(getApiUrl('/api/ai-campaign/process-brief'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCampaignData(data.data);
        addLog("✅ Campaign brief processed successfully");
        addLog("🤖 AI analyzing campaign requirements...");
        
        // Auto-trigger creator search
        await searchCreators(data.data);
      } else {
        throw new Error(data.message || 'Failed to process campaign brief');
      }
    } catch (error) {
      console.error('Error processing campaign:', error);
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const searchCreators = async (campaign: CampaignData) => {
    addLog("🔍 Searching for matching creators...");
    
    try {
      const response = await fetch(getApiUrl('/api/ai-campaign/find-creators'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaign.campaignId,
          targetAudience: campaign.targetAudience,
          briefSummary: campaign.briefSummary,
          keyTalkingPoints: campaign.keyTalkingPoints,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setResults(data.data);
        addLog(`✅ Found ${data.data.length} potential creators`);
        addLog("📊 Calculating campaign compatibility scores...");
        
        toast({
          title: "Creators found!",
          description: `Found ${data.data.length} creators matching your campaign criteria.`,
        });
      } else {
        throw new Error(data.message || 'No creators found');
      }
    } catch (error) {
      console.error('Error finding creators:', error);
      addLog(`❌ Creator search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to find creators",
        variant: "destructive",
      });
    }
  };

  const handleSelectCreator = (creatorId: string) => {
    setSelectedCreators(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  const handleStartOutreach = async () => {
    if (selectedCreators.length === 0) {
      toast({
        title: "No creators selected",
        description: "Please select at least one creator to start outreach.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    addLog(`📧 Starting outreach to ${selectedCreators.length} creators...`);

    try {
      const selectedCreatorData = results.filter(creator => 
        selectedCreators.includes(creator.creatorId)
      );

      const outreachPromises = selectedCreatorData.map(async (creator) => {
        const response = await fetch(getApiUrl('/api/ai-campaign/start-outreach'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: campaignData?.campaignId,
            creatorId: creator.creatorId,
            creatorName: creator.name,
            creatorEmail: creator.email,
            campaignBrief: campaignData?.briefSummary,
            targetAudience: campaignData?.targetAudience,
          }),
        });

        const data = await response.json();
        return { creator: creator.name, success: data.success, data };
      });

      const results_outreach = await Promise.all(outreachPromises);
      const successful = results_outreach.filter(r => r.success).length;
      
      addLog(`✅ Outreach completed: ${successful}/${selectedCreators.length} emails sent`);
      
      toast({
        title: "Outreach completed",
        description: `Successfully sent emails to ${successful} out of ${selectedCreators.length} creators.`,
      });
    } catch (error) {
      console.error('Error starting outreach:', error);
      addLog(`❌ Outreach failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Outreach failed",
        description: error instanceof Error ? error.message : "Failed to start outreach",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNegotiation = () => {
    setShowNegotiationInterface(true);
    addLog("🤖 AI Negotiations interface opened");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold mb-2">
            <AnimatedGradientText className="text-4xl font-bold">
              InfluencerFlow
            </AnimatedGradientText>
          </h1>
          <p className="text-lg text-gray-600">Your Autonomous AI-Powered Campaign Manager</p>
                     {/* Removed border beam for cleaner look */}
        </div>

        {/* Creator Search Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Creator Search Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Follower Range: 50,000 - 50,00,000</Label>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Min Followers" className="flex-1" />
                  <Input placeholder="Max Followers" className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Start Your Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Campaign Brief</Label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FFE600] transition-colors"
                    >
                      <p className="text-gray-600">
                        {file ? file.name : 'Browse... No file selected.'}
                      </p>
                    </div>
                  </div>
                  <ShimmerButton 
                    onClick={handleStartCampaign} 
                    disabled={!file || isProcessing}
                    className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] border-0"
                    background="linear-gradient(135deg, #FFE600 0%, #FF8C00 100%)"
                    shimmerColor="#ffffff"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <CustomSpinner size="xs" color="#222222" />
                        Processing...
                      </span>
                    ) : (
                      "🚀 Start AI Campaign"
                    )}
                  </ShimmerButton>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Agent Logs - Enhanced with Magic UI */}
        <Card className="mb-6 relative overflow-hidden">
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <span className="relative">
                🤖 AI Agent Console
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25"></div>
              </span>
            </CardTitle>
                         {/* Removed border beam for better performance */}
          </CardHeader>
          <CardContent className="p-0">
            <AnimatedTerminal 
              logs={logs} 
              height="h-80"
              showProgress={true}
              className="p-6"
            />
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>2. Review AI-Discovered Creators ({results.length} found)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {results.map((creator) => (
                  <MagicCard
                    key={creator.creatorId}
                    className={`cursor-pointer transition-all p-0 ${
                      selectedCreators.includes(creator.creatorId)
                        ? 'border-[#FFE600] bg-[#FFF9E6] shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    gradientColor={selectedCreators.includes(creator.creatorId) ? "#FFE600" : "#262626"}
                    gradientOpacity={0.1}
                  >
                    <div 
                      onClick={() => handleSelectCreator(creator.creatorId)}
                      className="p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={creator.profileImageUrl || '/placeholder.svg'}
                        alt={creator.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{creator.name}</h3>
                        
                        {/* Platform Badges */}
                        <div className="flex items-center gap-2 mb-2">
                          {creator.youtubeChannelUrl || creator.platform === 'YouTube' || creator.platforms?.includes('YouTube') ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a2.998 2.998 0 0 0-2.11-2.124C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.388.516A2.998 2.998 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.998 2.998 0 0 0 2.11 2.124c1.883.516 9.388.516 9.388.516s7.505 0 9.388-.516a2.998 2.998 0 0 0 2.11-2.124C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              YouTube
                            </div>
                          ) : null}
                          
                          {creator.instagramUrl || creator.platform === 'Instagram' || creator.platforms?.includes('Instagram') ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.44z"/>
                              </svg>
                              Instagram
                            </div>
                          ) : null}
                          
                          {creator.tiktokUrl || creator.platform === 'TikTok' || creator.platforms?.includes('TikTok') ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-black text-white text-xs rounded-full">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                              </svg>
                              TikTok
                            </div>
                          ) : null}
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {creator.categories?.slice(0, 2).map((category, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">
                          {creator.platform === 'YouTube' ? 'Subscribers' : 'Followers'}
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {creator.subscriberCount || creator.followerCount ? 
                            <NumberTicker 
                              value={creator.subscriberCount || creator.followerCount || 0} 
                              className="text-lg font-semibold text-gray-900" 
                            /> : 
                            creator.subscribers || 'N/A'
                          }
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">Engagement</div>
                        <div className="text-lg font-semibold text-green-600">
                          <AnimatedGradientText className="text-lg font-semibold text-green-600" gradient="linear-gradient(to right, #10B981, #065F46, #10B981)">
                          {creator.stats.engagementRate}
                          </AnimatedGradientText>
                        </div>
                      </div>
                    </div>

                    {/* Platform-specific stats */}
                    {creator.platform === 'YouTube' && (
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">Avg Views:</span>
                          <span className="ml-1 font-medium">
                            {creator.stats.avgViewsPerVideo?.toLocaleString() || creator.avgViews || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Videos:</span>
                          <span className="ml-1 font-medium">{creator.videoCount?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    {creator.platform === 'Instagram' && (
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">Avg Likes:</span>
                          <span className="ml-1 font-medium">
                            {creator.stats.avgLikesPerPost?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Posts:</span>
                          <span className="ml-1 font-medium">{creator.stats.totalPosts?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    {/* Campaign Match Score */}
                    {creator.campaignMatch && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Campaign Match</span>
                          <span className="text-lg font-semibold text-[#FFE600]">
                            <NumberTicker 
                              value={creator.campaignMatch.overallMatch} 
                              className="text-lg font-semibold text-[#FFE600]" 
                            />%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#FFE600] h-2 rounded-full transition-all"
                            style={{ width: `${creator.campaignMatch.overallMatch}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Estimated Cost</div>
                      <div className="text-lg font-semibold text-blue-600">
                        ₹{(creator.estimatedPricing?.sponsoredVideo || creator.estimatedPricing?.sponsored_post || creator.pricing?.sponsoredVideo || creator.pricing?.sponsored_post || creator.pricing?.postPrice || 'N/A')}
                        <span className="text-sm text-gray-500 ml-1">
                          {creator.platform === 'YouTube' ? '/video' : '/post'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <a 
                        href={creator.youtubeChannelUrl || creator.instagramUrl || creator.channelUrl || creator.url || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        View Profile
                      </a>
                      {creator.email && (
                        <button className="px-3 py-2 text-sm bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-lg transition-colors">
                          Contact
                        </button>
                      )}
                    </div>

                    {/* Location & Source */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span>📍 {creator.location}</span>
                      <span>{creator.dataSource}</span>
                    </div>
                  </div>
                  </MagicCard>
                ))}
              </div>
              <div className="flex gap-4 mt-4">
                <ShimmerButton 
                  onClick={handleStartNegotiation}
                  disabled={!campaignData || isProcessing}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white border-0"
                  background="linear-gradient(135deg, #1f2937 0%, #374151 100%)"
                  shimmerColor="#ffffff"
                >
                  🤖 Open Outreach & Negotiations
                </ShimmerButton>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Negotiations Interface - Integrated directly */}
        {showNegotiationInterface && campaignData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                🤖 AI-Powered Negotiations
                <Button 
                  variant="outline"
                  onClick={() => setShowNegotiationInterface(false)}
                  size="sm"
                >
                  Hide Negotiations
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RealNegotiationAgent 
                initialContact={{
                  id: results.find(c => selectedCreators.includes(c.creatorId))?.creatorId || 'default-creator',
                  name: results.find(c => selectedCreators.includes(c.creatorId))?.name || 'Selected Creator',
                  email: results.find(c => selectedCreators.includes(c.creatorId))?.email || 'sanjaymallladi12@gmail.com'
                }}
                initialCampaign={{
                  id: campaignData.campaignId,
                  name: campaignData.briefSummary,
                  description: campaignData.targetAudience,
                  initialPromptTemplate: `Hi {contactName}, I hope this email finds you well! I'm reaching out about an exciting collaboration opportunity with ${campaignData.briefSummary}.`
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Toaster />
      
      {/* Voice Assistant - Always available in corner */}
      <VoiceAssistant 
        creatorName={results.find(c => selectedCreators.includes(c.creatorId))?.name || "Selected Creator"}
        campaignTitle={campaignData?.briefSummary || "Current Campaign"}
        negotiationContext={{
          budget: campaignData?.budget || 2075000,
          deliverables: ["Instagram Posts", "Stories", "Reels"],
          timeline: "2 weeks"
        }}
        campaignData={{
          campaignId: campaignData?.campaignId,
          briefSummary: campaignData?.briefSummary,
          targetAudience: campaignData?.targetAudience,
          keyTalkingPoints: campaignData?.keyTalkingPoints,
          budget: campaignData?.budget || 2075000,
          timeline: "2 weeks"
        }}
        selectedCreators={selectedCreators.map(id => {
          const creator = results.find(c => c.creatorId === id);
          return creator ? {
            id: creator.creatorId,
            name: creator.name,
            platform: creator.platform,
            followers: creator.subscriberCount || creator.followerCount || 0,
            engagement: creator.stats.engagementRate,
            pricing: creator.estimatedPricing?.sponsoredVideo || creator.estimatedPricing?.sponsored_post || creator.pricing?.sponsoredVideo || creator.pricing?.sponsored_post || creator.pricing?.postPrice,
            email: creator.email
          } : {
            id: id,
            name: "Unknown Creator",
            platform: "Unknown",
            followers: 0,
            engagement: "N/A",
            email: undefined
          };
        })}
      />
    </div>
  );
};

export default App;
