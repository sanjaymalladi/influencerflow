const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Define negotiation thresholds and rules
    this.negotiationRules = {
      maxBudgetIncrease: 0.2, // 20% increase max
      minBudgetDecrease: 0.1, // 10% decrease min
      autoApproveThreshold: 5000, // Auto approve under $5k
      requireHumanApproval: 10000, // Require human approval over $10k
      maxCounterOffers: 3,
      autoAcceptables: ['timeline_extension', 'minor_deliverable_changes'],
      requireApproval: ['budget_increase', 'major_scope_changes', 'contract_terms']
    };
  }

  // Analyze incoming negotiation message
  async analyzeNegotiation(messageContent, campaignDetails, negotiationHistory = []) {
    try {
      const prompt = `
You are an AI negotiation assistant for an influencer marketing platform. Analyze the following negotiation message and determine the appropriate response strategy.

Campaign Details:
- Budget: $${campaignDetails.budget}
- Deliverables: ${campaignDetails.deliverables}
- Timeline: ${campaignDetails.timeline}
- Current Offer: $${campaignDetails.currentOffer}

Negotiation History:
${negotiationHistory.map(h => `${h.sender}: ${h.message}`).join('\n')}

Current Message to Analyze:
"${messageContent}"

Analyze this message and respond with a JSON object containing:
{
  "negotiationType": "counter_offer|acceptance|rejection|clarification_request",
  "extractedTerms": {
    "budget": number_or_null,
    "timeline": "string_or_null",
    "deliverables": "string_or_null",
    "additionalRequests": ["array_of_requests"]
  },
  "riskLevel": "low|medium|high",
  "recommendedAction": "auto_accept|auto_counter|escalate_to_human",
  "reasoning": "explanation_of_analysis",
  "suggestedResponse": "proposed_response_text",
  "requiresHumanApproval": boolean,
  "confidenceScore": number_between_0_and_1
}

Consider factors like:
- Budget changes within acceptable ranges
- Timeline feasibility
- Scope creep indicators
- Professional tone and reasonableness
- Previous negotiation rounds
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Clean the response text and parse JSON
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanedText);
      
      // Apply business rules validation
      analysis.requiresHumanApproval = this.shouldRequireHumanApproval(analysis, campaignDetails);
      
      return analysis;
    } catch (error) {
      console.error('Gemini AI analysis error:', error);
      // Fallback to human approval on AI failure
      return {
        negotiationType: "unknown",
        riskLevel: "high",
        recommendedAction: "escalate_to_human",
        requiresHumanApproval: true,
        reasoning: "Gemini AI analysis failed, human review required",
        confidenceScore: 0
      };
    }
  }

  // Determine if human approval is required based on business rules
  shouldRequireHumanApproval(analysis, campaignDetails) {
    const { extractedTerms } = analysis;
    
    // Budget threshold checks
    if (extractedTerms.budget) {
      if (extractedTerms.budget > this.negotiationRules.requireHumanApproval) {
        return true;
      }
      
      const budgetChange = (extractedTerms.budget - campaignDetails.currentOffer) / campaignDetails.currentOffer;
      if (Math.abs(budgetChange) > this.negotiationRules.maxBudgetIncrease) {
        return true;
      }
    }

    // High risk scenarios
    if (analysis.riskLevel === 'high') {
      return true;
    }

    // Low confidence in AI analysis
    if (analysis.confidenceScore < 0.7) {
      return true;
    }

    // Major scope changes
    if (extractedTerms.additionalRequests?.some(req => 
      req.toLowerCase().includes('additional') || 
      req.toLowerCase().includes('extra') ||
      req.toLowerCase().includes('more')
    )) {
      return true;
    }

    return analysis.requiresHumanApproval;
  }

  // Generate counter-offer response
  async generateCounterOffer(analysis, campaignDetails, negotiationContext) {
    try {
      const prompt = `
You are a professional negotiation assistant. Generate a diplomatic counter-offer response based on the analysis.

Campaign Context:
- Original Budget: $${campaignDetails.budget}
- Current Offer: $${campaignDetails.currentOffer}
- Target Profit Margin: 15-25%

Analysis Results:
- Negotiation Type: ${analysis.negotiationType}
- Extracted Terms: ${JSON.stringify(analysis.extractedTerms)}
- Risk Level: ${analysis.riskLevel}

Generate a professional response that:
1. Acknowledges their request respectfully
2. Provides a reasonable counter-offer within business constraints
3. Maintains positive relationship tone
4. Clarifies any concerns
5. Moves toward agreement

Response should be 2-3 paragraphs, professional but friendly.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini counter-offer generation error:', error);
      return "Thank you for your message. We're reviewing your proposal and will get back to you shortly with our response.";
    }
  }

  // Process automated negotiation
  async processNegotiation(messageContent, campaignDetails, negotiationHistory) {
    const negotiationId = uuidv4();
    
    try {
      // Step 1: Analyze the incoming message
      const analysis = await this.analyzeNegotiation(messageContent, campaignDetails, negotiationHistory);
      
      // Step 2: Determine action based on analysis
      let response = {
        id: negotiationId,
        analysis,
        action: analysis.recommendedAction,
        timestamp: new Date().toISOString()
      };

      // Step 3: Handle different scenarios
      switch (analysis.recommendedAction) {
        case 'auto_accept':
          response.responseMessage = await this.generateAcceptanceMessage(analysis, campaignDetails);
          response.status = 'accepted';
          break;
          
        case 'auto_counter':
          response.responseMessage = await this.generateCounterOffer(analysis, campaignDetails, negotiationHistory);
          response.status = 'counter_offered';
          break;
          
        case 'escalate_to_human':
          response.responseMessage = "Thank you for your message. Our team is reviewing your proposal and will respond within 24 hours.";
          response.status = 'pending_human_review';
          response.escalationReason = analysis.reasoning;
          break;
          
        default:
          response.responseMessage = "Thank you for your message. We're processing your request and will respond soon.";
          response.status = 'processing';
      }

      return response;
    } catch (error) {
      console.error('Negotiation processing error:', error);
      return {
        id: negotiationId,
        status: 'error',
        action: 'escalate_to_human',
        responseMessage: "We're experiencing technical difficulties. Our team will review your message and respond shortly.",
        error: error.message
      };
    }
  }

  // Generate acceptance message
  async generateAcceptanceMessage(analysis, campaignDetails) {
    try {
      const prompt = `
Generate a professional acceptance message for an influencer marketing campaign negotiation.

Campaign Details:
- Agreed Budget: $${analysis.extractedTerms.budget || campaignDetails.currentOffer}
- Deliverables: ${campaignDetails.deliverables}

The message should:
1. Confirm acceptance of terms
2. Express enthusiasm for collaboration
3. Mention next steps (contract generation)
4. Be warm and professional

Keep it concise, 1-2 paragraphs.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini acceptance message generation error:', error);
      return "Great! We accept your terms and are excited to move forward with this collaboration. We'll send over the contract details shortly.";
    }
  }

  // Extract intent from message using AI
  async extractMessageIntent(messageContent) {
    try {
      const prompt = `
Analyze this message and extract the primary intent:

"${messageContent}"

Respond with a JSON object:
{
  "intent": "price_negotiation|timeline_change|scope_change|acceptance|rejection|question|other",
  "confidence": number_between_0_and_1,
  "keyPoints": ["array", "of", "key", "points"],
  "urgency": "low|medium|high",
  "sentiment": "positive|neutral|negative"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Clean the response text and parse JSON
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Gemini intent extraction error:', error);
      return {
        intent: "other",
        confidence: 0,
        keyPoints: [],
        urgency: "medium",
        sentiment: "neutral"
      };
    }
  }

  // Generate summary of negotiation thread
  async generateNegotiationSummary(negotiationHistory) {
    try {
      const prompt = `
Summarize this negotiation thread concisely:

${negotiationHistory.map(h => `${h.sender}: ${h.message}`).join('\n\n')}

Provide:
1. Current status
2. Key agreed points
3. Outstanding issues
4. Recommended next steps

Keep it brief and actionable.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini summary generation error:', error);
      return "Unable to generate summary. Please review the negotiation history manually.";
    }
  }
}

module.exports = new AIService(); 