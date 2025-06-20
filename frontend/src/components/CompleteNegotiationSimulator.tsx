import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertCircle, Clock, User, Bot, Send, RefreshCw, Edit, Mail, Eye, MessageSquare, FileText, Handshake, DollarSign, Sparkles } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget?: number;
}

type MessageSender = 'user' | 'ai' | 'contact' | 'system';

interface EmailMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  subject?: string;
  isHumanActionPrompt?: boolean;
  humanActionResponse?: string;
}

enum NegotiationStage {
  INITIAL_EMAIL_DRAFTING = 'INITIAL_EMAIL_DRAFTING',
  INITIAL_EMAIL_PENDING_SEND = 'INITIAL_EMAIL_PENDING_SEND',
  WAITING_FOR_CONTACT_REPLY = 'WAITING_FOR_CONTACT_REPLY',
  AI_ANALYZING_REPLY = 'AI_ANALYZING_REPLY',
  AI_DRAFTING_REPLY = 'AI_DRAFTING_REPLY',
  AI_REPLY_PENDING_SEND = 'AI_REPLY_PENDING_SEND',
  HUMAN_INPUT_NEEDED = 'HUMAN_INPUT_NEEDED',
  CONTRACT_DRAFTING = 'CONTRACT_DRAFTING',
  CONTRACT_PENDING_VERIFICATION = 'CONTRACT_PENDING_VERIFICATION',
  CONTRACT_PENDING_SEND = 'CONTRACT_PENDING_SEND',
  WAITING_FOR_SIGNED_CONTRACT = 'WAITING_FOR_SIGNED_CONTRACT',
  CONTRACT_SIGNED_PENDING_VERIFICATION = 'CONTRACT_SIGNED_PENDING_VERIFICATION',
  NEGOTIATION_COMPLETE = 'NEGOTIATION_COMPLETE',
  ERROR = 'ERROR',
}

interface NegotiationTerms {
  videoLengthMinutes: number;
  instagramPosts: number;
  compensation: number;
  timeline: string;
  paymentTerms: string;
  exclusivity: boolean;
  revisions: number;
  usageRights: string;
}

interface CompleteNegotiationSimulatorProps {
  contact: Contact;
  campaign: Campaign;
  onComplete?: () => void;
}

// Predefined realistic conversation flow for Sanjay
const CONVERSATION_FLOW = [
  {
    stage: 1,
    sanjayReply: `Hey! Thanks for reaching out about the {campaignName} campaign. This sounds really interesting and aligns well with my content focus.

I'm definitely interested in learning more details about this collaboration. Could you share:

1. What are the specific deliverables you're expecting?
2. What's the timeline for content creation and delivery?  
3. Any specific guidelines or requirements I should be aware of?

Looking forward to hearing from you!

Best regards,
Sanjay`,
    aiResponse: `Hi Sanjay,

Great to hear you're interested! I'm excited to share more details about the collaboration.

**Detailed Deliverables:**
• **Main Video**: A 15-minute sponsored video showcasing the product
  - Full creative freedom to match your content style
  - Should include product demonstration and your honest review
  - We'll provide the product and key talking points
  
• **Social Media**: Currently no additional social posts required

**Timeline:**
• Product delivery: Within 1 week of contract signing
• Content creation: 3 weeks from product receipt
• Review process: 2-3 business days for our feedback
• Final delivery: Mutually agreed date

**Guidelines:**
• Keep your authentic voice and style
• Include our key messaging points (we'll provide a brief)
• Standard FTC disclosure requirements
• One round of minor revisions included

The compensation of $1200 covers all deliverables with payment split 50% upfront, 50% on delivery.

Does this sound good to you? Any questions or concerns?

Best regards,
InfluencerFlow Team`
  },
  {
    stage: 2,
    sanjayReply: `Thanks for the detailed information! The compensation of $1200 sounds fair for the scope of work.

I have one concern about the 15-minute video requirement. Based on my analytics, my audience retention typically drops significantly after 10 minutes. Would it be possible to create a 10-minute video instead? I believe this would actually deliver better engagement and results for the campaign.

Everything else looks great to me!

Best regards,
Sanjay`,
    requiresHumanInput: true,
    humanPrompt: `Sanjay wants to change the video length from 15 minutes to 10 minutes because his audience retention drops after 10 minutes. This is actually good for engagement. 

What's your decision?

Options:
1. Accept 10-minute video as-is
2. Accept 10-minute video but ask for 2 Instagram posts to compensate  
3. Negotiate something else

Please type your decision:`
  },
  {
    stage: 3,
    sanjayReply: `Perfect! A 10-minute video with 2 Instagram posts works great for me. I appreciate your flexibility on this.

The terms we've discussed sound good:
- 10-minute sponsored video
- 2 Instagram posts  
- $1200 compensation
- 3-week timeline

I'm ready to move forward with these deliverables. What are the next steps?

Best regards,
Sanjay`,
    triggerContract: true
  },
  {
    stage: 4,
    sanjayReply: `Thanks for sending over the contract! I've reviewed all the terms and they look good to me.

I've signed the contract and I'm attaching the signed copy to this email.

[📎 Signed Contract - Partnership Agreement.pdf]

Looking forward to starting this collaboration!

Best regards,
Sanjay`,
    isSignedContract: true
  }
];

