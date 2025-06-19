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

      const response = await fetch('/api/ai-campaign/process-brief', {
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
      const response = await fetch('/api/ai-campaign/find-creators', {
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
        const response = await fetch('/api/ai-campaign/start-outreach', {
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#222222] mb-2">InfluencerFlow</h1>
          <p className="text-lg text-gray-600">Your Autonomous AI-Powered Campaign Manager</p>
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
                  <Button 
                    onClick={handleStartCampaign} 
                    disabled={!file || isProcessing}
                    className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222]"
                  >
                    {isProcessing ? "🔄 Processing..." : "🚀 Start AI Campaign"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Agent Logs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Agent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-48 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500">AI agents ready... Upload a campaign brief to begin.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
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
                  <div
                    key={creator.creatorId}
                    onClick={() => handleSelectCreator(creator.creatorId)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedCreators.includes(creator.creatorId)
                        ? 'border-[#FFE600] bg-[#FFF9E6] shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
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
                        <p className="text-sm text-gray-600 mb-2">
                          {creator.platforms?.join(', ') || creator.platform}
                        </p>
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
                          {creator.subscriberCount ? 
                            creator.subscriberCount.toLocaleString() : 
                            creator.followerCount?.toLocaleString() || creator.subscribers || 'N/A'
                          }
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">Engagement</div>
                        <div className="text-lg font-semibold text-green-600">
                          {creator.stats.engagementRate}
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
                            {creator.campaignMatch.overallMatch}%
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
                        ${(creator.estimatedPricing?.sponsoredVideo || creator.estimatedPricing?.sponsored_post || creator.pricing?.sponsoredVideo || creator.pricing?.sponsored_post || creator.pricing?.postPrice || 'N/A')}
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
                ))}
              </div>
              <div className="flex gap-4 mt-4">
                <Button 
                  onClick={handleStartOutreach} 
                  disabled={selectedCreators.length === 0 || isProcessing}
                  className="flex-1"
                >
                  Start Outreach ({selectedCreators.length} selected)
                </Button>
                <Button 
                  onClick={handleStartNegotiation}
                  disabled={!campaignData || isProcessing}
                  variant="secondary"
                  className="flex-1"
                >
                  🤖 Open AI Negotiations
                </Button>
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
        creatorName="Selected Creator"
        campaignTitle="Current Campaign"
        negotiationContext={{
          budget: 25000,
          deliverables: ["Instagram Posts", "Stories", "Reels"],
          timeline: "2 weeks"
        }}
      />
    </div>
  );
};

export default App;
