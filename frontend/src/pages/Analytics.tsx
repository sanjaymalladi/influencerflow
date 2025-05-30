
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Mail, DollarSign } from "lucide-react";

const Analytics = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#222222] mb-2">Analytics</h1>
          <p className="text-gray-600">Track your campaign performance and creator partnerships</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
                <Users className="w-5 h-5 text-[#222222]" />
              </div>
              <span className="text-sm text-green-600 font-medium">+22%</span>
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
            <div className="text-2xl font-bold text-[#222222] mb-1">3,892</div>
            <div className="text-gray-600">Emails Sent</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#222222]" />
              </div>
              <span className="text-sm text-green-600 font-medium">+28%</span>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">$147K</div>
            <div className="text-gray-600">Total ROI</div>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-6">Campaign Performance</h3>
            <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
              <span className="text-gray-500">Chart visualization would go here</span>
            </div>
          </Card>

          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-6">Creator Engagement</h3>
            <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
              <span className="text-gray-500">Chart visualization would go here</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
