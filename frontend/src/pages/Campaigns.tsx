import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { campaignsAPI, Campaign } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Calendar, DollarSign, Target, Users, Edit, Trash2, TrendingUp, Eye, PlayCircle, Zap, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';

const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    goals: [] as string[],
    deliverables: [{ type: '', quantity: '', price: '' }]
  });

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await campaignsAPI.getCampaigns();
      setCampaigns(data.campaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campaignData = {
        name: formData.name,
        description: formData.description,
        budget: Number(formData.budget),
        startDate: formData.startDate,
        endDate: formData.endDate,
        goals: formData.goals,
        deliverables: formData.deliverables.map(d => ({
          type: d.type,
          quantity: Number(d.quantity),
          price: Number(d.price)
        }))
      };

      await campaignsAPI.createCampaign(campaignData);
      toast.success('Campaign created successfully!');
      setIsCreateDialogOpen(false);
      resetForm();
      loadCampaigns();
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      budget: '',
      startDate: '',
      endDate: '',
      goals: [],
      deliverables: [{ type: '', quantity: '', price: '' }]
    });
  };

  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, { type: '', quantity: '', price: '' }]
    }));
  };

  const updateDeliverable = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((d, i) => 
        i === index ? { ...d, [field]: value } : d
      )
    }));
  };

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="h-3 w-3" />;
      case 'draft': return <Edit className="h-3 w-3" />;
      case 'paused': return <Target className="h-3 w-3" />;
      case 'completed': return <TrendingUp className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  const canCreateCampaigns = user?.role === 'brand' || user?.role === 'agency';

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description,
      budget: campaign.budget.toString(),
      startDate: campaign.startDate.split('T')[0],
      endDate: campaign.endDate.split('T')[0],
      goals: campaign.goals || [],
      deliverables: campaign.deliverables.map(d => ({
        type: d.type,
        quantity: d.quantity.toString(),
        price: d.price.toString()
      }))
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    try {
      const campaignData = {
        name: formData.name,
        description: formData.description,
        budget: Number(formData.budget),
        startDate: formData.startDate,
        endDate: formData.endDate,
        goals: formData.goals,
        deliverables: formData.deliverables.map(d => ({
          type: d.type,
          quantity: Number(d.quantity),
          price: Number(d.price)
        }))
      };

      await campaignsAPI.updateCampaign(selectedCampaign.id, campaignData);
      toast.success('Campaign updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedCampaign(null);
      resetForm();
      loadCampaigns();
    } catch (error: any) {
      console.error('Failed to update campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to update campaign');
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      setIsUpdating(campaignId);
      await campaignsAPI.updateCampaignStatus(campaignId, newStatus);
      toast.success(`Campaign ${newStatus} successfully!`);
      loadCampaigns();
    } catch (error: any) {
      console.error('Failed to update campaign status:', error);
      toast.error(error.response?.data?.error || 'Failed to update campaign status');
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#FFE600]" />
            <p className="text-gray-600 text-lg">Loading campaigns...</p>
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
            <h1 className="text-4xl font-bold text-[#222222] mb-2">Campaigns</h1>
            <p className="text-gray-600">Manage your influencer marketing campaigns and track performance</p>
          </div>
          {canCreateCampaigns && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-[#222222]">Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Create a new influencer marketing campaign with specific goals, budget, and deliverables.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold text-[#222222]">Campaign Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter campaign name"
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-sm font-semibold text-[#222222]">Budget ($)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        placeholder="10000"
                        className="rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-[#222222]">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your campaign goals and requirements"
                      rows={4}
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-sm font-semibold text-[#222222]">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-sm font-semibold text-[#222222]">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-[#222222]">Deliverables</Label>
                    {formData.deliverables.map((deliverable, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                          <Input
                            placeholder="Type (e.g. Video Review)"
                            value={deliverable.type}
                            onChange={(e) => updateDeliverable(index, 'type', e.target.value)}
                            className="rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            placeholder="Quantity"
                            value={deliverable.quantity}
                            onChange={(e) => updateDeliverable(index, 'quantity', e.target.value)}
                            className="rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            placeholder="Price ($)"
                            value={deliverable.price}
                            onChange={(e) => updateDeliverable(index, 'price', e.target.value)}
                            className="rounded-xl"
                            required
                          />
                        </div>
                        <div>
                          {formData.deliverables.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeDeliverable(index)}
                              className="rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addDeliverable}
                      className="rounded-xl border-2 border-[#FFE600] text-[#222222] hover:bg-[#FFE600] hover:bg-opacity-10"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Deliverable
                    </Button>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="rounded-xl border-2 border-gray-200 px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6"
                    >
                      Create Campaign
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Campaign Stats */}
        {campaigns.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#222222]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#222222] mb-1">
                {campaigns.filter(c => c.status === 'active').length}
              </div>
              <div className="text-gray-600">Active Campaigns</div>
            </Card>

            <Card className="p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#222222]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#222222] mb-1">
                ${campaigns.reduce((total, c) => total + c.budget, 0).toLocaleString()}
              </div>
              <div className="text-gray-600">Total Budget</div>
            </Card>

            <Card className="p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#222222]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#222222] mb-1">
                {campaigns.reduce((total, c) => total + (c.applications?.length || 0), 0)}
              </div>
              <div className="text-gray-600">Total Applications</div>
            </Card>

            <Card className="p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#222222]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#222222] mb-1">
                {campaigns.filter(c => c.status === 'completed').length}
              </div>
              <div className="text-gray-600">Completed</div>
            </Card>
          </div>
        )}

        {campaigns.length === 0 ? (
          <Card className="rounded-2xl border border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-[#FFE600] to-[#E6CF00] rounded-full flex items-center justify-center mb-6">
                <Target className="h-10 w-10 text-[#222222]" />
              </div>
              <h3 className="text-2xl font-bold text-[#222222] mb-3">No campaigns yet</h3>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                {canCreateCampaigns 
                  ? 'Create your first campaign to start connecting with creators and managing your influencer partnerships'
                  : 'No campaigns available. Check back later or contact your account manager.'
                }
              </p>
              {canCreateCampaigns && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-all rounded-2xl border border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-[#222222] mb-2">{campaign.name}</CardTitle>
                      <CardDescription className="text-gray-600 line-clamp-2">{campaign.description}</CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(campaign.status)} border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-600">Budget</span>
                      </div>
                      <span className="font-semibold text-[#222222]">${campaign.budget.toLocaleString()}</span>
                    </div>

                    {campaign.applications && campaign.applications.length > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-600">Applications</span>
                        </div>
                        <span className="font-semibold text-[#222222]">{campaign.applications.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-600">Duration</span>
                    </div>
                    <span className="text-gray-600">
                      {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center mb-3">
                      <Target className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Deliverables</span>
                    </div>
                    <div className="space-y-2">
                      {campaign.deliverables.slice(0, 2).map((deliverable, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-xl flex items-center justify-between">
                          <span>{deliverable.quantity}x {deliverable.type}</span>
                          <span className="font-medium">${deliverable.price}</span>
                        </div>
                      ))}
                      {campaign.deliverables.length > 2 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{campaign.deliverables.length - 2} more deliverables
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    {/* Status and Primary Actions Row */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 rounded-xl border-2 border-gray-200 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 rounded-xl border-2 border-[#FFE600] text-[#222222] hover:bg-[#FFE600] hover:bg-opacity-10"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Outreach
                      </Button>
                    </div>

                    {/* Management Actions Row (for brand/agency users) */}
                    {canCreateCampaigns && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEdit(campaign)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        {campaign.status !== 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl border-2 border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => handleStatusChange(campaign.id, 'active')}
                            disabled={isUpdating === campaign.id}
                          >
                            {isUpdating === campaign.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <PlayCircle className="h-4 w-4 mr-1" />
                            )}
                            Activate
                          </Button>
                        )}
                        
                        {campaign.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl border-2 border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                            onClick={() => handleStatusChange(campaign.id, 'paused')}
                            disabled={isUpdating === campaign.id}
                          >
                            {isUpdating === campaign.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Pause className="h-4 w-4 mr-1" />
                            )}
                            Pause
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Campaign Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#222222]">Edit Campaign</DialogTitle>
              <DialogDescription>
                Update campaign details, budget, deliverables, and timeline for your influencer marketing campaign.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-semibold text-[#222222]">Campaign Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-budget" className="text-sm font-semibold text-[#222222]">Budget ($)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="10000"
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold text-[#222222]">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your campaign goals and requirements"
                  rows={4}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate" className="text-sm font-semibold text-[#222222]">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate" className="text-sm font-semibold text-[#222222]">End Date</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-semibold text-[#222222]">Deliverables</Label>
                {formData.deliverables.map((deliverable, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <Input
                        placeholder="Type (e.g. Video Review)"
                        value={deliverable.type}
                        onChange={(e) => updateDeliverable(index, 'type', e.target.value)}
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={deliverable.quantity}
                        onChange={(e) => updateDeliverable(index, 'quantity', e.target.value)}
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Price ($)"
                        value={deliverable.price}
                        onChange={(e) => updateDeliverable(index, 'price', e.target.value)}
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      {formData.deliverables.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDeliverable(index)}
                          className="rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addDeliverable}
                  className="rounded-xl border-2 border-[#FFE600] text-[#222222] hover:bg-[#FFE600] hover:bg-opacity-10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Deliverable
                </Button>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedCampaign(null);
                    resetForm();
                  }}
                  className="rounded-xl border-2 border-gray-200 px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold px-6"
                >
                  Update Campaign
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Campaigns; 