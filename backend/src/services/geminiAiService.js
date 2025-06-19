const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_MODEL_TEXT, SYSTEM_INSTRUCTION_EMAIL_DRAFTER, SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT } = require('../constants');

/**
 * @typedef {import('../types').Campaign} Campaign
 * @typedef {import('../types').Contact} Contact  
 * @typedef {import('../types').NegotiationTerms} NegotiationTerms
 * @typedef {import('../types').AiAnalysisResponse} AiAnalysisResponse
 * @typedef {import('../types').GroundingChunk} GroundingChunk
 */

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!API_KEY) {
  console.warn("GEMINI_API_KEY environment variable not set. Gemini API calls will fail. This is expected in client-side development without a backend proxy. For production, ensure API_KEY is securely managed.");
}

const ai = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Parse JSON response from Gemini, handling various formats
 * @template T
 * @param {string} responseText - Raw response text from Gemini
 * @returns {T | null} Parsed JSON object or null if parsing fails
 */
const parseJsonFromGeminiResponse = (responseText) => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original text:", responseText);
    // Fallback: if it's not JSON but might be the direct answer (e.g., for simple text generation)
    if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
        // Heuristic: if it doesn't look like JSON, and we expected an AiAnalysisResponse,
        // wrap it as a simple analysis for display, marking human input needed.
        const fallbackResponse = {
            analysis: `Could not parse AI response as JSON. Raw response: ${responseText}`,
            needsHumanInput: true,
            questionForUser: "AI response format was unexpected. Please review the last message and decide on the next step manually.",
        };
        return fallbackResponse;
    }
    return null;
  }
};

/**
 * Generate initial email content using Gemini AI
 * @param {Contact} contact - Contact information
 * @param {Campaign} campaign - Campaign details
 * @param {NegotiationTerms} currentTerms - Current negotiation terms
 * @returns {Promise<string>} Generated email content
 */
