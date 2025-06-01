import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Target, DollarSign, Calendar, Users, ChevronRight, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { campaignsAPI, outreachAPI, Campaign } from '@/services/apiService';
import type { CreatorProfile } from '@/types/creator';

interface CampaignSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCreators: CreatorProfile[];
  onComplete: () => void;
}

const CampaignSelectionModal: React.FC<CampaignSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedCreators,
  onComplete
}) => {
  const [step, setStep] = useState<'select-campaign' | 'customize-outreach' | 'preview'>('select-campaign');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Outreach customization
  const [emailSubject, setEmailSubject] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
      setStep('select-campaign');
      setSelectedCampaign(null);
      setEmailSubject('');
      setEmailTemplate('');
      setCustomMessage('');
    }
  }, [isOpen]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await campaignsAPI.getCampaigns();
      setCampaigns(data.campaigns.filter(c => c.status === 'active' || c.status === 'draft'));
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignSelect = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEmailSubject(`Partnership Opportunity: ${campaign.name}`);
    setEmailTemplate(`Hi {{creator_name}},

I hope this message finds you well! I've been following your content and I'm really impressed by your work in {{creator_niche}}.

I'm reaching out on behalf of ${campaign.name} - we're looking to partner with talented creators like yourself for an exciting collaboration opportunity.

**Campaign Details:**
- Budget: $${campaign.budget.toLocaleString()}
- Duration: ${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}
- Deliverables: ${campaign.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')}

${campaign.description}

We believe your unique voice and engaged audience would be perfect for this campaign. We're offering competitive compensation and would love to discuss the details further.

Would you be interested in learning more about this partnership opportunity?

Best regards,
{{sender_name}}`);
  };

  const handleSendOutreach = async () => {
    if (!selectedCampaign) {
      toast.error('Please select a campaign');
      return;
    }

    try {
      setIsSending(true);
      
      // Create and send outreach emails for each selected creator
      const outreachPromises = selectedCreators.map(async (creator, index) => {
        // Create a fresh copy of the template for each creator to avoid shared state issues
        const personalizedSubject = emailSubject.replace(/{{creator_name}}/g, creator.channelName);
        const personalizedBody = emailTemplate
          .replace(/{{creator_name}}/g, creator.channelName)
          .replace(/{{creator_niche}}/g, creator.categories?.join(', ') || 'your niche')
          .replace(/{{sender_name}}/g, 'Your Campaign Manager');

        console.log(`Creating personalized email ${index + 1}/${selectedCreators.length} for ${creator.channelName}:`, {
          subject: personalizedSubject,
          bodyPreview: personalizedBody.substring(0, 100) + '...'
        });

        // First create the email
        const email = await outreachAPI.createEmail({
          campaignId: selectedCampaign.id,
          creatorId: creator.id,
          subject: personalizedSubject,
          body: personalizedBody
        });
        
        // Then send it
        await outreachAPI.sendEmail(email.id);
        return email;
      });

      await Promise.all(outreachPromises);
      
      toast.success(`Personalized outreach sent to ${selectedCreators.length} creators!`, {
        description: `Each creator received a unique, personalized email with their name and content details.`
      });
      onComplete();
      onClose();
    } catch (error: any) {
      console.error('Failed to send outreach:', error);
      toast.error(error.response?.data?.error || 'Failed to send outreach');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderCampaignSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#222222] mb-2">
          Select Campaign
        </h3>
        <p className="text-gray-600 text-sm">
          Choose which campaign to send outreach for ({selectedCreators.length} creators selected)
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#FFE600]" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active campaigns available</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4 rounded-xl"
            onClick={() => window.open('/campaigns', '_blank')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {campaigns.map((campaign) => (
            <Card 
              key={campaign.id}
              className={`cursor-pointer transition-all rounded-xl border-2 ${
                selectedCampaign?.id === campaign.id 
                  ? 'border-[#FFE600] bg-[#FFE600] bg-opacity-5' 
                  : 'border-gray-200 hover:border-[#FFE600] hover:bg-gray-50'
              }`}
              onClick={() => handleCampaignSelect(campaign)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-[#222222]">
                      {campaign.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {campaign.description}
                    </CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(campaign.status)} border rounded-full px-2 py-1 text-xs`}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium ml-1">${campaign.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium ml-1">
                      {Math.ceil((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <Target className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Deliverables:</span>
                  <span className="font-medium ml-1">
                    {campaign.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          Cancel
        </Button>
        <Button 
          onClick={() => setStep('customize-outreach')}
          disabled={!selectedCampaign}
          className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
        >
          Next: Customize Outreach
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderCustomizeOutreach = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#222222] mb-2">
          Customize Outreach
        </h3>
        <p className="text-gray-600 text-sm">
          Personalize your outreach message for {selectedCampaign?.name}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-sm font-semibold text-[#222222]">
            Email Subject
          </Label>
          <Input
            id="subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Subject line"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template" className="text-sm font-semibold text-[#222222]">
            Email Template
          </Label>
          <Textarea
            id="template"
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            placeholder="Email template with {{creator_name}} and {{creator_niche}} placeholders"
            rows={12}
            className="rounded-xl"
          />
          <p className="text-xs text-gray-500">
            Use {{creator_name}} and {{creator_niche}} as placeholders for personalization
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={() => setStep('select-campaign')}
          className="rounded-xl"
        >
          Back
        </Button>
        <Button 
          onClick={() => setStep('preview')}
          className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
        >
          Preview & Send
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#222222] mb-2">
          Preview & Send
        </h3>
        <p className="text-gray-600 text-sm">
          Review your outreach before sending to {selectedCreators.length} creators
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div>
          <Label className="text-sm font-semibold text-[#222222]">Campaign</Label>
          <p className="text-sm text-gray-600">{selectedCampaign?.name}</p>
        </div>
        
        <div>
          <Label className="text-sm font-semibold text-[#222222]">Recipients</Label>
          <p className="text-sm text-gray-600">
            {selectedCreators.slice(0, 3).map(c => c.channelName).join(', ')}
            {selectedCreators.length > 3 && ` +${selectedCreators.length - 3} more`}
          </p>
        </div>

        <div>
          <Label className="text-sm font-semibold text-[#222222]">Subject</Label>
          <p className="text-sm text-gray-600">{emailSubject}</p>
        </div>

        <div>
          <Label className="text-sm font-semibold text-[#222222]">Message Preview</Label>
          <div className="bg-white p-3 rounded-lg border text-sm">
            {emailTemplate.split('\n').slice(0, 4).map((line, i) => (
              <p key={i} className="text-gray-700 mb-1">
                {line.replace(/{{creator_name}}/g, selectedCreators[0]?.channelName || 'Creator')}
              </p>
            ))}
            {emailTemplate.split('\n').length > 4 && (
              <p className="text-gray-500 italic">... and more</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={() => setStep('customize-outreach')}
          className="rounded-xl"
        >
          Back
        </Button>
        <Button 
          onClick={handleSendOutreach}
          disabled={isSending}
          className="bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Outreach
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#222222] flex items-center">
            <Mail className="h-6 w-6 mr-2 text-[#FFE600]" />
            Send Outreach
          </DialogTitle>
        </DialogHeader>

        {step === 'select-campaign' && renderCampaignSelection()}
        {step === 'customize-outreach' && renderCustomizeOutreach()}
        {step === 'preview' && renderPreview()}
      </DialogContent>
    </Dialog>
  );
};

export default CampaignSelectionModal; 