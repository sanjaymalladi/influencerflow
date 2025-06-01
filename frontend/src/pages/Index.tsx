
import { Button } from "@/components/ui/button";
import { Search, Users, Zap, BarChart3, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-[#222222]">InfluencerFlow</h1>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-[#222222] hover:text-[#FFE600] transition-colors">
                Dashboard
              </Link>
              <Link to="/creators" className="text-[#222222] hover:text-[#FFE600] transition-colors">
                Creators
              </Link>
              <Link to="/outreach" className="text-[#222222] hover:text-[#FFE600] transition-colors">
                Outreach
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Link to="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-7xl font-bold text-[#222222] mb-6">
            Find Perfect
            <span className="block text-[#FFE600]">Creators</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover, connect, and collaborate with top influencers across all platforms. 
            Scale your creator partnerships with AI-powered outreach.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link to="/creators">
              <Button className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] text-lg px-8 py-6 rounded-xl font-bold">
                <Search className="w-5 h-5 mr-2" />
                Search Creators
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 border-[#222222] text-[#222222] hover:bg-[#222222] hover:text-white">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#FFE600] rounded-xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-[#222222]" />
            </div>
            <h3 className="text-2xl font-bold text-[#222222] mb-4">Creator Database</h3>
            <p className="text-gray-600">
              Access thousands of verified creators across TikTok, Instagram, YouTube, and more platforms.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#FFE600] rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-[#222222]" />
            </div>
            <h3 className="text-2xl font-bold text-[#222222] mb-4">AI Outreach</h3>
            <p className="text-gray-600">
              Automatically craft personalized emails and messages to scale your creator partnerships.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#FFE600] rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-[#222222]" />
            </div>
            <h3 className="text-2xl font-bold text-[#222222] mb-4">Analytics</h3>
            <p className="text-gray-600">
              Track campaign performance, engagement rates, and ROI across all your creator partnerships.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-[#222222] mb-2">50K+</div>
            <div className="text-gray-600">Verified Creators</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-[#222222] mb-2">95%</div>
            <div className="text-gray-600">Response Rate</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-[#222222] mb-2">2.5x</div>
            <div className="text-gray-600">Faster Outreach</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-[#222222] mb-2">1M+</div>
            <div className="text-gray-600">Campaigns Sent</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
