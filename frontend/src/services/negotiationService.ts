import { 
  Contact, 
  Campaign, 
  NegotiationTerms, 
  EmailMessage, 
  AiAnalysisResponse,
  NegotiationApiResponse 
} from '@/types/negotiation';

// API configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? 'http://localhost:5001/api' : 'https://influencerflow.onrender.com/api';

class NegotiationService {
  /**
   * Generate initial email using Gemini AI
   */
  async generateInitialEmail(
    contact: Contact, 
    campaign: Campaign, 
    currentTerms: NegotiationTerms
  ): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/generate-initial-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact,
          campaign,
          currentTerms
        }),
      });

      const data: NegotiationApiResponse<{ email: string }> = await response.json();
      
      if (data.success && data.data) {
        return data.data.email;
      } else {
        throw new Error(data.message || 'Failed to generate initial email');
      }
    } catch (error) {
      console.error('Error generating initial email:', error);
      throw error;
    }
  }

  /**
   * Analyze Sanjay's reply using AI
   */
  async analyzeSanjayReply(
    replyContent: string,
    emailSubject: string,
    currentTerms: NegotiationTerms,
    conversationHistory: { role: string; parts: Array<{ text: string }> }[]
  ): Promise<AiAnalysisResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/analyze-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          replyContent,
          emailSubject,
          currentTerms,
          conversationHistory
        }),
      });

      const data: NegotiationApiResponse<AiAnalysisResponse> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to analyze reply');
      }
    } catch (error) {
      console.error('Error analyzing reply:', error);
      throw error;
    }
  }

  /**
   * Generate AI reply with human input
   */
  async generateAiReplyWithHumanInput(
    humanDecision: string,
    originalSanjayEmailContent: string,
    currentTerms: NegotiationTerms,
    conversationHistory: { role: string; parts: Array<{ text: string }> }[]
  ): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/generate-reply-with-input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          humanDecision,
          originalSanjayEmailContent,
          currentTerms,
          conversationHistory
        }),
      });

      const data: NegotiationApiResponse<{ reply: string }> = await response.json();
      
      if (data.success && data.data) {
        return data.data.reply;
      } else {
        throw new Error(data.message || 'Failed to generate reply');
      }
    } catch (error) {
      console.error('Error generating AI reply:', error);
      throw error;
    }
  }

  /**
   * Draft contract email
   */
  async draftContractEmail(
    agreedTerms: NegotiationTerms,
    contact: Contact,
    campaign: Campaign,
    conversationHistory: { role: string; parts: Array<{ text: string }> }[]
  ): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/draft-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agreedTerms,
          contact,
          campaign,
          conversationHistory
        }),
      });

      const data: NegotiationApiResponse<{ contractEmail: string }> = await response.json();
      
      if (data.success && data.data) {
        return data.data.contractEmail;
      } else {
        throw new Error(data.message || 'Failed to draft contract');
      }
    } catch (error) {
      console.error('Error drafting contract:', error);
      throw error;
    }
  }

  /**
   * Generate closing email
   */
  async generateClosingEmail(
    contact: Contact,
    campaign: Campaign,
    conversationHistory: { role: string; parts: Array<{ text: string }> }[]
  ): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/generate-closing-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact,
          campaign,
          conversationHistory
        }),
      });

      const data: NegotiationApiResponse<{ email: string }> = await response.json();
      
      if (data.success && data.data) {
        return data.data.email;
      } else {
        throw new Error(data.message || 'Failed to generate closing email');
      }
    } catch (error) {
      console.error('Error generating closing email:', error);
      throw error;
    }
  }

  // Email simulation methods
  
  /**
   * Simulate Sanjay's reply
   */
  async simulateSanjayReply(currentSubject?: string): Promise<EmailMessage | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/simulate-sanjay-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentSubject
        }),
      });

      const data: NegotiationApiResponse<EmailMessage> = await response.json();
      
      if (data.success && data.data) {
        return {
          ...data.data,
          timestamp: new Date(data.data.timestamp)
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error simulating Sanjay reply:', error);
      return null;
    }
  }

  /**
   * Send email (simulation)
   */
  async sendEmail(
    sender: string,
    subject: string,
    body: string,
    recipientName: string = "Sanjay Malladi"
  ): Promise<EmailMessage> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender,
          subject,
          body,
          recipientName
        }),
      });

      const data: NegotiationApiResponse<EmailMessage> = await response.json();
      
      if (data.success && data.data) {
        return {
          ...data.data,
          timestamp: new Date(data.data.timestamp)
        };
      } else {
        throw new Error(data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Start real negotiation with a creator
   */
  async startRealNegotiation(
    campaignId: string,
    creatorId: string,
    creatorEmail: string,
    negotiationTerms: NegotiationTerms
  ): Promise<{ negotiationId: string; emailSent: boolean; messageId: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/start-real-negotiation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          creatorId,
          creatorEmail,
          negotiationTerms
        }),
      });

      const data: NegotiationApiResponse<any> = await response.json();
      
      if (data.success && data.data) {
        return {
          negotiationId: data.data.negotiationId,
          emailSent: data.data.initialEmailSent,
          messageId: data.data.messageId
        };
      } else {
        throw new Error(data.message || 'Failed to start negotiation');
      }
    } catch (error) {
      console.error('Error starting real negotiation:', error);
      throw error;
    }
  }

  /**
   * Send real outreach email via SendGrid
   */
  async sendRealOutreachEmail(
    campaignId: string,
    creatorId: string,
    creatorEmail: string,
    subject: string,
    body: string,
    senderInfo: { name: string; email: string; company: string }
  ): Promise<{ success: boolean; messageId?: string; negotiationId?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation-email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          contactId: creatorId,
          contactEmail: creatorEmail,
          subject,
          body,
          senderInfo,
          budget: 166000,
          deliverables: 'Video content and social posts',
          timeline: '2-3 weeks'
        }),
      });

      const data: NegotiationApiResponse<any> = await response.json();
      
      if (data.success) {
        return {
          success: true,
          messageId: data.data?.messageId,
          negotiationId: data.data?.negotiationId
        };
      } else {
        throw new Error(data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending real outreach email:', error);
      return { success: false };
    }
  }

  /**
   * Get real negotiation status
   */
  async getNegotiationStatus(negotiationId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation-email/status/${negotiationId}`);
      const data: NegotiationApiResponse<any> = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting negotiation status:', error);
      return null;
    }
  }

  /**
   * Process incoming creator reply (real AI analysis)
   */
  async processCreatorReply(
    negotiationId: string,
    replyContent: string,
    emailSubject: string
  ): Promise<{ analysis: AiAnalysisResponse; responseGenerated: boolean; response?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation-email/process-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          negotiationId,
          replyContent,
          emailSubject
        }),
      });

      const data: NegotiationApiResponse<any> = await response.json();
      
      if (data.success && data.data) {
        return {
          analysis: data.data.analysis,
          responseGenerated: data.data.responseGenerated,
          response: data.data.generatedResponse
        };
      } else {
        throw new Error(data.message || 'Failed to process reply');
      }
    } catch (error) {
      console.error('Error processing creator reply:', error);
      throw error;
    }
  }

  /**
   * Reset Sanjay's reply simulation (keeping for backward compatibility)
   */
  async resetSanjayReplies(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/negotiation/reset-simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error resetting simulation:', error);
    }
  }

  /**
   * Get simulation state (keeping for backward compatibility)
   */
  async getSimulationState(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiation/simulation-state`);
      const data: NegotiationApiResponse = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get simulation state');
      }
    } catch (error) {
      console.error('Error getting simulation state:', error);
      return null;
    }
  }
}

export const negotiationService = new NegotiationService();
export default negotiationService; 