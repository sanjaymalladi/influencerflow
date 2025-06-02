import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import { outreachAPI, campaignsAPI, OutreachStats, OutreachEmail, Campaign } from '@/services/apiService';
import { geminiEmailService, PersonalizedEmailRequest, PersonalizedEmailResponse } from '@/services/geminiEmailService';
import Navigation from "@/components/Navigation";
import EmailPipeline from "@/components/EmailPipeline";
import CRMDashboard from "@/components/CRMDashboard";
import PendingApprovals from "@/components/PendingApprovals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Users, TrendingUp, Clock, Zap, Plus, Send, Eye, Reply, X, CheckCircle2, Check, Edit3, Save, ArrowRight, ArrowLeft, BarChart3, GitBranch, MessageSquare, UserCircle, Briefcase, Sparkles } from "lucide-react";
import { toast } from 'sonner';
import mockData from '../data/mock-negotiation-data.json';

// Email Preview Component
const EmailPreviewDialog = ({ 
  emails, 
  isOpen, 
  onClose, 
  onApprove, 
  onEdit, 
  isSending 
}: {
  emails: PersonalizedEmailResponse[];
  isOpen: boolean;
  onClose: () => void;
  onApprove: (emails: PersonalizedEmailResponse[]) => void;
  onEdit: (index: number, email: PersonalizedEmailResponse) => void;
  isSending: boolean;
}) => {
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [editingEmail, setEditingEmail] = useState<PersonalizedEmailResponse | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const currentEmail = emails[currentEmailIndex];

  const handleEditEmail = (email: PersonalizedEmailResponse) => {
    setEditingEmail(email);
    setEditedSubject(email.subject);
    setEditedBody(email.body);
  };

  const handleSaveEdit = () => {
    if (editingEmail) {
      const updatedEmail: PersonalizedEmailResponse = {
        ...editingEmail,
        subject: editedSubject,
        body: editedBody
      };
      onEdit(currentEmailIndex, updatedEmail);
      setEditingEmail(null);
      toast.success('Email updated successfully!');
    }
  };

  const handleCancelEdit = () => {
    setEditingEmail(null);
    setEditedSubject('');
    setEditedBody('');
  };

  if (!isOpen || !emails.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-[#222222] flex items-center gap-2">
            <Eye className="w-6 h-6" />
            Review AI-Generated Emails ({currentEmailIndex + 1} of {emails.length})
          </DialogTitle>
          <DialogDescription>
            Review and customize each personalized email before sending to creators. You can edit any email individually to ensure it meets your requirements.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Review each personalized email before sending. You can edit any email individually.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentEmailIndex(Math.max(0, currentEmailIndex - 1))}
                disabled={currentEmailIndex === 0}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-500 px-2">
                {currentEmailIndex + 1} / {emails.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentEmailIndex(Math.min(emails.length - 1, currentEmailIndex + 1))}
                disabled={currentEmailIndex === emails.length - 1}
                className="rounded-xl"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Creator Info Sidebar */}
          <div className="w-1/4 bg-gray-50 rounded-xl p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">Creator Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span>
                <p className="text-gray-600">{currentEmail?.creator.name}</p>
              </div>
              <div>
                <span className="font-medium">Niche:</span>
                <p className="text-gray-600">{currentEmail?.creator.niche}</p>
              </div>
              {currentEmail?.creator.subscriberCount && (
                <div>
                  <span className="font-medium">Subscribers:</span>
                  <p className="text-gray-600">{currentEmail.creator.subscriberCount}</p>
                </div>
              )}
              {currentEmail?.creator.engagementRate && (
                <div>
                  <span className="font-medium">Engagement:</span>
                  <p className="text-gray-600">{currentEmail.creator.engagementRate}</p>
                </div>
              )}
            </div>

            {/* Creator List */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">All Creators</h4>
              <div className="space-y-1">
                {emails.map((email, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentEmailIndex(index)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                      index === currentEmailIndex 
                        ? 'bg-[#FFE600] text-[#222222]' 
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {email.creator.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="h-full p-1">
              {editingEmail ? (
                /* Edit Mode */
                <div className="space-y-4 h-full">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Edit3 className="w-5 h-5" />
                      Editing Email for {editingEmail.creator.name}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div>
                      <Label htmlFor="edit-subject">Subject Line</Label>
                      <Input
                        id="edit-subject"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="edit-body">Email Body</Label>
                      <Textarea
                        id="edit-body"
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        rows={20}
                        className="rounded-xl w-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview Mode */
                <div className="space-y-4 h-full">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Email Preview for {currentEmail?.creator.name}
                    </h3>
                    <Button
                      variant="outline"
                      onClick={() => handleEditEmail(currentEmail)}
                      className="rounded-xl"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Email
                    </Button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 flex-1">
                    <div className="border-b border-gray-200 pb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">To:</span>
                          <p className="text-gray-900">{currentEmail?.creator.name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">From:</span>
                          <p className="text-gray-900">Campaign Manager</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Subject:</span>
                      <p className="text-gray-900 font-medium mt-1">{currentEmail?.subject}</p>
                    </div>

                    <div className="flex-1">
                      <span className="font-medium text-gray-600">Message:</span>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                          {currentEmail?.body}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 bg-white flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-6 h-12"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                // Generate new emails
                toast.info('🤖 Regenerating emails with Gemini AI...');
                onClose();
              }}
              className="rounded-xl px-4 h-12"
            >
              🤖 Regenerate All
            </Button>
            <Button
              onClick={() => onApprove(emails)}
              disabled={isSending || editingEmail !== null}
              className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-8 h-12"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending to {emails.length} creators...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Approve & Send All ({emails.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Outreach = () => {
  const { user, isAuthenticated, login } = useAuth();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; subject: string; body: string }>>([]);
  const [selectedCreators, setSelectedCreators] = useState<Array<{ id: string; name: string; niche: string }>>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  
  // New state for email preview
  const [generatedEmails, setGeneratedEmails] = useState<PersonalizedEmailResponse[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);

  // State for mock data driven view
  const [showMockData, setShowMockData] = useState(true);

  const [formData, setFormData] = useState({
    campaignId: '',
    creatorId: '',
    subject: '',
    body: '',
    template: ''
  });

  const [bulkFormData, setBulkFormData] = useState({
    campaignId: '',
    subject: '',
    body: '',
    template: ''
  });

  const loadData = async (showToast = false) => {
    setIsLoading(true);
    try {
      if (showToast) console.log('🔄 Refreshing outreach dashboard data...');
      
      if (!isAuthenticated) {
        console.log('Not authenticated, attempting auto-login...');
        await login('demo@influencerflow.com', 'password123');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (showMockData) {
        console.log('📊 Loading mock negotiation data for display...');
        const mockOutreachEmail: OutreachEmail = {
          id: mockData.outreachEmail.id,
          campaignId: mockData.outreachEmail.campaignId,
          creatorId: mockData.outreachEmail.creatorId,
          subject: mockData.outreachEmail.subject,
          body: mockData.outreachEmail.content,
          status: mockData.outreachEmail.status as OutreachEmail['status'],
          recipientEmail: mockData.outreachEmail.recipientEmail,
          provider: mockData.outreachEmail.provider,
          sentAt: mockData.outreachEmail.sentAt,
          createdAt: mockData.outreachEmail.createdAt,
          updatedAt: mockData.outreachEmail.updatedAt,
          messageId: mockData.outreachEmail.trackingData.messageId,
          createdBy: mockData.outreachEmail.userId,
        };
        setEmails([mockOutreachEmail]);

        const mockCampaign: Campaign = {
          id: mockData.campaign.id,
          name: mockData.campaign.name,
          description: mockData.campaign.description,
          status: mockData.campaign.status as Campaign['status'],
          budget: 10000,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          goals: [],
          deliverables: [],
        };
        setCampaigns([mockCampaign]);
        
        const replied = mockData.conversation.messages.some(m => m.sender_type === 'creator');
        const mockStats: OutreachStats = {
          totalEmails: 1,
          sentEmails: 1,
          openedEmails: mockData.conversation.messages.length > 1 ? 1 : 0,
          repliedEmails: replied ? 1 : 0,
          openRate: mockData.conversation.messages.length > 1 ? 100 : 0,
          responseRate: replied ? 100 : 0,
        };
        setStats(mockStats);

        const templatesData = await outreachAPI.getTemplates();
        setTemplates(templatesData);

        if (showToast) toast.success('📊 Mock data loaded successfully!');

      } else {
        const [statsData, emailsData, campaignsData, templatesData] = await Promise.all([
          outreachAPI.getStats(),
          outreachAPI.getEmails(),
          campaignsAPI.getCampaigns(),
          outreachAPI.getTemplates()
        ]);
        
        console.log('📊 Loaded outreach data from API:', {
          stats: statsData,
          emailsCount: emailsData.emails.length,
          campaignsCount: campaignsData.campaigns?.length || 0
        });
        
        setStats(statsData);
        setEmails(emailsData.emails);
        setTemplates(templatesData);

        if (campaignsData.campaigns && campaignsData.campaigns.length > 0) {
          setCampaigns(campaignsData.campaigns);
        } else {
          setCampaigns([
            {
              id: 'fallback-campaign-1',
              name: 'Fallback Tech Product Launch Q1 2024',
              description: 'Fallback campaign for new smartphone.',
              budget: 50000, startDate: '2024-01-15', endDate: '2024-03-15', status: 'active',
              goals: ['Brand Awareness', 'Product Reviews'],
              deliverables: [{ type: 'Video Review', quantity: 5, price: 5000 }],
              createdAt: new Date().toISOString()
            }
          ]);
        }
        if (showToast) toast.success('✅ Dashboard data refreshed successfully!');
      }

    } catch (error: any) {
      console.error('❌ Failed to load outreach data:', error);
      toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
      setCampaigns([
        {
          id: 'fallback-campaign-1',
          name: 'Fallback Tech Product Launch Q1 2024',
          description: 'Fallback campaign for new smartphone.',
          budget: 50000, startDate: '2024-01-15', endDate: '2024-03-15', status: 'active',
          goals: ['Brand Awareness', 'Product Reviews'],
          deliverables: [{ type: 'Video Review', quantity: 5, price: 5000 }],
          createdAt: new Date().toISOString()
        }
      ]);
             setEmails([]);
       setStats({ totalEmails: 0, sentEmails: 0, openedEmails: 0, repliedEmails: 0, openRate: 0, responseRate: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeFromURL = async () => {
      if (!isAuthenticated) {
        try {
          console.log('Auto-logging in demo user...');
          await login('demo@influencerflow.com', 'password123');
        } catch (error) {
          console.error('Auto-login failed:', error);
        }
      }
      
      await loadData();
      
      const creatorsParam = searchParams.get('creators');
      const campaignParam = searchParams.get('campaign');
      
      if (creatorsParam) {
        try {
          const creators = JSON.parse(decodeURIComponent(creatorsParam));
          setSelectedCreators(creators);
          
          setBulkFormData({
            campaignId: campaignParam || (campaigns.length > 0 ? campaigns[0].id : ''),
            subject: 'AI will generate personalized subjects',
            body: `🤖 AI Personalization Enabled

Each creator will receive a unique, personalized email generated by Gemini AI that includes:

✨ Personalized subject line tailored to their content
📝 Campaign details and deliverables
💰 Specific compensation information
🎯 References to their niche and expertise
📊 Professional tone matching their audience

The AI will automatically include all campaign information and create compelling, individual messages for each creator.`,
            template: ''
          });
          
          setIsCreateDialogOpen(true);
        } catch (error) {
          console.error('Failed to parse creators from URL:', error);
        }
      }
    };

    initializeFromURL();
  }, [searchParams, isAuthenticated, login, showMockData]);

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await outreachAPI.createEmail({
        campaignId: formData.campaignId,
        creatorId: formData.creatorId,
        subject: formData.subject,
        body: formData.body
      });
      
      toast.success('Email created successfully!');
      setIsCreateDialogOpen(false);
      setFormData({ campaignId: '', creatorId: '', subject: '', body: '', template: '' });
      loadData();
    } catch (error: any) {
      console.error('Failed to create email:', error);
      toast.error(error.response?.data?.error || 'Failed to create email');
    }
  };

  const handleBulkOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCreators.length === 0) {
      toast.error('No creators selected');
      return;
    }

    if (!bulkFormData.campaignId) {
      toast.error('Please select a campaign');
      return;
    }

    try {
      setIsGeneratingEmails(true);
      
      const selectedCampaign = campaigns.find(c => c.id === bulkFormData.campaignId);
      if (!selectedCampaign) {
        throw new Error('Campaign not found');
      }

      toast.info('🤖 Generating personalized emails with AI...');

      const emailRequests: PersonalizedEmailRequest[] = selectedCreators.map(creator => {
        const enhancedCreator = {
          id: creator.id,
          name: creator.name,
          niche: creator.niche,
          subscriberCount: (creator as any).subscriberCount || 'Not specified',
          categories: creator.niche ? [creator.niche] : [],
          bio: (creator as any).bio || 'Content creator specializing in ' + creator.niche,
          engagementRate: (creator as any).engagementRate || 'Not specified'
        };

        return {
          creator: enhancedCreator,
          campaign: {
            id: selectedCampaign.id,
            name: selectedCampaign.name,
            description: selectedCampaign.description,
            budget: selectedCampaign.budget,
            goals: selectedCampaign.goals || [],
            deliverables: selectedCampaign.deliverables || []
          },
          senderName: user?.name || 'Campaign Manager',
          companyName: user?.company || 'Our Company'
        };
      });

      const personalizedEmails = await geminiEmailService.generateBulkPersonalizedEmails(emailRequests);
      
      toast.success('✨ AI-generated personalized emails created!');
      
      setGeneratedEmails(personalizedEmails);
      setIsCreateDialogOpen(false);
      setIsPreviewOpen(true);
      
    } catch (error: any) {
      console.error('Failed to generate emails:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate emails';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsGeneratingEmails(false);
    }
  };

  const handleApproveAndSendEmails = async (emails: PersonalizedEmailResponse[]) => {
    try {
      setIsSendingBulk(true);
      toast.info('📧 Sending approved emails to creators...');

      const outreachPromises = emails.map(async (emailData) => {
        const email = await outreachAPI.createEmail({
          campaignId: bulkFormData.campaignId,
          creatorId: emailData.creator.id,
          subject: emailData.subject,
          body: emailData.body
        });
        
        await outreachAPI.sendEmail(email.id);
        return { email, creator: emailData.creator };
      });

      const results = await Promise.all(outreachPromises);
      
      toast.success(`🎉 Personalized outreach sent to ${emails.length} creators!`, {
        description: `Each creator received a unique, AI-crafted email tailored to their content and the campaign details.`
      });
      
      setIsPreviewOpen(false);
      setSelectedCreators([]);
      setBulkFormData({ campaignId: '', subject: '', body: '', template: '' });
      setGeneratedEmails([]);
      
      await loadData(true);
    } catch (error: any) {
      console.error('Failed to send emails:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send emails';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleEditEmail = (index: number, updatedEmail: PersonalizedEmailResponse) => {
    setGeneratedEmails(prev => {
      const newEmails = [...prev];
      newEmails[index] = updatedEmail;
      return newEmails;
    });
  };

  const handleSendEmail = async (emailId: string) => {
    try {
      console.log('📧 Sending email from Outreach dashboard:', emailId);
      
      const updatedEmail = await outreachAPI.sendEmail(emailId);
      
      console.log('✅ Email sent successfully from dashboard:', updatedEmail);
      
      toast.success('Email sent successfully!', {
        description: `Email status updated to: ${updatedEmail.status}`
      });
      
      await loadData(true);
    } catch (error: any) {
      console.error('❌ Failed to send email from dashboard:', error);
      toast.error(error.response?.data?.error || 'Failed to send email');
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template: templateId,
        subject: template.subject,
        body: template.body
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'opened': return 'bg-green-100 text-green-800';
      case 'replied': return 'bg-purple-100 text-purple-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-3 h-3" />;
      case 'opened': return <Eye className="w-3 h-3" />;
      case 'replied': return <Reply className="w-3 h-3" />;
      default: return <Mail className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading outreach data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#222222] mb-2">Outreach Campaigns</h1>
            <p className="text-gray-600">
              {showMockData ? "Displaying Mock Negotiation Data" : "Manage and track your creator outreach campaigns"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setShowMockData(!showMockData);
              }}
              className="rounded-xl"
            >
              {showMockData ? "Show Live Data" : "Show Mock Data"}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
            <Button className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  New Email
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-[#222222]">
                    {selectedCreators.length > 0 ? (
                      <div className="flex items-center gap-2">
                        🤖 AI-Powered Bulk Outreach to {selectedCreators.length} Creators
                      </div>
                    ) : (
                      'Create New Outreach Email'
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCreators.length > 0 ? (
                      `Generate personalized emails for ${selectedCreators.length} selected creators using AI.`
                    ) : (
                      'Create and send individual outreach emails to specific creators.'
                    )}
                  </DialogDescription>
                  {selectedCreators.length > 0 && bulkFormData.campaignId && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        For campaign: {campaigns.find(c => c.id === bulkFormData.campaignId)?.name || 'Selected Campaign'}
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800 font-medium">
                          ✨ Gemini AI will generate unique, personalized emails for each creator with campaign details
                        </p>
                      </div>
                    </div>
                  )}
                </DialogHeader>

                {selectedCreators.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-[#FFE600] bg-opacity-10 p-4 rounded-xl">
                      <h3 className="font-semibold text-[#222222] mb-2 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Selected Creators ({selectedCreators.length})
                      </h3>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {selectedCreators.map((creator, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {creator.name}
                            <button
                              type="button"
                              onClick={() => setSelectedCreators(prev => prev.filter((_, i) => i !== index))}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleBulkOutreach} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulk-campaign">Campaign</Label>
                        <Select 
                          value={bulkFormData.campaignId}
                          onValueChange={(value) => setBulkFormData(prev => ({ ...prev, campaignId: value }))}
                          required
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {campaigns.length === 0 ? (
                              <SelectItem value="" disabled>
                                {showMockData && mockData.campaign ? mockData.campaign.name : "No campaigns available"}
                              </SelectItem>
                            ) : (
                              campaigns.map((campaign) => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{campaign.name}</span>
                                    <span className="text-xs text-gray-500">
                                      Budget: ${campaign.budget?.toLocaleString()} • Status: {campaign.status}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {bulkFormData.campaignId && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Campaign pre-selected from workflow
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bulk-subject" className="flex items-center gap-2">
                          🤖 AI-Generated Subject Lines
                          <Badge variant="secondary" className="text-xs">
                            Powered by Gemini
                          </Badge>
                        </Label>
                        <Input
                          id="bulk-subject"
                          value={bulkFormData.subject}
                          onChange={(e) => setBulkFormData(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="AI will generate personalized subjects for each creator"
                          className="rounded-xl bg-gray-50"
                          disabled
                        />
                        <p className="text-xs text-blue-600">
                          🎯 AI will create unique subject lines based on each creator's content and campaign details
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bulk-body" className="flex items-center gap-2">
                          🤖 AI-Generated Email Content
                          <Badge variant="secondary" className="text-xs">
                            Powered by Gemini
                          </Badge>
                        </Label>
                        <Textarea
                          id="bulk-body"
                          value={bulkFormData.body}
                          onChange={(e) => setBulkFormData(prev => ({ ...prev, body: e.target.value }))}
                          placeholder="AI will generate personalized email content..."
                          rows={12}
                          className="rounded-xl bg-gray-50"
                          disabled
                        />
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs text-green-800 font-medium mb-2">
                            ✨ Gemini AI will generate personalized emails for your review:
                          </p>
                          <ul className="text-xs text-green-700 space-y-1">
                            <li>• Creator-specific content references</li>
                            <li>• Complete campaign details and budget</li>
                            <li>• Professional tone matching their audience</li>
                            <li>• Preview and edit before sending</li>
                            <li>• Approve individual or all emails</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreateDialogOpen(false);
                            setSelectedCreators([]);
                          }}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                                              <Button 
                          type="submit"
                          disabled={isGeneratingEmails}
                          className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
                        >
                          {isGeneratingEmails ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              🤖 Generating emails for {selectedCreators.length} creators...
                            </>
                          ) : (
                            <>
              <Zap className="w-4 h-4 mr-2" />
                              🤖 Generate AI Emails for Review
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handleCreateEmail} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="campaign">Campaign</Label>
                        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, campaignId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {campaigns.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template">Template (Optional)</Label>
                        <Select onValueChange={handleTemplateChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="creatorId">Creator ID</Label>
                      <Input
                        id="creatorId"
                        value={formData.creatorId}
                        onChange={(e) => setFormData(prev => ({ ...prev, creatorId: e.target.value }))}
                        placeholder="Enter creator ID"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Email subject"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="body">Message</Label>
                      <Textarea
                        id="body"
                        value={formData.body}
                        onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="Your outreach message..."
                        rows={6}
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
            </Button>
                      <Button type="submit">Create Email</Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="outreach" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="pipeline">Negotiation Flow</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
            <TabsTrigger value="ai-approvals">AI Approvals</TabsTrigger>
          </TabsList>

          <TabsContent value="outreach" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#222222]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">
              {stats?.sentEmails || 0}
            </div>
            <div className="text-gray-600">Total Emails Sent</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#222222]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">
              {stats?.responseRate ? `${stats.responseRate.toFixed(1)}%` : '0%'}
            </div>
            <div className="text-gray-600">Response Rate</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#222222]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">
              {stats?.openedEmails || 0}
            </div>
            <div className="text-gray-600">Emails Opened</div>
          </Card>

          <Card className="p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <Reply className="w-5 h-5 text-[#222222]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#222222] mb-1">
              {stats?.repliedEmails || 0}
            </div>
            <div className="text-gray-600">Replies Received</div>
          </Card>
        </div>

        <Card className="rounded-2xl border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#222222]">
              {showMockData ? "Mock Outreach Email" : "Recent Emails"}
            </CardTitle>
            <CardDescription>
              {showMockData ? `Displaying the initial outreach email from mock data for campaign: ${mockData.campaign.name}` : "Track your outreach emails and responses"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emails.length === 0 && !showMockData ? (
              <div className="text-center py-8">
                <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No emails yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first outreach email to start connecting with creators
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Email
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {emails.map((email) => (
                  <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{email.subject}</h4>
                          <Badge className={`${getStatusColor(email.status)} flex items-center gap-1`}>
                            {getStatusIcon(email.status)}
                            {email.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{email.body}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Campaign: {campaigns.find(c => c.id === email.campaignId)?.name || 'Unknown'}</span>
                          <span>Creator: {showMockData ? mockData.creator.channelName : email.creatorId}</span>
                          {email.sentAt && <span>Sent: {new Date(email.sentAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {email.status === 'draft' && !showMockData && (
                          <Button
                            size="sm"
                            onClick={() => handleSendEmail(email.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            {showMockData ? (
              <Card className="rounded-2xl border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-[#222222] flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-[#FFE600]" />
                    Mock Negotiation Flow with {mockData.creator.channelName}
                  </CardTitle>
                  <CardDescription>
                    Campaign: {mockData.campaign.name} | Status: {mockData.conversation.stage}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6 max-h-[70vh] overflow-y-auto">
                  {mockData.conversation.messages.map((message, index) => {
                    const isUser = message.sender_type === 'user';
                    const isSystem = message.sender_type === 'system';
                    const isCreator = message.sender_type === 'creator';
                    const timestamp = message.sent_at || message.received_at || message.created_at;

                    return (
                      <div key={message.id || index} className={`flex flex-col ${isUser || isSystem ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
                          isUser ? 'bg-[#FFE600] text-[#222222] rounded-br-none' : 
                          isSystem ? 'bg-blue-500 text-white rounded-br-none' :
                          'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {isUser && <Briefcase className="w-4 h-4" />}
                            {isSystem && <Sparkles className="w-4 h-4" />}
                            {isCreator && <UserCircle className="w-4 h-4" />}
                            <span className="font-semibold text-sm">
                              {isUser ? mockData.user.name : isSystem ? "AI Assistant" : mockData.creator.channelName}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content_text}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2">
                              {message.attachments.map((att, attIndex) => (
                                <a 
                                  key={attIndex} 
                                  href={att.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <GitBranch className="w-3 h-3" />
                                  {att.fileName}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        {timestamp && (
                          <p className={`text-xs text-gray-400 mt-1 ${isUser || isSystem ? 'text-right' : 'text-left'}`}>
                            {new Date(timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <EmailPipeline />
            )}
          </TabsContent>

          <TabsContent value="crm" className="space-y-6">
            <CRMDashboard />
          </TabsContent>

          <TabsContent value="ai-approvals" className="space-y-6">
            <PendingApprovals onUpdate={loadData} />
          </TabsContent>
        </Tabs>

        <EmailPreviewDialog
          emails={generatedEmails}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onApprove={handleApproveAndSendEmails}
          onEdit={handleEditEmail}
          isSending={isSendingBulk}
        />
      </div>
    </div>
  );
};

export default Outreach;
