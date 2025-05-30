import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { outreachAPI, campaignsAPI, OutreachStats, OutreachEmail, Campaign } from '@/services/apiService';
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Mail, Users, TrendingUp, Clock, Zap, Plus, Send, Eye, Reply } from "lucide-react";
import { toast } from 'sonner';

const Outreach = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; subject: string; body: string }>>([]);

  const [formData, setFormData] = useState({
    campaignId: '',
    creatorId: '',
    subject: '',
    body: '',
    template: ''
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, emailsData, campaignsData, templatesData] = await Promise.all([
        outreachAPI.getStats(),
        outreachAPI.getEmails(),
        campaignsAPI.getCampaigns(),
        outreachAPI.getTemplates()
      ]);
      
      setStats(statsData);
      setEmails(emailsData.emails);
      setCampaigns(campaignsData.campaigns);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load outreach data:', error);
      toast.error('Failed to load outreach data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleSendEmail = async (emailId: string) => {
    try {
      await outreachAPI.sendEmail(emailId);
      toast.success('Email sent successfully!');
      loadData();
    } catch (error: any) {
      console.error('Failed to send email:', error);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#222222] mb-2">Outreach Campaigns</h1>
            <p className="text-gray-600">Manage and track your creator outreach campaigns</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6">
                <Plus className="w-4 h-4 mr-2" />
                New Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Outreach Email</DialogTitle>
              </DialogHeader>
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
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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

        {/* Email List */}
        <Card className="rounded-2xl border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#222222]">Recent Emails</CardTitle>
            <CardDescription>Track your outreach emails and responses</CardDescription>
          </CardHeader>
          <CardContent>
            {emails.length === 0 ? (
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
                          <span>Creator: {email.creatorId}</span>
                          {email.sentAt && <span>Sent: {new Date(email.sentAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {email.status === 'draft' && (
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
      </div>
    </div>
  );
};

export default Outreach;
