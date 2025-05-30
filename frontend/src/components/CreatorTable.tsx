
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Zap } from "lucide-react";

interface Creator {
  id: string;
  handle: string;
  platform: string;
  avatar: string;
  followers: number;
  engagement: number;
  medianViews: number;
  categories: string[];
  status: 'ready' | 'writing' | 'sent';
}

interface CreatorTableProps {
  selectedCreators: string[];
  setSelectedCreators: (ids: string[]) => void;
}

const mockCreators: Creator[] = [
  {
    id: '1',
    handle: '@fashionfwd',
    platform: 'Instagram',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=50&h=50&fit=crop&crop=face',
    followers: 245000,
    engagement: 4.2,
    medianViews: 18500,
    categories: ['Fashion', 'Lifestyle'],
    status: 'ready'
  },
  {
    id: '2',
    handle: '@techreviewr',
    platform: 'TikTok',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
    followers: 892000,
    engagement: 6.8,
    medianViews: 156000,
    categories: ['Tech', 'Reviews'],
    status: 'writing'
  },
  {
    id: '3',
    handle: '@fitnessqueen',
    platform: 'Instagram',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face',
    followers: 567000,
    engagement: 5.1,
    medianViews: 42000,
    categories: ['Fitness', 'Health'],
    status: 'ready'
  },
  {
    id: '4',
    handle: '@foodieguru',
    platform: 'YouTube',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
    followers: 1240000,
    engagement: 3.9,
    medianViews: 89000,
    categories: ['Food', 'Travel'],
    status: 'sent'
  },
  {
    id: '5',
    handle: '@beautyexpert',
    platform: 'TikTok',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face',
    followers: 334000,
    engagement: 7.2,
    medianViews: 67000,
    categories: ['Beauty', 'Skincare'],
    status: 'writing'
  }
];

const CreatorTable = ({ selectedCreators, setSelectedCreators }: CreatorTableProps) => {
  const [creators] = useState<Creator[]>(mockCreators);

  const handleSelectCreator = (creatorId: string) => {
    if (selectedCreators.includes(creatorId)) {
      setSelectedCreators(selectedCreators.filter(id => id !== creatorId));
    } else {
      setSelectedCreators([...selectedCreators, creatorId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCreators.length === creators.length) {
      setSelectedCreators([]);
    } else {
      setSelectedCreators(creators.map(c => c.id));
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 5) return 'text-green-600';
    if (engagement >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: Creator['status']) => {
    switch (status) {
      case 'writing':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 rounded-full">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Writing email...
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-700 rounded-full">
            Sent
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#222222] text-white rounded-full">
            Ready
          </Badge>
        );
    }
  };

  return (
    <Card className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Checkbox 
              checked={selectedCreators.length === creators.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-semibold text-[#222222]">
              {creators.length} creators found
            </span>
          </div>
          {selectedCreators.length > 0 && (
            <Button className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold">
              <Zap className="w-4 h-4 mr-2" />
              Send Outreach
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 font-semibold text-[#222222]">Creator</th>
              <th className="text-right py-3 px-6 font-semibold text-[#222222]">Followers</th>
              <th className="text-left py-3 px-6 font-semibold text-[#222222]">Engagement</th>
              <th className="text-right py-3 px-6 font-semibold text-[#222222]">Median Views</th>
              <th className="text-left py-3 px-6 font-semibold text-[#222222]">Categories</th>
              <th className="text-left py-3 px-6 font-semibold text-[#222222]">Status</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((creator) => (
              <tr 
                key={creator.id}
                className={`border-b border-gray-100 hover:bg-[#FFE600] hover:bg-opacity-10 transition-colors ${
                  selectedCreators.includes(creator.id) ? 'bg-[#FFE600] bg-opacity-20' : ''
                }`}
              >
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      checked={selectedCreators.includes(creator.id)}
                      onCheckedChange={() => handleSelectCreator(creator.id)}
                    />
                    <img 
                      src={creator.avatar} 
                      alt={creator.handle}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-bold text-[#222222]">{creator.handle}</div>
                      <div className="text-sm text-gray-500">{creator.platform}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-medium text-[#222222]">
                  {formatNumber(creator.followers)}
                </td>
                <td className="py-4 px-6">
                  <div className={`flex items-center ${getEngagementColor(creator.engagement)}`}>
                    <Heart className="w-4 h-4 mr-1" />
                    {creator.engagement}%
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-medium text-[#222222]">
                  {formatNumber(creator.medianViews)}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-wrap gap-1">
                    {creator.categories.map((category) => (
                      <span 
                        key={category}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 px-6">
                  {getStatusBadge(creator.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Showing 1-5 of 1,395 creators
        </span>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            Previous
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            1
          </Button>
          <Button size="sm" className="bg-[#FFE600] text-[#222222] rounded-xl">
            2
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            3
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CreatorTable;