const generateInitialEmail = async (contact, campaign, currentTerms) => {
  if (!API_KEY) {
    return campaign.initialPromptTemplate
      .replace('{contactName}', contact.name)
      .replace('{campaignName}', campaign.name) + 
      "\n\n[AI Fallback: API Key not configured]";
  }

  const prompt = `
Context:
Contact Name: ${contact.name}
Campaign Name: ${campaign.name}
Campaign Description: ${campaign.description}
Initial Negotiation Terms: ${JSON.stringify(currentTerms)}

Instructions:
Using the template below as a base, generate a personalized and engaging initial email to ${contact.name} for the ${campaign.name}.
Make sure to fill in placeholders like [My Company/Brand] and [My Name/My Team] appropriately or leave them for the user to fill if not specified.
The user's name is Alex.

Template:
${campaign.initialPromptTemplate}
`;

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      systemInstruction: SYSTEM_INSTRUCTION_EMAIL_DRAFTER,
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating initial email:", error);
    return `Error generating email. Please try again. Details: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * Analyze Sanjay's reply and provide structured response
 * @param {string} replyContent - Content of the reply email
 * @param {string} emailSubject - Subject of the email
 * @param {NegotiationTerms} currentTerms - Current negotiation terms
 * @param {Array<{role: string, parts: Array<{text: string}>}>} conversationHistory - Conversation history
 * @returns {Promise<AiAnalysisResponse | null>} Analysis response or null
 */
const analyzeSanjayReply = async (replyContent, emailSubject, currentTerms, conversationHistory = []) => {
  if (!API_KEY) {
    return {
      analysis: "Sanjay's reply received. [AI Fallback: API Key not configured, manual review needed]",
      needsHumanInput: true,
      questionForUser: "API Key not configured. Please review Sanjay's email and decide on the next steps.",
    };
  }

  const prompt = `
Analyze Sanjay's latest email reply in the context of our ongoing negotiation.

Current Negotiation Terms:
${JSON.stringify(currentTerms)}

Sanjay's latest email:
Subject: ${emailSubject}
Content:
${replyContent}

Your task is to:
1. Briefly summarize Sanjay's email.
2. Identify if Sanjay is agreeing, disagreeing, proposing changes, or asking questions.
3. If Sanjay proposes changes, specify what they are and update the negotiation terms accordingly.
4. Determine if the AI (you) can respond directly based on common negotiation tactics (e.g., accepting minor changes, clarifying points) OR if human input from your manager "Alex" is required (e.g., for significant term changes, strategic decisions).
5. If human input is needed, formulate a clear, concise question for Alex.
6. If AI can respond, draft a polite and professional email reply to Sanjay.
7. Indicate if overall agreement on terms seems to have been reached.

Respond ONLY with a JSON object in the following format:
{
  "analysis": "string (your summary of Sanjay's email)",
  "changeRequested": "string (description of change, or null if none)",
  "updatedTerms": { /* an object with NegotiationTerms, only if changes are proposed and acceptable by AI or to be presented to human */ },
  "needsHumanInput": boolean,
  "questionForUser": "string (question for Alex, or null if not needed)",
  "aiDraftReply": "string (AI's draft reply to Sanjay, or null if human input needed or agreement reached)",
  "agreementReached": boolean (true if all terms seem agreed)
}
`;

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      systemInstruction: SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    
    const chat = model.startChat({ history: conversationHistory });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    
    const parsed = parseJsonFromGeminiResponse(response.text());
    if (parsed) {
        // Ensure updatedTerms is always present if not null
        if (parsed.updatedTerms === undefined && parsed.changeRequested) {
            parsed.updatedTerms = { ...currentTerms }; // Start with current if not provided
        }
    }
    return parsed;

  } catch (error) {
    console.error("Error analyzing Sanjay's reply:", error);
    return {
      analysis: `Error analyzing reply: ${error instanceof Error ? error.message : String(error)}`,
      needsHumanInput: true,
      questionForUser: "An error occurred while AI was analyzing the reply. Please review manually.",
      agreementReached: false,
    };
  }
};

/**
 * Generate AI reply based on human input
 * @param {string} humanDecision - Decision from human user
 * @param {string} originalSanjayEmailContent - Original email content from Sanjay
 * @param {NegotiationTerms} currentTerms - Current negotiation terms
 * @param {Array<{role: string, parts: Array<{text: string}>}>} conversationHistory - Conversation history
 * @returns {Promise<string | null>} Generated reply or null
 */
const generateAiReplyWithHumanInput = async (humanDecision, originalSanjayEmailContent, currentTerms, conversationHistory = []) => {
  if (!API_KEY) {
    return `Understood, proceeding with: ${humanDecision}. [AI Fallback: API Key not configured]`;
  }

  const prompt = `
Your manager, Alex, has provided input on how to respond to Sanjay.

Current Negotiation Terms:
${JSON.stringify(currentTerms)}

Sanjay's previous email content that prompted human input:
${originalSanjayEmailContent}

Alex's decision/instruction:
"${humanDecision}"

Your task:
Based on Alex's decision, draft a polite and professional email reply to Sanjay. Incorporate Alex's instructions naturally into the conversation.
If Alex's input has modified the terms, ensure the reply reflects this.
`;

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      systemInstruction: SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT,
    });
    
    const chat = model.startChat({ history: conversationHistory });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI reply with human input:", error);
    return `Error drafting reply: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * Draft contract email after agreement is reached
 * @param {NegotiationTerms} agreedTerms - Final agreed terms
 * @param {Contact} contact - Contact information
 * @param {Campaign} campaign - Campaign details
 * @param {Array<{role: string, parts: Array<{text: string}>}>} conversationHistory - Conversation history
 * @returns {Promise<string>} Contract email content
 */
const draftContractEmail = async (agreedTerms, contact, campaign, conversationHistory = []) => {
  if (!API_KEY) {
    return `Contract draft for ${contact.name} based on agreed terms. [AI Fallback: API Key not configured]`;
  }

  const termsSummary = Object.entries(agreedTerms)
    .map(([key, value]) => `- ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`)
    .join('\n');

  const prompt = `
Negotiation with ${contact.name} for campaign "${campaign.name}" has concluded.
The agreed terms are:
${termsSummary}

Draft an email to ${contact.name} that includes a summary of these terms and mentions that a formal contract document (simulated as a PDF attachment for this exercise) is attached for their review and signature.
The email should be from Alex / Alex's Team.
Keep it professional and positive.
`;

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      systemInstruction: SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT,
    });
    
    const chat = model.startChat({ history: conversationHistory });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    
    // Simulate attaching a PDF - this is just text for the email body
    return `${response.text()}\n\n[Simulated PDF Contract attached summarizing the above terms.]`;
  } catch (error) {
    console.error("Error drafting contract email:", error);
    return `Error drafting contract email. ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * Generate closing email after contract is signed
 * @param {Contact} contact - Contact information
 * @param {Campaign} campaign - Campaign details
 * @param {Array<{role: string, parts: Array<{text: string}>}>} conversationHistory - Conversation history
 * @returns {Promise<string>} Closing email content
 */
const generateClosingEmail = async (contact, campaign, conversationHistory = []) => {
  if (!API_KEY) {
    return `Thank you, ${contact.name}! We look forward to a successful collaboration on ${campaign.name}. [AI Fallback: API Key not configured]`;
  }

  const prompt = `
The contract with ${contact.name} for campaign "${campaign.name}" has been signed by both parties.
Draft a final email to ${contact.name} expressing excitement for the collaboration and outlining any immediate next steps (e.g., "We'll be in touch shortly with onboarding details" or "Please let us know when you plan to start on the deliverables").
The email is from Alex / Alex's Team.
`;

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      systemInstruction: SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT,
    });
    
    const chat = model.startChat({ history: conversationHistory });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating closing email:", error);
    return `Error generating closing email. ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * Get information using Google Search grounding (placeholder implementation)
 * @param {string} query - Search query
 * @returns {Promise<{text: string, chunks: GroundingChunk[] | undefined}>} Search results
 */
const getInfoWithGoogleSearch = async (query) => {
  if (!API_KEY) {
    return { 
      text: `Cannot perform search: API Key not configured. Query: ${query}`, 
      chunks: [] 
    };
  }
  
  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      tools: [{ googleSearch: {} }],
    });
    
    const result = await model.generateContent(query);
    const response = await result.response;
    
    return {
        text: response.text(),
        chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Error with Google Search grounding:", error);
    return {
        text: `Error performing search: ${error instanceof Error ? error.message : String(error)}`,
        chunks: []
    };
  }
};

