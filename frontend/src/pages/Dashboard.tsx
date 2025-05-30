
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Mail, TrendingUp, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#222222] mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your creator partnerships and campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-[#222222]" />
              </div>
              <span className="text-sm text-green-600 font-medium">+12%</span>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">1,247</div>
            <div className="text-gray-600">Active Creators</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#222222]" />
              </div>
              <span className="text-sm text-green-600 font-medium">+8%</span>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">892</div>
            <div className="text-gray-600">Emails Sent</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#222222]" />
              </div>
              <span className="text-sm text-green-600 font-medium">+15%</span>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">68%</div>
            <div className="text-gray-600">Response Rate</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#222222]" />
              </div>
              <span className="text-sm text-green-600 font-medium">+22%</span>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">$47.2K</div>
            <div className="text-gray-600">Campaign ROI</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-4">Quick Actions</h3>
            <div className="space-y-4">
              <Link to="/creators">
                <Button className="w-full bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold">
                  Search New Creators
                </Button>
              </Link>
              <Link to="/outreach">
                <Button variant="outline" className="w-full rounded-xl border-2 border-[#222222]">
                  Create Campaign
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Campaign "Summer Launch" sent</span>
                <span className="text-sm text-gray-500">2h ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">3 new creator responses</span>
                <span className="text-sm text-gray-500">4h ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Database updated with 50 creators</span>
                <span className="text-sm text-gray-500">1d ago</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