const DEFAULT_TERMS: NegotiationTerms = {
  videoLengthMinutes: 15,
  instagramPosts: 0,
  compensation: 1200,
  timeline: '3 weeks',
  paymentTerms: '50% upfront, 50% on delivery',
  exclusivity: false,
  revisions: 2,
  usageRights: '1 year license'
};

let messageIdCounter = 0;
let conversationStage = 0;

const CompleteNegotiationSimulator: React.FC<CompleteNegotiationSimulatorProps> = ({ 
  contact, 
  campaign,
  onComplete 
}) => {
  const [emailThread, setEmailThread] = useState<EmailMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<NegotiationStage>(NegotiationStage.INITIAL_EMAIL_DRAFTING);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const [currentTerms, setCurrentTerms] = useState<NegotiationTerms>(DEFAULT_TERMS);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [humanInputPrompt, setHumanInputPrompt] = useState<string | null>(null);
  const [humanInputResponse, setHumanInputResponse] = useState<string>('');
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  const { toast } = useToast();

  const addMessageToThread = useCallback((message: EmailMessage) => {
    setEmailThread(prev => [...prev, message]);
  }, []);

  const resetNegotiation = () => {
    setEmailThread([]);
    setCurrentStage(NegotiationStage.INITIAL_EMAIL_DRAFTING);
    setIsLoading(false);
    setLoadingMessage('');
    setCurrentTerms(DEFAULT_TERMS);
    setAiDraft(null);
    setHumanInputPrompt(null);
    setHumanInputResponse('');
    conversationStage = 0;
    messageIdCounter = 0;
  };

  // Generate initial personalized email
  const generateInitialEmail = async (): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `Subject: Partnership Opportunity - ${campaign.name} | Perfect Fit for ${contact.name}

Hi ${contact.name},

I hope this email finds you well! I've been following your content and I'm genuinely impressed by your authentic approach to content creation.

I'm reaching out from InfluencerFlow about an exciting collaboration opportunity with ${campaign.name}. After reviewing your recent content and audience engagement, I believe you'd be the perfect fit for this campaign.

**Campaign Overview:**
• Project: ${campaign.name}
• Compensation: $${currentTerms.compensation}
• Deliverables: 1 sponsored video (${currentTerms.videoLengthMinutes} minutes)
• Timeline: ${currentTerms.timeline}
• Payment: ${currentTerms.paymentTerms}

**Why we chose you:**
• Your authentic voice aligns perfectly with our brand values
• Your audience demographic matches our target market  
• Your engagement rates and content quality are exceptional

We believe in fair partnerships and creative freedom. I'd love to discuss this opportunity further and answer any questions you might have.

Are you interested in learning more about this collaboration?

Best regards,
The InfluencerFlow Team
📧 partnerships@influencerflow.com

P.S. We're flexible on terms and open to your creative input!`;
  };

  // Generate AI response based on human input
  const generateAiResponseWithHumanInput = async (humanDecision: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (humanDecision.toLowerCase().includes('instagram') || humanDecision.toLowerCase().includes('2') || humanDecision.toLowerCase().includes('post')) {
      // Update terms to reflect the negotiation
      setCurrentTerms(prev => ({ 
        ...prev, 
        videoLengthMinutes: 10, 
        instagramPosts: 2 
      }));
      
      return `Hi Sanjay,

Thank you for bringing up the audience retention point - that's actually excellent insight! Based on your analytics, a 10-minute video would indeed deliver better engagement.

After discussing with my manager, we're happy to accommodate the 10-minute video format. However, to maintain the campaign value, we'd like to add 2 Instagram posts to the deliverables.

**Updated Terms:**
• 10-minute sponsored video (instead of 15 minutes)
• 2 Instagram posts (new addition)  
• Same compensation: $${currentTerms.compensation}
• Same timeline: ${currentTerms.timeline}

This way we get quality engagement with your authentic style, and you get content that performs well with your audience. Does this work for you?

Best regards,
InfluencerFlow Team`;
    }
    
    return `Hi Sanjay,

Thanks for your feedback. After reviewing your request with our team, here's what we can offer:

${humanDecision}

Looking forward to your response!

Best regards,
InfluencerFlow Team`;
  };

  // Draft contract email
  const draftContractEmail = async (): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `Hi ${contact.name},

Excellent! I'm thrilled that we've reached an agreement on all the terms.

Let me prepare the contract based on our discussion:

**FINAL AGREED TERMS:**
• **Content**: ${currentTerms.videoLengthMinutes}-minute sponsored video
• **Additional**: ${currentTerms.instagramPosts} Instagram posts
• **Compensation**: $${currentTerms.compensation}
• **Timeline**: ${currentTerms.timeline}
• **Payment**: ${currentTerms.paymentTerms}
• **Usage Rights**: ${currentTerms.usageRights}
• **Revisions**: ${currentTerms.revisions} rounds included

I'm attaching the partnership contract that includes all these terms, payment schedule, deliverable specifications, and legal requirements.

**[📎 Partnership Agreement - ${campaign.name}.pdf]**

Please review the contract carefully and let me know if you have any questions. Once you're satisfied, please sign and return it to us.

Looking forward to this amazing collaboration!

Best regards,
InfluencerFlow Team
📧 partnerships@influencerflow.com`;
  };

  // Generate final welcome email
  const generateWelcomeEmail = async (): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `Hi ${contact.name},

Perfect! Thank you for the signed contract. We're officially partners now! 🎉

**NEXT STEPS:**
1. **Product Shipment**: We'll send the ${campaign.name.includes('RAY BAN') ? 'Ray-Ban smart glasses' : 'products'} within 2 business days
2. **Creative Brief**: Our team will email you the detailed creative brief by tomorrow
3. **Timeline**: Content creation begins once you receive the product
4. **Payment**: First payment (50%) will be processed within 24 hours
5. **Support**: Your dedicated account manager will be your main contact

**IMPORTANT DETAILS:**
• Expected delivery date: Based on agreed ${currentTerms.timeline} timeline
• Payment schedule: 50% upfront (processing now), 50% on final delivery
• Review process: 2-3 business days for feedback
• Final approval: Mutual sign-off before publication

We're incredibly excited about this partnership and can't wait to see the amazing content you'll create!

Welcome to the InfluencerFlow family! 

Best regards,
InfluencerFlow Team
📧 partnerships@influencerflow.com
📱 Direct line: +1 (555) 0123`;
  };

  // Simulate Sanjay's response based on conversation flow
  const simulateSanjayResponse = (): EmailMessage | null => {
    conversationStage++;
    
    if (conversationStage > CONVERSATION_FLOW.length) {
      return null;
    }
    
    const flowItem = CONVERSATION_FLOW[conversationStage - 1];
    const content = flowItem.sanjayReply.replace('{campaignName}', campaign.name);
    
    return {
      id: `sanjay-${messageIdCounter++}`,
      sender: 'contact',
      subject: `Re: Partnership Opportunity - ${campaign.name}`,
      content: content,
      timestamp: new Date(),
    };
  };

  // Effect: Draft initial email
  useEffect(() => {
    if (currentStage === NegotiationStage.INITIAL_EMAIL_DRAFTING) {
      setIsLoading(true);
      setLoadingMessage(`AI drafting personalized email for ${contact.name}...`);
      
      generateInitialEmail()
        .then(draft => {
          setAiDraft(draft);
          setCurrentStage(NegotiationStage.INITIAL_EMAIL_PENDING_SEND);
        })
        .catch(err => {
          console.error(err);
          setCurrentStage(NegotiationStage.ERROR);
        })
        .finally(() => setIsLoading(false));
    }
  }, [currentStage, contact.name]);

  // Effect: Analyze Sanjay's reply
  useEffect(() => {
    if (currentStage === NegotiationStage.AI_ANALYZING_REPLY) {
      const lastMessage = emailThread[emailThread.length - 1];
      if (lastMessage && lastMessage.sender === 'contact') {
        setIsLoading(true);
        setLoadingMessage('AI analyzing Sanjay\'s reply...');
        
        setTimeout(() => {
          const flowItem = CONVERSATION_FLOW[conversationStage - 1];
          
          addMessageToThread({ 
            id: `analysis-${Date.now()}`, 
            sender: 'system', 
            content: `AI Analysis: ${contact.name} ${
              flowItem?.requiresHumanInput ? 'is requesting a change that requires your decision' :
              flowItem?.triggerContract ? 'has agreed to terms and is ready for contract' :
              flowItem?.isSignedContract ? 'has returned the signed contract' :
              'is interested and asking for more details'
            }`, 
            timestamp: new Date() 
          });
          
          if (flowItem?.requiresHumanInput) {
            setHumanInputPrompt(flowItem.humanPrompt || "Please provide your decision:");
            addMessageToThread({
              id: `human-prompt-${Date.now()}`,
              sender: 'system',
              content: `🤔 Human decision needed: ${flowItem.humanPrompt}`,
              timestamp: new Date(),
              isHumanActionPrompt: true,
            });
            setCurrentStage(NegotiationStage.HUMAN_INPUT_NEEDED);
          } else if (flowItem?.triggerContract) {
            addMessageToThread({ 
              id: `contract-trigger-${Date.now()}`, 
              sender: 'system', 
              content: "✅ Agreement reached! AI will now draft the contract.", 
              timestamp: new Date() 
            });
            setCurrentStage(NegotiationStage.CONTRACT_DRAFTING);
          } else if (flowItem?.isSignedContract) {
            addMessageToThread({ 
              id: `signed-received-${Date.now()}`, 
              sender: 'system', 
              content: "📄 Signed contract received! Please verify and complete the partnership.", 
              timestamp: new Date() 
            });
            setCurrentStage(NegotiationStage.CONTRACT_SIGNED_PENDING_VERIFICATION);
          } else {
            // AI will provide standard response
            setAiDraft(flowItem?.aiResponse || "Thank you for your response. Let me provide more details...");
            setCurrentStage(NegotiationStage.AI_REPLY_PENDING_SEND);
          }
          
          setIsLoading(false);
        }, 2000);
      }
    }
  }, [currentStage, emailThread, contact.name, campaign.name, addMessageToThread]);

  // Effect: Draft contract
  useEffect(() => {
    if (currentStage === NegotiationStage.CONTRACT_DRAFTING) {
      setIsLoading(true);
      setLoadingMessage('AI drafting contract based on negotiated terms...');
      
      draftContractEmail()
        .then(draft => {
          setAiDraft(draft);
          setCurrentStage(NegotiationStage.CONTRACT_PENDING_VERIFICATION);
        })
        .catch(err => {
          console.error(err);
          setCurrentStage(NegotiationStage.ERROR);
        })
        .finally(() => setIsLoading(false));
    }
  }, [currentStage]);

  // Effect: AI drafting reply with human input
  useEffect(() => {
    if (currentStage === NegotiationStage.AI_DRAFTING_REPLY && humanInputResponse) {
      setIsLoading(true);
      setLoadingMessage('AI drafting reply based on your decision...');
      
      generateAiResponseWithHumanInput(humanInputResponse)
        .then(draft => {
          setAiDraft(draft);
          setCurrentStage(NegotiationStage.AI_REPLY_PENDING_SEND);
          
          // Update thread to show human response
          setEmailThread(prevThread => prevThread.map(msg => 
            msg.isHumanActionPrompt && !msg.humanActionResponse 
              ? { ...msg, humanActionResponse: humanInputResponse } 
              : msg
          ));
          setHumanInputResponse('');
        })
        .catch(err => {
          console.error(err);
          setCurrentStage(NegotiationStage.ERROR);
        })
        .finally(() => setIsLoading(false));
    }
  }, [currentStage, humanInputResponse]);

  const handleSendEmail = (subjectLine?: string) => {
    if (!aiDraft) return;
    
    const subject = subjectLine || `Re: Partnership Opportunity - ${campaign.name}`;
    
    const senderType: MessageSender = 
      currentStage === NegotiationStage.INITIAL_EMAIL_PENDING_SEND ? 'user' : 'ai';

    const sentMessage: EmailMessage = {
      id: `sent-${messageIdCounter++}`,
      sender: senderType,
      subject: subject,
      content: aiDraft,
      timestamp: new Date(),
    };
    
    addMessageToThread(sentMessage);
    setAiDraft(null);

    if (currentStage === NegotiationStage.CONTRACT_PENDING_SEND) {
      setCurrentStage(NegotiationStage.WAITING_FOR_SIGNED_CONTRACT);
      addMessageToThread({
        id: `waiting-signature-${Date.now()}`, 
        sender: 'system', 
        content: "📧 Contract sent to Sanjay. Waiting for signed copy...", 
        timestamp: new Date()
      });
    } else {
      setCurrentStage(NegotiationStage.WAITING_FOR_CONTACT_REPLY);
    }
  };

  const handleSimulateSanjayReply = () => {
    setIsLoading(true);
    setLoadingMessage('Waiting for Sanjay\'s response...');
    
    setTimeout(() => {
      const sanjayReply = simulateSanjayResponse();
      
      if (sanjayReply) {
        addMessageToThread(sanjayReply);
        setCurrentStage(NegotiationStage.AI_ANALYZING_REPLY);
      } else {
        addMessageToThread({ 
          id: 'no-more-replies', 
          sender: 'system', 
          content: 'Conversation flow completed.', 
          timestamp: new Date() 
        });
      }
      setIsLoading(false);
    }, 2000);
  };

  const handleHumanInput = () => {
    if (!humanInputResponse.trim()) {
      toast({
        title: "Decision Required",
        description: "Please provide your decision before proceeding.",
        variant: "destructive"
      });
      return;
    }
    setCurrentStage(NegotiationStage.AI_DRAFTING_REPLY);
  };

  const renderMessage = (message: EmailMessage) => {
    const getSenderIcon = () => {
      switch (message.sender) {
        case 'user': return <User className="w-4 h-4" />;
        case 'ai': return <Bot className="w-4 h-4" />;
        case 'contact': return <Mail className="w-4 h-4" />;
        case 'system': return <AlertCircle className="w-4 h-4" />;
        default: return <MessageSquare className="w-4 h-4" />;
      }
    };

    const getSenderColor = () => {
      switch (message.sender) {
        case 'user': return 'bg-blue-50 border-l-4 border-l-blue-400 text-gray-800';
        case 'ai': return 'bg-green-50 border-l-4 border-l-green-400 text-gray-800';
        case 'contact': return 'bg-gray-50 border-l-4 border-l-gray-400 text-gray-800';
        case 'system': return 'bg-yellow-50 border-l-4 border-l-yellow-400 text-gray-800';
        default: return 'bg-gray-50 border-l-4 border-l-gray-300 text-gray-800';
      }
    };

    return (
      <div key={message.id} className={`p-3 rounded-lg ${getSenderColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getSenderIcon()}
            <span className="font-medium text-sm text-gray-700">
              {message.sender === 'user' ? 'You' : 
               message.sender === 'ai' ? 'AI Assistant' : 
               message.sender === 'contact' ? contact.name :
               'System'}
            </span>
            {message.subject && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-600 font-medium">{message.subject}</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap text-gray-700">{message.content}</div>
      </div>
    );
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case NegotiationStage.INITIAL_EMAIL_DRAFTING:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              ✍️ Crafting Initial Email
            </h2>
            <div className="text-center py-4">
              <LoadingSpinner />
              <p className="text-gray-600 mt-2">AI is crafting a personalized outreach email...</p>
            </div>
          </div>
        );

      case NegotiationStage.INITIAL_EMAIL_PENDING_SEND:
      case NegotiationStage.AI_REPLY_PENDING_SEND:
      case NegotiationStage.CONTRACT_PENDING_SEND:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              📧 Review Email
            </h2>
            {aiDraft && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-2">
                  Subject: {currentStage === NegotiationStage.CONTRACT_PENDING_SEND ? 
                    `Partnership Contract - ${campaign.name}` : 
                    currentStage === NegotiationStage.INITIAL_EMAIL_PENDING_SEND ?
                    `Partnership Opportunity - ${campaign.name} | Perfect Fit for ${contact.name}` :
                    `Re: Partnership Opportunity - ${campaign.name} | Perfect Fit for ${contact.name}`
                  }
                </h3>
                <div className="text-sm whitespace-pre-wrap text-gray-700 max-h-48 overflow-y-auto">
                  {aiDraft}
                </div>
              </div>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleSendEmail()}
              disabled={isLoading}
            >
              <Send className="w-4 h-4 mr-2" />
              ✅ Send Email
            </Button>
          </div>
        );

      case NegotiationStage.HUMAN_INPUT_NEEDED:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2" />
              🤔 Human Decision Required
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{humanInputPrompt}</p>
            </div>
            <Textarea
              placeholder="Type your decision or response here..."
              value={humanInputResponse}
              onChange={(e) => setHumanInputResponse(e.target.value)}
              className="mb-4"
              rows={3}
            />
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleHumanInput}
              disabled={isLoading || !humanInputResponse.trim()}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              💬 Submit Decision
            </Button>
          </div>
        );

      case NegotiationStage.AI_ANALYZING_REPLY:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Bot className="w-5 h-5 mr-2" />
              🤖 AI Analyzing Reply
            </h2>
            <div className="text-center py-4">
              <LoadingSpinner />
              <p className="text-gray-600 mt-2">Analyzing {contact.name}'s response...</p>
            </div>
          </div>
        );

      case NegotiationStage.AI_DRAFTING_REPLY:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              ✍️ Drafting AI Response
            </h2>
            <div className="text-center py-4">
              <LoadingSpinner />
              <p className="text-gray-600 mt-2">Crafting intelligent response...</p>
            </div>
          </div>
        );

      case NegotiationStage.CONTRACT_DRAFTING:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              📄 Drafting Contract
            </h2>
            <div className="text-center py-4">
              <LoadingSpinner />
              <p className="text-gray-600 mt-2">Creating partnership contract...</p>
            </div>
          </div>
        );

      case NegotiationStage.CONTRACT_PENDING_VERIFICATION:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              👀 Contract Review
            </h2>
            <p className="text-gray-700 mb-4">
              The contract has been prepared. Please review the terms before sending:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Partnership Terms:</h3>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• {currentTerms.videoLengthMinutes}-minute video</li>
                <li>• {currentTerms.instagramPosts} Instagram posts</li>
                <li>• ${currentTerms.compensation} compensation</li>
                <li>• {currentTerms.timeline} timeline</li>
                <li>• {currentTerms.paymentTerms}</li>
              </ul>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setCurrentStage(NegotiationStage.CONTRACT_PENDING_SEND);
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              📤 Approve & Send Contract
            </Button>
          </div>
        );

      case NegotiationStage.WAITING_FOR_CONTACT_REPLY:
      case NegotiationStage.WAITING_FOR_SIGNED_CONTRACT:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              {currentStage === NegotiationStage.WAITING_FOR_SIGNED_CONTRACT ? "📄 Waiting for Signed Contract" : "⏳ Waiting for Sanjay's Reply"}
            </h2>
            <div className="text-center py-4">
              <LoadingSpinner />
              <p className="text-gray-600 mt-2">Monitoring inbox...</p>
            </div>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 mt-4 text-white"
              onClick={handleSimulateSanjayReply}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              🎭 Simulate Sanjay's Reply
            </Button>
          </div>
        );
      
      case NegotiationStage.CONTRACT_SIGNED_PENDING_VERIFICATION:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-green-200">
            <h2 className="text-xl font-semibold mb-4 text-green-700 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              📄 Contract Signed!
            </h2>
            <p className="text-gray-700 mb-4">
              Sanjay has signed and returned the contract. Please verify and complete the partnership.
            </p>
            <div className="bg-green-50 p-3 rounded-md mb-4 border border-green-200">
              <p className="text-sm text-gray-700">
                📎 <strong>Signed Contract:</strong> Partnership Agreement - {campaign.name}.pdf
              </p>
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={async () => {
                setIsLoading(true);
                setLoadingMessage("Finalizing partnership...");
                
                addMessageToThread({
                  id: 'verified', 
                  sender:'system', 
                  content: "✅ Contract verified! Finalizing partnership...", 
                  timestamp: new Date()
                });
                
                const welcomeEmail = await generateWelcomeEmail();
                addMessageToThread({
                  id: `welcome-${messageIdCounter++}`,
                  sender: 'ai',
                  subject: `Welcome to the Partnership - ${campaign.name}!`,
                  content: welcomeEmail,
                  timestamp: new Date(),
                });
                
                setCurrentStage(NegotiationStage.NEGOTIATION_COMPLETE);
                setIsLoading(false);
              }}
            >
              <Handshake className="w-4 h-4 mr-2" />
              ✅ Verify & Complete Partnership
            </Button>
          </div>
        );

      case NegotiationStage.NEGOTIATION_COMPLETE:
        return (
          <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg text-center border border-green-200">
            <h2 className="text-2xl font-bold mb-4 text-green-800 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 mr-2" />
              ✅ Negotiation Complete!
            </h2>
            <p className="text-green-700 mb-6">
              Contract signed and partnership finalized! Moving to content delivery phase.
            </p>
            
            <div className="bg-green-100 p-4 rounded-lg mb-6 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">📋 Final Agreement Summary:</h3>
              <div className="grid grid-cols-2 gap-2 text-green-700 text-sm">
                <div className="text-left">
                  <strong>Content:</strong> {currentTerms.videoLengthMinutes}-min video + {currentTerms.instagramPosts} posts
                </div>
                <div className="text-left">
                  <strong>Compensation:</strong> ${currentTerms.compensation}
                </div>
                <div className="text-left">
                  <strong>Timeline:</strong> {currentTerms.timeline}
                </div>
                <div className="text-left">
                  <strong>Payment:</strong> {currentTerms.paymentTerms}
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg mb-6 border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                💳 Payment Status: PENDING
              </h4>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>✅ Contract signed and filed</li>
                <li>⏳ Awaiting content deliverables from {contact.name}</li>
                <li>💳 Payment will be processed after delivery verification</li>
                <li>📧 Automated reminders activated</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Campaign Status: ACTIVE</h4>
              <div className="text-blue-700 text-sm">
                <p>✅ Negotiation: <span className="font-semibold">COMPLETE</span></p>
                <p>⏳ Content Delivery: <span className="font-semibold">PENDING</span></p>
                <p>💳 Payment: <span className="font-semibold">PENDING DELIVERY</span></p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-green-600 font-medium">
                  🎉 Negotiation workflow completed successfully!
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Campaign now enters delivery & payment processing phase
                </p>
              </div>
              
              {onComplete && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={onComplete}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  👈 Back to Campaign Dashboard
                </Button>
              )}
              
              <Button
                variant="outline" 
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={resetNegotiation}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                🔄 Try Another Negotiation
              </Button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-600">Stage: {currentStage.replace(/_/g, ' ')}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto p-4 bg-gradient-to-br from-gray-50 to-white">
      <header className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Handshake className="w-6 h-6 mr-2" style={{ color: '#FFE600' }} />
            🤝 Realistic Negotiation Flow
          </h1>
          <div className="flex space-x-2">
            <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Terms
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Current Terms</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Video Length:</span>
                    <span>{currentTerms.videoLengthMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Instagram Posts:</span>
                    <span>{currentTerms.instagramPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compensation:</span>
                    <span>${currentTerms.compensation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timeline:</span>
                    <span>{currentTerms.timeline}</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" size="sm" onClick={resetNegotiation}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            Negotiating with: <span className="font-semibold text-gray-800">{contact.name}</span> • 
            Campaign: <span className="font-semibold text-gray-800">{campaign.name}</span>
          </p>
          <Badge variant="outline" className="mt-1 text-xs border-gray-300 text-gray-700">
            Stage: {currentStage.replace(/_/g, ' ')} • Turn: {conversationStage}
          </Badge>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden space-x-4">
        <div className="w-2/3 flex flex-col bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
          <div className="flex-grow p-4 space-y-2 overflow-y-auto">
            {emailThread.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-600">Starting negotiation with {contact.name}...</p>
                  <p className="text-sm text-gray-500">AI is crafting a personalized email...</p>
                </div>
              </div>
            ) : (
              emailThread.map(renderMessage)
            )}
          </div>
        </div>
        <aside className="w-1/3 bg-white rounded-lg overflow-y-auto shadow-sm border border-gray-200">
          {renderStageContent()}
        </aside>
      </div>
    </div>
  );
};

export default CompleteNegotiationSimulator; 