/**
 * Generate perfect match creator analysis using Gemini AI
 * @param {Object} campaign - Campaign details
 * @param {Array} creators - List of creators to analyze
 * @returns {Promise<Array>} Enhanced creators with AI analysis
 */
const generatePerfectMatchCreators = async (campaign, creators) => {
  if (!API_KEY) {
    console.warn('Gemini API key not available, returning creators without AI enhancement');
    return creators;
  }

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    const prompt = `
Analyze these creators for the campaign and provide perfect match scores with detailed reasoning.

Campaign Details:
Name: ${campaign.name}
Description: ${campaign.description}
Target Audience: ${campaign.targetAudience || 'General Audience'}

Creators to Analyze:
${JSON.stringify(creators.map(c => ({
  name: c.name,
  platform: c.platform,
  followerCount: c.followerCount || c.subscriberCount,
  niche: c.niche,
  description: c.description || c.bio,
  categories: c.categories
})), null, 2)}

For each creator, provide:
1. Match percentage (0-100) based on:
   - Audience alignment with campaign target
   - Content niche relevance
   - Platform suitability
   - Follower quality vs quantity
   - Brand safety and authenticity

2. Detailed match reasoning (2-3 sentences)
3. Recommended collaboration type
4. Estimated campaign impact
5. Potential challenges

Return as JSON array with this structure:
[
  {
    "creatorId": "creator_id_from_input",
    "matchPercentage": 95,
    "matchReasoning": "Detailed explanation of why this creator is perfect",
    "collaborationType": "Sponsored Video + Social Posts",
    "estimatedReach": "500K-1M engaged viewers",
    "campaignImpact": "High conversion potential due to authentic tech reviews",
    "challenges": "Premium pricing due to high engagement",
    "aiRecommendation": "HIGHLY RECOMMENDED"
  }
]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiAnalysis = parseJsonFromGeminiResponse(response.text());

    if (!aiAnalysis || !Array.isArray(aiAnalysis)) {
      console.warn('Invalid AI analysis response, returning original creators');
      return creators;
    }

    // Enhance creators with AI analysis
    const enhancedCreators = creators.map(creator => {
      const analysis = aiAnalysis.find(a => 
        a.creatorId === creator.id || 
        a.creatorId.includes(creator.name.replace(/\s+/g, '').toLowerCase())
      );

      if (analysis) {
        return {
          ...creator,
          matchPercentage: analysis.matchPercentage,
          matchReasoning: analysis.matchReasoning,
          collaborationType: analysis.collaborationType,
          estimatedReach: analysis.estimatedReach,
          campaignImpact: analysis.campaignImpact,
          challenges: analysis.challenges,
          aiRecommendation: analysis.aiRecommendation,
          isAiEnhanced: true
        };
      }

      return creator;
    });

    console.log(`✅ Enhanced ${enhancedCreators.filter(c => c.isAiEnhanced).length}/${creators.length} creators with Gemini AI analysis`);
    return enhancedCreators;

  } catch (error) {
    console.error('Error generating perfect match creators:', error);
    return creators;
  }
};

/**
 * Simulate Sanjay's response for quick testing
 * @param {string} originalMessage - Original outreach message
 * @param {Object} campaign - Campaign details
 * @returns {Promise<string>} Simulated response
 */
const simulateSanjayResponse = async (originalMessage, campaign) => {
  if (!API_KEY) {
    return `Hi there! Thanks for reaching out about ${campaign.name}. I'm interested in learning more about the collaboration. Can you share more details about the compensation and timeline? Looking forward to hearing from you!

Best regards,
Sanjay`;
  }

  try {
    const model = ai.getGenerativeModel({ 
      model: GEMINI_MODEL_TEXT,
      systemInstruction: "You are Sanjay, a tech content creator. Respond professionally and show interest while asking relevant questions about partnerships."
    });

    const prompt = `
You received this outreach email for a brand collaboration:

Campaign: ${campaign.name}
Message: ${originalMessage}

As Sanjay, respond with:
1. Professional and friendly tone
2. Show genuine interest
3. Ask 2-3 relevant questions about:
   - Compensation/rates
   - Timeline and deliverables
   - Creative freedom
   - Brand guidelines

4. Keep it concise (3-4 paragraphs)
5. Sign as "Sanjay"

Write the response as if you're genuinely interested but want to know more details before committing.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error('Error simulating Sanjay response:', error);
    return `Hi there! 

Thanks for reaching out about ${campaign.name}. This sounds like an interesting opportunity and I'd love to learn more!

A few questions:
1. What's the compensation structure for this collaboration?
2. What's the timeline and specific deliverables you're looking for?
3. How much creative freedom would I have with the content?

Looking forward to discussing this further!

Best regards,
Sanjay`;
  }
};

module.exports = {
  generateInitialEmail,
  analyzeSanjayReply,
  generateAiReplyWithHumanInput,
  draftContractEmail,
  generateClosingEmail,
  getInfoWithGoogleSearch,
  generatePerfectMatchCreators,
  simulateSanjayResponse
}; 