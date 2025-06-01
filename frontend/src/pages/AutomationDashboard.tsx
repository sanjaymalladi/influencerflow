import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  MessageSquare, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Send,
  Bot,
  Users,
  DollarSign
} from 'lucide-react';

interface AutomationStats {
  totalNegotiations: number;
  activeNegotiations: number;
  totalContracts: number;
  signedContracts: number;
  totalPayments: number;
  completedPayments: number;
  totalRevenue: number;
}

interface ActivityItem {
  type: 'negotiation' | 'contract' | 'payment';
  description: string;
  timestamp: string;
}

interface DashboardData {
  summary: AutomationStats;
  recentActivity: ActivityItem[];
}

const AutomationDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/automation/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'negotiation':
        return <MessageSquare className="h-4 w-4" />;
      case 'contract':
        return <FileText className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary, recentActivity } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automation Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your influencer outreach automation</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Negotiations</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeNegotiations}</div>
            <p className="text-xs text-gray-600">
              {summary.totalNegotiations} total negotiations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signed Contracts</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.signedContracts}</div>
            <p className="text-xs text-gray-600">
              {summary.totalContracts} total contracts
            </p>
            <Progress 
              value={(summary.signedContracts / Math.max(summary.totalContracts, 1)) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completedPayments}</div>
            <p className="text-xs text-gray-600">
              {summary.totalPayments} total payments
            </p>
            <Progress 
              value={(summary.completedPayments / Math.max(summary.totalPayments, 1)) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-gray-600">
              From completed campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outreach">Email Outreach</TabsTrigger>
          <TabsTrigger value="negotiations">AI Negotiations</TabsTrigger>
          <TabsTrigger value="contracts">Contracts & Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest automation updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          {activity.type}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common automation tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Send Outreach Campaign
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Bot className="h-4 w-4 mr-2" />
                    Review Gemini AI Negotiations
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Contracts
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Payments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Outreach Management</CardTitle>
              <CardDescription>
                Send personalized outreach emails to creators using Gmail API or Mailtrap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Email outreach feature allows you to send automated, personalized emails to multiple creators.
                    The system tracks opens, clicks, and replies automatically.
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2">
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Create New Campaign
                  </Button>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="negotiations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gemini AI-Powered Negotiations</CardTitle>
              <CardDescription>
                Let Gemini AI handle simple negotiations while escalating complex decisions to humans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    Gemini AI negotiation system can automatically respond to price negotiations, timeline changes,
                    and scope modifications within predefined parameters. Complex requests are escalated to humans.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-green-600 mb-2">Auto-Approved</h4>
                    <p className="text-sm text-gray-600">Minor timeline extensions, scope clarifications</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-yellow-600 mb-2">AI Negotiated</h4>
                    <p className="text-sm text-gray-600">Budget adjustments within 20%, deliverable changes</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-red-600 mb-2">Human Review</h4>
                    <p className="text-sm text-gray-600">Major changes, high-value deals, complex terms</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contract Generation</CardTitle>
                <CardDescription>Automated contract creation with PandaDoc</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Contracts are automatically generated from negotiation results and sent via PandaDoc for signatures.
                    </AlertDescription>
                  </Alert>
                  <div className="flex space-x-2">
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      View Contracts
                    </Button>
                    <Button variant="outline">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Track Signatures
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Processing</CardTitle>
                <CardDescription>Automated payments via Razorpay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription>
                      Payments are automatically processed once contracts are signed and deliverables are completed.
                    </AlertDescription>
                  </Alert>
                  <div className="flex space-x-2">
                    <Button>
                      <CreditCard className="h-4 w-4 mr-2" />
                      View Payments
                    </Button>
                    <Button variant="outline">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Payment Reports
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationDashboard; 