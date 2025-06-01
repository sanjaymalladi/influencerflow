import React, { useState, useEffect } from 'react';
import { outreachAPI, OutreachEmail } from '@/services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  Send, 
  Eye, 
  Reply, 
  Clock, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  ExternalLink,
  Edit3,
  Save,
  Plus,
  RefreshCw
} from "lucide-react";
import { toast } from 'sonner';

interface PipelineData {
  pipeline: {
    draft: OutreachEmail[];
    sent: OutreachEmail[];
    opened: OutreachEmail[];
    replied: OutreachEmail[];
    failed: OutreachEmail[];
  };
  metrics: {
    totalEmails: number;
    draftCount: number;
    sentCount: number;
    openedCount: number;
    repliedCount: number;
    failedCount: number;
    openRate: string;
    replyRate: string;
    deliveryRate: string;
  };
}

interface EmailCardProps {
  email: OutreachEmail;
  onStatusUpdate: (email: OutreachEmail) => void;
  onEmailClick: (email: OutreachEmail) => void;
}

const EmailCard: React.FC<EmailCardProps> = ({ email, onStatusUpdate, onEmailClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(email.notes || '');

  const handleNotesUpdate = async () => {
    try {
      console.log('📝 Updating email notes:', { emailId: email.id, notes });
      const updatedEmail = await outreachAPI.updateEmailStatus(email.id, { notes });
      setIsEditing(false);
      toast.success('Notes updated successfully');
      onStatusUpdate(updatedEmail);
    } catch (error: any) {
      console.error('❌ Failed to update notes:', error);
      toast.error('Failed to update notes: ' + (error.message || 'Unknown error'));
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      console.log('🔄 Updating email status:', { emailId: email.id, newStatus });
      
      const statusData: any = { status: newStatus };
      if (newStatus === 'opened' && !email.openedAt) {
        statusData.openedAt = new Date().toISOString();
      }
      if (newStatus === 'replied' && !email.repliedAt) {
        statusData.repliedAt = new Date().toISOString();
      }
      
      const updatedEmail = await outreachAPI.updateEmailStatus(email.id, statusData);
      console.log('✅ Email status updated successfully:', updatedEmail);
      
      toast.success(`Status updated to: ${newStatus}`);
      onStatusUpdate(updatedEmail);
    } catch (error: any) {
      console.error('❌ Failed to update status:', error);
      toast.error('Failed to update status: ' + (error.message || 'Unknown error'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'opened': return 'bg-green-100 text-green-800';
      case 'replied': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit3 className="w-3 h-3" />;
      case 'sent': return <Send className="w-3 h-3" />;
      case 'opened': return <Eye className="w-3 h-3" />;
      case 'replied': return <Reply className="w-3 h-3" />;
      case 'failed': return <X className="w-3 h-3" />;
      default: return <Mail className="w-3 h-3" />;
    }
  };

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2" onClick={() => onEmailClick(email)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(email.status)}>
              {getStatusIcon(email.status)}
              <span className="ml-1 capitalize">{email.status}</span>
            </Badge>
            {email.provider && (
              <Badge variant="outline" className="text-xs">
                {email.provider}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Select onValueChange={handleStatusChange} value={email.status}>
              <SelectTrigger className="w-24 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardTitle className="text-sm font-medium line-clamp-2">
          {email.subject}
        </CardTitle>
        <CardDescription className="text-xs">
          {email.creator?.name} • {email.campaign?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {email.creator && (
            <div className="flex items-center text-xs text-gray-600">
              <Users className="w-3 h-3 mr-1" />
              {email.creator.platform} • {email.creator.followers?.toLocaleString()} followers
            </div>
          )}
          
          {email.sentAt && (
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(email.sentAt).toLocaleDateString()}
            </div>
          )}

          {email.recipientEmail && (
            <div className="flex items-center text-xs text-gray-600">
              <Mail className="w-3 h-3 mr-1" />
              {email.recipientEmail}
            </div>
          )}

          {email.errorMessage && (
            <div className="flex items-center text-xs text-red-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {email.errorMessage}
            </div>
          )}

          {/* Notes section */}
          <div className="border-t pt-2">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="text-xs h-16"
                />
                <div className="flex space-x-1">
                  <Button size="sm" onClick={handleNotesUpdate} className="h-6 text-xs">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-6 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {notes ? (
                  <p className="text-xs text-gray-600 mb-1">{notes}</p>
                ) : (
                  <p className="text-xs text-gray-400 mb-1">No notes</p>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-5 text-xs p-1"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {notes ? 'Edit' : 'Add'} notes
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface EmailDetailsModalProps {
  email: OutreachEmail | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (email: OutreachEmail) => void;
}

const EmailDetailsModal: React.FC<EmailDetailsModalProps> = ({ email, isOpen, onClose, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!email) return null;

  const handleSendEmail = async () => {
    if (email.status !== 'draft') return;
    
    try {
      setIsUpdating(true);
      console.log('🚀 Sending email from EmailPipeline:', { id: email.id, subject: email.subject });
      
      const updatedEmail = await outreachAPI.sendEmail(email.id);
      console.log('✅ Email sent successfully from EmailPipeline:', updatedEmail);
      
      toast.success('Email sent successfully!', {
        description: `Email "${email.subject}" has been sent${updatedEmail.messageId ? ` (ID: ${updatedEmail.messageId})` : ''}`
      });
      
      onUpdate(updatedEmail);
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to send email from EmailPipeline:', error);
      
      const errorMessage = error.message || error.response?.data?.message || 'Failed to send email';
      toast.error('Failed to send email', {
        description: errorMessage,
        action: {
          label: 'Try Again',
          onClick: () => handleSendEmail()
        }
      });
      
      // If there's additional error data, log it for debugging
      if (error.response?.data) {
        console.error('Full error response:', error.response.data);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Email Details</span>
            <Badge className={
              email.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              email.status === 'opened' ? 'bg-green-100 text-green-800' :
              email.status === 'replied' ? 'bg-purple-100 text-purple-800' :
              'bg-red-100 text-red-800'
            }>
              {email.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View detailed information about this outreach email including delivery status, tracking data, and actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Campaign</Label>
              <p className="text-sm text-gray-600">{email.campaign?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Creator</Label>
              <p className="text-sm text-gray-600">{email.creator?.name}</p>
            </div>
          </div>

          {/* Creator Details */}
          {email.creator && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Creator Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Platform:</span>
                  <span className="font-medium">{email.creator.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span>Followers:</span>
                  <span className="font-medium">{email.creator.followers?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <span className="font-medium">{email.creator.categories?.join(', ')}</span>
                </div>
                {email.recipientEmail && (
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium">{email.recipientEmail}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email Content */}
          <div>
            <Label className="text-sm font-medium">Subject</Label>
            <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded mt-1">
              {email.subject}
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium">Message</Label>
            <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded mt-1 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {email.body}
            </div>
          </div>

          {/* Tracking Info */}
          {(email.sentAt || email.openedAt || email.repliedAt) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {email.sentAt && (
                  <div className="flex items-center space-x-2">
                    <Send className="w-4 h-4 text-blue-500" />
                    <span>Sent: {new Date(email.sentAt).toLocaleString()}</span>
                  </div>
                )}
                {email.openedAt && (
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-green-500" />
                    <span>Opened: {new Date(email.openedAt).toLocaleString()}</span>
                  </div>
                )}
                {email.repliedAt && (
                  <div className="flex items-center space-x-2">
                    <Reply className="w-4 h-4 text-purple-500" />
                    <span>Replied: {new Date(email.repliedAt).toLocaleString()}</span>
                  </div>
                )}
                {email.messageId && (
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                    <span>Message ID: {email.messageId}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {email.errorMessage && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Error Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-red-600">
                {email.errorMessage}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {email.notes && (
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                {email.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {email.status === 'draft' && (
              <Button onClick={handleSendEmail} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EmailPipeline: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<OutreachEmail | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const loadPipelineData = async (showToast = false) => {
    try {
      setIsLoading(true);
      if (showToast) {
        console.log('🔄 Refreshing pipeline data...');
      }
      const data = await outreachAPI.getPipeline();
      setPipelineData(data);
      if (showToast) {
        toast.success('Pipeline data refreshed!');
      }
    } catch (error) {
      console.error('❌ Failed to load pipeline data:', error);
      toast.error('Failed to load pipeline data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineData();
  }, []);

  const handleEmailUpdate = (updatedEmail: OutreachEmail) => {
    if (!pipelineData) return;

    // Remove email from all stages
    const newPipeline = { ...pipelineData.pipeline };
    Object.keys(newPipeline).forEach(stage => {
      newPipeline[stage as keyof typeof newPipeline] = newPipeline[stage as keyof typeof newPipeline].filter(
        email => email.id !== updatedEmail.id
      );
    });

    // Add email to correct stage
    const targetStage = updatedEmail.status as keyof typeof newPipeline;
    if (newPipeline[targetStage]) {
      newPipeline[targetStage].push(updatedEmail);
    }

    // Recalculate metrics
    const totalEmails = Object.values(newPipeline).flat().length;
    const sentEmails = [...newPipeline.sent, ...newPipeline.opened, ...newPipeline.replied];
    const newMetrics = {
      ...pipelineData.metrics,
      totalEmails,
      draftCount: newPipeline.draft.length,
      sentCount: newPipeline.sent.length,
      openedCount: newPipeline.opened.length,
      repliedCount: newPipeline.replied.length,
      failedCount: newPipeline.failed.length,
      openRate: sentEmails.length > 0 ? (((newPipeline.opened.length + newPipeline.replied.length) / sentEmails.length) * 100).toFixed(2) : '0',
      replyRate: sentEmails.length > 0 ? ((newPipeline.replied.length / sentEmails.length) * 100).toFixed(2) : '0',
    };

    setPipelineData({
      pipeline: newPipeline,
      metrics: newMetrics
    });
  };

  const handleEmailClick = (email: OutreachEmail) => {
    setSelectedEmail(email);
    setIsDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  if (!pipelineData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load pipeline</h3>
        <p className="text-gray-600 mb-4">Unable to load pipeline data</p>
        <Button onClick={() => loadPipelineData()}>
          Try Again
        </Button>
      </div>
    );
  }

  const stages = [
    { key: 'draft', title: 'Draft', icon: Edit3, color: 'border-gray-300' },
    { key: 'sent', title: 'Sent', icon: Send, color: 'border-blue-300' },
    { key: 'opened', title: 'Opened', icon: Eye, color: 'border-green-300' },
    { key: 'replied', title: 'Replied', icon: Reply, color: 'border-purple-300' },
    { key: 'failed', title: 'Failed', icon: X, color: 'border-red-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Pipeline</h2>
          <p className="text-gray-600">Track email status through each stage of the outreach process</p>
        </div>
        <Button 
          onClick={() => loadPipelineData(true)}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Pipeline'}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Open Rate</p>
                <p className="text-2xl font-bold">{pipelineData.metrics.openRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Reply className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Reply Rate</p>
                <p className="text-2xl font-bold">{pipelineData.metrics.replyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Delivery Rate</p>
                <p className="text-2xl font-bold">{pipelineData.metrics.deliveryRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Total Emails</p>
                <p className="text-2xl font-bold">{pipelineData.metrics.totalEmails}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const StageIcon = stage.icon;
          const emails = pipelineData.pipeline[stage.key as keyof typeof pipelineData.pipeline];
          
          return (
            <Card key={stage.key} className={`${stage.color} border-2`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <StageIcon className="w-4 h-4" />
                  <span>{stage.title}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {emails.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {emails.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <StageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No emails</p>
                    </div>
                  ) : (
                    emails.map((email) => (
                      <EmailCard
                        key={email.id}
                        email={email}
                        onStatusUpdate={handleEmailUpdate}
                        onEmailClick={handleEmailClick}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Email Details Modal */}
      <EmailDetailsModal
        email={selectedEmail}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onUpdate={handleEmailUpdate}
      />
    </div>
  );
};

export default EmailPipeline; 