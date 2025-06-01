import { GoogleGenerativeAI } from '@google/generative-ai';
import { socialBladeService } from './socialBladeService';
import { GEMINI_API_KEY } from '../lib/constants';

interface CreatorDetails {
  id: string;
  name: string;
  niche: string;
  subscriberCount?: string;
  categories?: string[];
  bio?: string;
  engagementRate?: string;
}

interface CampaignDetails {
  id: string;
  name: string;
  description: string;
  budget: number;
  goals: string[];
  deliverables: Array<{
    type: string;
    quantity: number;
    price: number;
  }>;
}

interface PersonalizedEmailRequest {
  creator: CreatorDetails;
  campaign: CampaignDetails;
  senderName: string;
  companyName?: string;
}

interface PersonalizedEmailResponse {
  subject: string;
  body: string;
  creator: CreatorDetails;
}

class GeminiEmailService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  async generatePersonalizedEmail(request: PersonalizedEmailRequest): Promise<PersonalizedEmailResponse> {
    try {
      // Try to enhance creator data with real SocialBlade statistics
      let enhancedCreator = request.creator;
      if ((request.creator as any).youtubeChannelUrl) {
        try {
          console.log(`🔍 Fetching real stats for ${request.creator.name}...`);
          const realStats = await socialBladeService.getYouTubeStats((request.creator as any).youtubeChannelUrl);
          if (realStats) {
            enhancedCreator = {
              ...request.creator,
              subscriberCount: realStats.subscriberCount,
              engagementRate: realStats.engagementRate,
              recentGrowth: realStats.recentGrowth,
              videoCount: realStats.videoCount,
              dataSource: 'SocialBlade (Real-time)'
            } as any;
            console.log(`✅ Enhanced ${request.creator.name} with real SocialBlade data:`, {
              subscribers: realStats.subscriberCount,
              engagement: realStats.engagementRate,
              growth: realStats.recentGrowth
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch SocialBlade data for ${request.creator.name}:`, error);
        }
      }

      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      const enhancedRequest = { ...request, creator: enhancedCreator };
      const prompt = this.buildEmailPrompt(enhancedRequest);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response to extract subject and body
      const { subject, body } = this.parseEmailResponse(text);

      return {
        subject,
        body,
        creator: enhancedCreator
      };
    } catch (error) {
      console.error('Failed to generate personalized email:', error);
      // Fallback to template-based email
      return this.generateFallbackEmail(request);
    }
  }

  async generateBulkPersonalizedEmails(requests: PersonalizedEmailRequest[]): Promise<PersonalizedEmailResponse[]> {
    const promises = requests.map(request => this.generatePersonalizedEmail(request));
    return Promise.all(promises);
  }

  private buildEmailPrompt(request: PersonalizedEmailRequest): string {
    const { creator, campaign, senderName, companyName } = request;
    
    return `
You are a professional marketing manager crafting a personalized collaboration email to a YouTube creator. Create a highly personalized, professional, and engaging outreach email.

CREATOR DETAILS:
- Channel Name: ${creator.name}
- Niche/Categories: ${creator.niche || creator.categories?.join(', ') || 'Content Creator'}
- Subscriber Count: ${creator.subscriberCount || 'Not specified'}
- Bio: ${creator.bio || 'Not available'}
- Engagement Rate: ${creator.engagementRate || 'Not specified'}
- Recent Growth: ${(creator as any).recentGrowth || 'Not available'}
- Video Count: ${(creator as any).videoCount || 'Not specified'}
- Data Source: ${(creator as any).dataSource || 'Manual'}

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.name}
- Description: ${campaign.description}
- Budget: $${campaign.budget.toLocaleString()}
- Goals: ${campaign.goals.join(', ')}
- Deliverables: ${campaign.deliverables.map(d => `${d.quantity}x ${d.type} ($${d.price} each)`).join(', ')}

SENDER DETAILS:
- Sender Name: ${senderName}
- Company: ${companyName || 'Our Company'}

REQUIREMENTS:
1. Create a compelling, personalized subject line
2. Write a professional email body that:
   - Shows genuine knowledge of their content and niche
   - Mentions specific aspects of their channel that align with our campaign
   - If real-time data is available (SocialBlade), reference their current subscriber count, engagement rate, or recent growth impressively
   - Clearly explains the collaboration opportunity
   - Includes campaign details and compensation
   - Has a clear call-to-action
   - Maintains a professional yet friendly tone
   - Is concise but comprehensive (200-300 words)

3. Make it feel genuine, not like a mass email
4. Include specific campaign deliverables and their value
5. Reference their niche expertise appropriately
6. If SocialBlade data is available, mention how impressed you are with their metrics or growth
7. Use specific numbers when available (subscriber count, video count, engagement rate)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
SUBJECT: [Your subject line here]

BODY:
[Your email body here]

Generate the email now:`;
  }

  private parseEmailResponse(response: string): { subject: string; body: string } {
    try {
      const lines = response.split('\n');
      let subject = '';
      let body = '';
      let inBody = false;

      for (const line of lines) {
        if (line.startsWith('SUBJECT:')) {
          subject = line.replace('SUBJECT:', '').trim();
        } else if (line.startsWith('BODY:')) {
          inBody = true;
        } else if (inBody) {
          body += line + '\n';
        }
      }

      // Clean up the body
      body = body.trim();

      // Fallback parsing if the format doesn't match
      if (!subject || !body) {
        const parts = response.split('\n\n');
        if (parts.length >= 2) {
          subject = parts[0].replace('SUBJECT:', '').replace('Subject:', '').trim();
          body = parts.slice(1).join('\n\n').replace('BODY:', '').replace('Body:', '').trim();
        }
      }

      return {
        subject: subject || 'Partnership Opportunity',
        body: body || response // Use full response as fallback
      };
    } catch (error) {
      console.error('Failed to parse email response:', error);
      return {
        subject: 'Partnership Opportunity',
        body: response
      };
    }
  }

  private generateFallbackEmail(request: PersonalizedEmailRequest): PersonalizedEmailResponse {
    const { creator, campaign, senderName } = request;
    
    const subject = `Partnership Opportunity: ${campaign.name} - ${creator.name}`;
    
    const body = `Hi ${creator.name},

I hope this message finds you well! I've been following your content in the ${creator.niche || 'content creation'} space and I'm really impressed by your work.

I'm reaching out about an exciting collaboration opportunity with our ${campaign.name} campaign. 

Campaign Details:
- ${campaign.description}
- Budget: $${campaign.budget.toLocaleString()}
- Goals: ${campaign.goals.join(', ')}
- Deliverables: ${campaign.deliverables.map(d => `${d.quantity}x ${d.type} ($${d.price} each)`).join(', ')}

We believe your unique voice and engaged audience would be perfect for this campaign, and we're offering competitive compensation.

Would you be interested in learning more about this partnership opportunity?

Best regards,
${senderName}`;

    return {
      subject,
      body,
      creator
    };
  }
}

export const geminiEmailService = new GeminiEmailService();
export type { PersonalizedEmailRequest, PersonalizedEmailResponse }; 