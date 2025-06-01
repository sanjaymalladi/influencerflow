import React, { useState, useEffect } from 'react';
import { outreachAPI, OutreachEmail, campaignsAPI } from '@/services/apiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageSquare,
  DollarSign,
  FileText,
  Handshake,
  ArrowRight,
  ArrowLeft,
  Phone,
  Video,
  Paperclip,
  Star,
  Filter,
  Search,
  MoreVertical
} from "lucide-react";
import { toast } from 'sonner';

interface CRMEmailThread {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    name: string;
    email: string;
    platform: string;
    followers: number;
    categories: string[];
    avatar?: string;
  };
  campaignId: string;
  campaign: {
    id: string;
    name: string;
    budget: number;
  };
  emails: OutreachEmail[];
  status: 'lead' | 'contacted' | 'responding' | 'negotiating' | 'contract_sent' | 'signed' | 'closed';
  priority: 'low' | 'medium' | 'high';
  lastActivity: string;
  nextFollowUp?: string;
  estimatedValue: number;
  notes: string[];
}

interface ConversationViewProps {
  thread: CRMEmailThread;
  onClose: () => void;
  onUpdate: (thread: CRMEmailThread) => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ thread, onClose, onUpdate }) => {
  const [isComposing, setIsComposing] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationOffer, setNegotiationOffer] = useState({
    budget: thread.campaign.budget,
    deliverables: '',
    timeline: '',
    terms: ''
  });

  const handleSendReply = async () => {
    try {
      // Create and send reply email
      const newEmail = await outreachAPI.createEmail({
        campaignId: thread.campaignId,
        creatorId: thread.creatorId,
        subject: `Re: ${thread.emails[0]?.subject}`,
        body: replyBody
      });

      await outreachAPI.sendEmail(newEmail.id);
      
      toast.success('Reply sent successfully!');
      setIsComposing(false);
      setReplyBody('');
      
      // Update thread
      const updatedThread = {
        ...thread,
        emails: [...thread.emails, newEmail],
        lastActivity: new Date().toISOString(),
        status: 'responding' as const
      };
      onUpdate(updatedThread);
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const handleStartNegotiation = async () => {
    try {
      const negotiationEmail = `Hi ${thread.creator.name},

Thank you for your interest in our ${thread.campaign.name} campaign!

I'd like to discuss the collaboration details:

💰 Proposed Budget: $${negotiationOffer.budget.toLocaleString()}
📝 Deliverables: ${negotiationOffer.deliverables}
📅 Timeline: ${negotiationOffer.timeline}
📋 Terms: ${negotiationOffer.terms}

Let me know your thoughts on this proposal. I'm open to discussing adjustments to ensure this partnership works well for both of us.

Looking forward to your response!

Best regards,
Campaign Manager`;

      const newEmail = await outreachAPI.createEmail({
        campaignId: thread.campaignId,
        creatorId: thread.creatorId,
        subject: `Collaboration Proposal - ${thread.campaign.name}`,
        body: negotiationEmail
      });

      await outreachAPI.sendEmail(newEmail.id);
      
      toast.success('Negotiation proposal sent!');
      setIsNegotiating(false);
      
      const updatedThread = {
        ...thread,
        emails: [...thread.emails, newEmail],
        lastActivity: new Date().toISOString(),
        status: 'negotiating' as const
      };
      onUpdate(updatedThread);
    } catch (error) {
      toast.error('Failed to send negotiation proposal');
    }
  };

  const handleSendContract = async () => {
    try {
      const contractEmail = `Hi ${thread.creator.name},

Great! I'm excited to move forward with our collaboration.

I've prepared the partnership contract with the terms we discussed:
- Budget: $${negotiationOffer.budget.toLocaleString()}
- Deliverables: ${negotiationOffer.deliverables}
- Timeline: ${negotiationOffer.timeline}

📄 Contract Link: [Click here to review and sign the contract]

Please review the contract and let me know if you have any questions. Once signed, we can get started!

Best regards,
Campaign Manager`;

      const newEmail = await outreachAPI.createEmail({
        campaignId: thread.campaignId,
        creatorId: thread.creatorId,
        subject: `Partnership Contract - ${thread.campaign.name}`,
        body: contractEmail
      });

      await outreachAPI.sendEmail(newEmail.id);
      
      toast.success('Contract sent successfully!');
      
      const updatedThread = {
        ...thread,
        emails: [...thread.emails, newEmail],
        lastActivity: new Date().toISOString(),
        status: 'contract_sent' as const
      };
      onUpdate(updatedThread);
    } catch (error) {
      toast.error('Failed to send contract');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'responding': return 'bg-green-100 text-green-800';
      case 'negotiating': return 'bg-yellow-100 text-yellow-800';
      case 'contract_sent': return 'bg-purple-100 text-purple-800';
      case 'signed': return 'bg-emerald-100 text-emerald-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lead': return <Users className="w-4 h-4" />;
      case 'contacted': return <Mail className="w-4 h-4" />;
      case 'responding': return <Reply className="w-4 h-4" />;
      case 'negotiating': return <DollarSign className="w-4 h-4" />;
      case 'contract_sent': return <FileText className="w-4 h-4" />;
      case 'signed': return <Handshake className="w-4 h-4" />;
      case 'closed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">
                  {thread.creator.name.charAt(0)}
                </span>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-[#222222]">
                  {thread.creator.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Conversation thread with {thread.creator.name} for {thread.campaign.name} campaign
                </DialogDescription>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(thread.status)}>
                    {getStatusIcon(thread.status)}
                    <span className="ml-1 capitalize">{thread.status.replace('_', ' ')}</span>
                  </Badge>
                  <Badge variant="outline">
                    {thread.creator.platform} • {thread.creator.followers?.toLocaleString()} followers
                  </Badge>
                  <Badge variant="outline">
                    ${thread.estimatedValue.toLocaleString()} estimated value
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" size="sm">
                <Video className="w-4 h-4 mr-2" />
                Meet
              </Button>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Main Conversation Area */}
          <div className="flex-1 flex flex-col">
            {/* Email Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {thread.emails.map((email, index) => (
                <div key={email.id} className="space-y-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span className="font-medium">Outbound Email</span>
                          <Badge className={
                            email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            email.status === 'opened' ? 'bg-green-100 text-green-800' :
                            email.status === 'replied' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {email.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'Draft'}
                        </span>
                      </div>
                      <h4 className="font-semibold">{email.subject}</h4>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-sans">
                          {email.body}
                        </pre>
                      </div>
                      {email.messageId && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Message ID: {email.messageId}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Simulate creator replies for demonstration */}
                  {email.status === 'replied' && (
                    <Card className="border-l-4 border-l-green-500 ml-8">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Reply className="w-4 h-4" />
                            <span className="font-medium">Creator Reply</span>
                            <Badge className="bg-green-100 text-green-800">
                              Received
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(Date.now() + index * 60000).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-semibold">Re: {email.subject}</h4>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm">
                            Hi there! Thanks for reaching out about the {thread.campaign.name} campaign. 
                            I'm definitely interested in collaborating! The project sounds exciting and aligns well with my content.
                            
                            I'd love to discuss the details further. Could we set up a call to go over the deliverables and timeline?
                            
                            Looking forward to hearing from you!
                            
                            Best,<br/>
                            {thread.creator.name}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}

              {/* No emails state */}
              {thread.emails.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversation yet</h3>
                  <p className="text-gray-600">Start the conversation by sending an outreach email</p>
                </div>
              )}
            </div>

            {/* Compose Area */}
            <div className="border-t p-4 flex-shrink-0">
              {isComposing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Compose Reply</h4>
                    <Button variant="outline" size="sm" onClick={() => setIsComposing(false)}>
                      Cancel
                    </Button>
                  </div>
                  <Textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="rounded-xl"
                  />
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach
                      </Button>
                    </div>
                    <Button onClick={handleSendReply} className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222]">
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => setIsComposing(true)}
                    className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222]"
                  >
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                  <Button variant="outline" onClick={() => setIsNegotiating(true)}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Start Negotiation
                  </Button>
                  {thread.status === 'negotiating' && (
                    <Button variant="outline" onClick={handleSendContract}>
                      <FileText className="w-4 h-4 mr-2" />
                      Send Contract
                    </Button>
                  )}
                  {thread.emails.length > 0 && thread.emails[thread.emails.length - 1].status === 'sent' && (
                    <Button variant="outline" onClick={async () => {
                      try {
                        const latestEmail = thread.emails[thread.emails.length - 1];
                        await outreachAPI.simulateCreatorReply(latestEmail.id);
                        toast.success('🤖 AI analyzed creator reply and handled response!');
                        // Reload data
                        window.location.reload();
                      } catch (error) {
                        toast.error('Failed to simulate reply');
                      }
                    }}>
                      <Reply className="w-4 h-4 mr-2" />
                      Simulate AI Reply (Demo)
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => {
                    // Open manual reply input dialog
                    const replyContent = prompt('Enter the creator\'s reply content:');
                    if (replyContent && thread.emails.length > 0) {
                      const latestEmail = thread.emails[thread.emails.length - 1];
                      outreachAPI.processManualReply(latestEmail.id, { replyContent })
                        .then(() => {
                          toast.success('🤖 Real reply processed with AI analysis!');
                          window.location.reload();
                        })
                        .catch(() => toast.error('Failed to process reply'));
                    }
                  }}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Process Real Reply
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Creator Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span className="font-medium">{thread.creator.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Followers:</span>
                      <span className="font-medium">{thread.creator.followers?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Categories:</span>
                      <span className="font-medium">{thread.creator.categories?.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-medium text-xs">{thread.creator.email}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{thread.campaign.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Budget:</span>
                      <span className="font-medium">${thread.campaign.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                                           <Badge className={`${getStatusColor(thread.status)} text-xs`}>
                       {thread.status.replace('_', ' ')}
                     </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Star className="w-4 h-4 mr-2" />
                      Priority & Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <Badge variant={thread.priority === 'high' ? 'destructive' : 'secondary'}>
                        {thread.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Value:</span>
                      <span className="font-medium">${thread.estimatedValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Activity:</span>
                      <span className="font-medium">{new Date(thread.lastActivity).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="space-y-3">
                  {thread.emails.map((email, index) => (
                    <div key={email.id} className="flex items-start space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium">Email {email.status}</p>
                        <p className="text-gray-600 text-xs">
                          {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'Draft'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Negotiation Modal */}
        <Dialog open={isNegotiating} onOpenChange={setIsNegotiating}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start Negotiation with {thread.creator.name}</DialogTitle>
              <DialogDescription>
                Define the terms and conditions for your collaboration proposal with {thread.creator.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Proposed Budget</Label>
                  <Input
                    type="number"
                    value={negotiationOffer.budget}
                    onChange={(e) => setNegotiationOffer(prev => ({ ...prev, budget: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Timeline</Label>
                  <Input
                    value={negotiationOffer.timeline}
                    onChange={(e) => setNegotiationOffer(prev => ({ ...prev, timeline: e.target.value }))}
                    placeholder="e.g., 4 weeks"
                  />
                </div>
              </div>
              <div>
                <Label>Deliverables</Label>
                <Textarea
                  value={negotiationOffer.deliverables}
                  onChange={(e) => setNegotiationOffer(prev => ({ ...prev, deliverables: e.target.value }))}
                  placeholder="List the deliverables..."
                />
              </div>
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={negotiationOffer.terms}
                  onChange={(e) => setNegotiationOffer(prev => ({ ...prev, terms: e.target.value }))}
                  placeholder="Additional terms..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsNegotiating(false)}>Cancel</Button>
                <Button onClick={handleStartNegotiation} className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222]">
                  Send Proposal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

const CRMDashboard: React.FC = () => {
  const [threads, setThreads] = useState<CRMEmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<CRMEmailThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadCRMData = async () => {
    try {
      setIsLoading(true);
      const pipelineData = await outreachAPI.getPipeline();
      
      // Convert emails to CRM threads grouped by creator
      const threadMap = new Map<string, CRMEmailThread>();
      
      Object.values(pipelineData.pipeline).flat().forEach(email => {
        if (!email.creator) return;
        
        const key = `${email.creatorId}-${email.campaignId}`;
        
        if (!threadMap.has(key)) {
          threadMap.set(key, {
            id: key,
            creatorId: email.creatorId,
            creator: email.creator,
            campaignId: email.campaignId,
                         campaign: { 
               id: email.campaign?.id || email.campaignId, 
               name: email.campaign?.name || 'Unknown Campaign', 
               budget: email.campaign?.budget || 0 
             },
            emails: [],
            status: getThreadStatus(email.status),
            priority: Math.random() > 0.5 ? 'high' : 'medium', // Random for demo
            lastActivity: email.sentAt || email.createdAt,
            estimatedValue: Math.floor(Math.random() * 50000) + 10000, // Random for demo
            notes: []
          });
        }
        
        const thread = threadMap.get(key)!;
        thread.emails.push(email);
        
        // Update last activity
        if (email.sentAt && new Date(email.sentAt) > new Date(thread.lastActivity)) {
          thread.lastActivity = email.sentAt;
        }
      });
      
      setThreads(Array.from(threadMap.values()).sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      ));
      
    } catch (error) {
      toast.error('Failed to load CRM data');
    } finally {
      setIsLoading(false);
    }
  };

  const getThreadStatus = (emailStatus: string): CRMEmailThread['status'] => {
    switch (emailStatus) {
      case 'draft': return 'lead';
      case 'sent': return 'contacted';
      case 'opened': return 'responding';
      case 'replied': return 'negotiating';
      default: return 'lead';
    }
  };

  useEffect(() => {
    loadCRMData();
  }, []);

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || thread.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || thread.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'responding': return 'bg-green-100 text-green-800';
      case 'negotiating': return 'bg-yellow-100 text-yellow-800';
      case 'contract_sent': return 'bg-purple-100 text-purple-800';
      case 'signed': return 'bg-emerald-100 text-emerald-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lead': return <Users className="w-4 h-4" />;
      case 'contacted': return <Mail className="w-4 h-4" />;
      case 'responding': return <Reply className="w-4 h-4" />;
      case 'negotiating': return <DollarSign className="w-4 h-4" />;
      case 'contract_sent': return <FileText className="w-4 h-4" />;
      case 'signed': return <Handshake className="w-4 h-4" />;
      case 'closed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading CRM data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CRM Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#222222]">Creator Relationship Management</h2>
          <p className="text-gray-600">Track conversations, negotiations, and contracts</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search creators or campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="responding">Responding</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="contract_sent">Contract Sent</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CRM Table */}
      <Card className="rounded-2xl border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Creator Conversations ({filteredThreads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {thread.creator.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{thread.creator.name}</h4>
                    <p className="text-sm text-gray-600">{thread.campaign.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                                             <Badge className={`${getStatusColor(thread.status)} text-xs`}>
                         {getStatusIcon(thread.status)}
                         <span className="ml-1">{thread.status.replace('_', ' ')}</span>
                       </Badge>
                      <Badge variant="outline" className="text-xs">
                        {thread.emails.length} emails
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${thread.estimatedValue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(thread.lastActivity).toLocaleDateString()}
                  </p>
                  <Badge 
                    variant={thread.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs mt-1"
                  >
                    {thread.priority} priority
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredThreads.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversations found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Start by sending outreach emails to creators'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Modal */}
      {selectedThread && (
        <ConversationView
          thread={selectedThread}
          onClose={() => setSelectedThread(null)}
          onUpdate={(updatedThread) => {
            setThreads(prev => prev.map(t => t.id === updatedThread.id ? updatedThread : t));
            setSelectedThread(updatedThread);
          }}
        />
      )}
    </div>
  );
};

export default CRMDashboard; 