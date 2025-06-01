import React, { useState, useEffect } from 'react';
import { outreachAPI, OutreachEmail } from '@/services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RefreshCw, 
  Bug, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Send, 
  Reply,
  Eye,
  Database,
  Activity,
  MessageSquare
} from "lucide-react";
import { toast } from 'sonner';

const EmailDebugPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [selectedEmailForReply, setSelectedEmailForReply] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Refreshing all outreach data...');
      
      const [emailsData, pipelineResult, statsResult] = await Promise.all([
        outreachAPI.getEmails(),
        outreachAPI.getPipeline(),
        outreachAPI.getStats()
      ]);

      setEmails(emailsData.emails);
      setPipelineData(pipelineResult);
      setStats(statsResult);
      setLastRefresh(new Date());
      
      console.log('✅ Data refreshed successfully:', {
        emailsCount: emailsData.emails.length,
        pipelineMetrics: pipelineResult.metrics,
        stats: statsResult
      });
      
      toast.success('All data refreshed successfully!');
    } catch (error: any) {
      console.error('❌ Failed to refresh data:', error);
      toast.error('Failed to refresh data: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const simulateReply = async () => {
    if (!selectedEmailForReply) {
      toast.error('Please select an email first');
      return;
    }

    try {
      console.log('🤖 Simulating reply for email:', selectedEmailForReply);
      
      const updatedEmail = await outreachAPI.simulateCreatorReply(
        selectedEmailForReply, 
        replyContent || undefined
      );
      
      console.log('✅ Reply simulated successfully:', updatedEmail);
      
      toast.success('Creator reply simulated!', {
        description: `Email status updated to: ${updatedEmail.status}`
      });
      
      // Refresh data to show updates
      await refreshAllData();
      
      // Clear form
      setSelectedEmailForReply('');
      setReplyContent('');
    } catch (error: any) {
      console.error('❌ Failed to simulate reply:', error);
      toast.error('Failed to simulate reply: ' + (error.message || 'Unknown error'));
    }
  };

  const forceStatusUpdate = async (emailId: string, newStatus: string) => {
    try {
      console.log('🔧 Force updating status:', { emailId, newStatus });
      
      const statusData: any = { status: newStatus };
      if (newStatus === 'opened') {
        statusData.openedAt = new Date().toISOString();
      }
      if (newStatus === 'replied') {
        statusData.repliedAt = new Date().toISOString();
      }
      
      const updatedEmail = await outreachAPI.updateEmailStatus(emailId, statusData);
      console.log('✅ Status updated successfully:', updatedEmail);
      
      toast.success(`Email status updated to: ${newStatus}`);
      await refreshAllData();
    } catch (error: any) {
      console.error('❌ Failed to update status:', error);
      toast.error('Failed to update status: ' + (error.message || 'Unknown error'));
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const sentEmails = emails.filter(e => ['sent', 'opened', 'replied'].includes(e.status));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Outreach Debug Panel
          </CardTitle>
          <CardDescription>
            Debug dashboard refresh issues and test email reply functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Refresh Controls */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-blue-900">Data Refresh</h3>
              <p className="text-sm text-blue-700">
                Last refreshed: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
              </p>
            </div>
            <Button 
              onClick={refreshAllData} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh All Data
                </>
              )}
            </Button>
          </div>

          {/* Current Data Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Total Emails</p>
                    <p className="text-2xl font-bold">{emails.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Pipeline Stages</p>
                    <p className="text-2xl font-bold">
                      {pipelineData ? Object.keys(pipelineData.pipeline).length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Sent Emails</p>
                    <p className="text-2xl font-bold">{stats?.sentEmails || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Metrics */}
          {pipelineData && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Pipeline Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Draft:</span>
                  <span className="ml-2 font-semibold">{pipelineData.metrics.draftCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sent:</span>
                  <span className="ml-2 font-semibold">{pipelineData.metrics.sentCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Opened:</span>
                  <span className="ml-2 font-semibold">{pipelineData.metrics.openedCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Replied:</span>
                  <span className="ml-2 font-semibold">{pipelineData.metrics.repliedCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Failed:</span>
                  <span className="ml-2 font-semibold">{pipelineData.metrics.failedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Reply Simulation */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Simulate Creator Reply
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="email-select">Select Email to Reply To</Label>
                <Select value={selectedEmailForReply} onValueChange={setSelectedEmailForReply}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an email..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sentEmails.map((email) => (
                      <SelectItem key={email.id} value={email.id}>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            email.status === 'opened' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {email.status}
                          </Badge>
                          <span className="truncate max-w-xs">{email.subject}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reply-content">Reply Content (Optional)</Label>
                <Textarea
                  id="reply-content"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Leave empty for AI-generated reply..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={simulateReply}
                disabled={!selectedEmailForReply}
                className="bg-green-600 hover:bg-green-700"
              >
                <Reply className="w-4 h-4 mr-2" />
                Simulate Reply
              </Button>
            </div>
          </div>

          {/* Quick Status Updates */}
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-3">Quick Status Updates</h3>
            <div className="space-y-2">
              {sentEmails.slice(0, 3).map((email) => (
                <div key={email.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <span className="text-sm font-medium truncate block max-w-xs">
                      {email.subject}
                    </span>
                    <Badge className={
                      email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      email.status === 'opened' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }>
                      {email.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {email.status === 'sent' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => forceStatusUpdate(email.id, 'opened')}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    {['sent', 'opened'].includes(email.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => forceStatusUpdate(email.id, 'replied')}
                      >
                        <Reply className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Info */}
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Debug Information</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Check browser console for detailed logs</p>
              <p>• Dashboard should auto-refresh after sending emails</p>
              <p>• Use "Simulate Reply" to test reply tracking</p>
              <p>• Pipeline should reflect status changes immediately</p>
              <p>• Stats should update when data changes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailDebugPanel; 