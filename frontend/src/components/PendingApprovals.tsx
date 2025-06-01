import React, { useState, useEffect } from 'react';
import { outreachAPI } from '@/services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Send,
  Brain,
  User,
  Sparkles
} from "lucide-react";
import { toast } from 'sonner';

interface PendingApproval {
  id: string;
  emailId: string;
  replyContent: string;
  analysis: {
    sentiment: string;
    intent: string;
    requiresHumanAttention: boolean;
    suggestedResponse?: string;
    extractedInfo: any;
  };
  status: string;
  priority: string;
  createdAt: string;
}

interface PendingApprovalsProps {
  onUpdate?: () => void;
}

const PendingApprovals: React.FC<PendingApprovalsProps> = ({ onUpdate }) => {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [customResponse, setCustomResponse] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const data = await outreachAPI.getPendingApprovals();
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadApprovals, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprovalClick = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setCustomResponse(approval.analysis.suggestedResponse || '');
    setIsDialogOpen(true);
  };

  const handleApproveResponse = async (useAISuggestion: boolean = false) => {
    if (!selectedApproval) return;

    try {
      setIsApproving(true);
      
      const responseText = useAISuggestion 
        ? selectedApproval.analysis.suggestedResponse || customResponse
        : customResponse;

      if (!responseText.trim()) {
        toast.error('Please provide a response');
        return;
      }

      await outreachAPI.approveResponse(selectedApproval.id, responseText);
      
      toast.success(useAISuggestion ? '🤖 AI response approved and sent!' : '👤 Custom response sent!');
      
      setIsDialogOpen(false);
      setSelectedApproval(null);
      setCustomResponse('');
      
      await loadApprovals();
      onUpdate?.();
      
    } catch (error) {
      console.error('Failed to approve response:', error);
      toast.error('Failed to send response');
    } finally {
      setIsApproving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'negative': return <ThumbsDown className="w-4 h-4 text-red-600" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getIntentDescription = (intent: string) => {
    switch (intent) {
      case 'interested': return '🎯 Creator is interested';
      case 'requesting_info': return '❓ Requesting more info';
      case 'discussing_pricing': return '💰 Discussing pricing';
      case 'requesting_meeting': return '📅 Wants to schedule meeting';
      case 'declined': return '❌ Declined opportunity';
      default: return '🤔 Intent unclear';
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2 animate-spin" />
            Loading Pending Approvals...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              AI Pending Approvals ({approvals.length})
            </div>
            {approvals.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {approvals.filter(a => a.priority === 'high').length} High Priority
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Creator replies that need human review before AI can respond
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {approvals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">No pending approvals at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  onClick={() => handleApprovalClick(approval)}
                  className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getSentimentIcon(approval.analysis.sentiment)}
                      <span className="font-medium text-gray-900">Email #{approval.emailId}</span>
                      <Badge className={`${getPriorityColor(approval.priority)} text-xs`}>
                        {approval.priority} priority
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(approval.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-blue-600 font-medium mb-1">
                      {getIntentDescription(approval.analysis.intent)}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      "{approval.replyContent.substring(0, 150)}..."
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI suggested response ready
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprovalClick(approval);
                        }}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Review AI Response - Email #{selectedApproval?.emailId}
            </DialogTitle>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-6">
              {/* Creator Reply */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Creator's Reply
                </h3>
                <div className="bg-white p-3 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {selectedApproval.replyContent}
                  </pre>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-medium text-purple-900 mb-3 flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Analysis
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Sentiment:</span>
                    <div className="flex items-center mt-1">
                      {getSentimentIcon(selectedApproval.analysis.sentiment)}
                      <span className="ml-1 capitalize">{selectedApproval.analysis.sentiment}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Intent:</span>
                    <p className="mt-1 capitalize">{selectedApproval.analysis.intent.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span>
                    <Badge className={`${getPriorityColor(selectedApproval.priority)} text-xs mt-1`}>
                      {selectedApproval.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Response Options */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Choose Response Method:</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* AI Suggested Response */}
                  {selectedApproval.analysis.suggestedResponse && (
                    <div className="border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-green-900 flex items-center">
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Suggested Response
                        </h4>
                        <Button
                          size="sm"
                          onClick={() => handleApproveResponse(true)}
                          disabled={isApproving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Send AI Response
                        </Button>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {selectedApproval.analysis.suggestedResponse}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Custom Response */}
                  <div className="border border-blue-200 rounded-xl p-4">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Custom Response
                    </h4>
                    <Textarea
                      value={customResponse}
                      onChange={(e) => setCustomResponse(e.target.value)}
                      placeholder="Write your custom response..."
                      rows={8}
                      className="rounded-xl"
                    />
                    <div className="flex justify-end mt-3">
                      <Button
                        onClick={() => handleApproveResponse(false)}
                        disabled={isApproving || !customResponse.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isApproving ? (
                          <>
                            <Clock className="w-3 h-3 mr-1 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3 mr-1" />
                            Send Custom Response
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingApprovals; 