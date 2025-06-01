const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. AI Service will not function.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const defaultSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const defaultGenerationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 1024, // Adjust as needed for email length
};

/**
 * Generates email content using the Gemini AI model.
 * @param {object} params
 * @param {string} params.prompt - The main prompt for the AI.
 * @param {Array<object>} [params.conversationHistory] - Optional history of the conversation for context.
 *   Each object in history should be: { role: 'user' | 'model', parts: [{ text: string }] }
 * @param {string} [params.modelName] - The AI model to use (e.g., 'gemini-pro').
 * @returns {Promise<string>} - The AI-generated email content.
 */
const generateEmailContent = async ({ prompt, conversationHistory = [], modelName = 'gemini-pro' }) => {
  if (!genAI) {
    throw new Error('Gemini AI service is not configured. API key missing.');
  }

  const model = genAI.getGenerativeModel({ model: modelName, safetySettings: defaultSafetySettings, generationConfig: defaultGenerationConfig });

  // Gemini uses a slightly different format for history. System prompts are part of the first user message or handled differently.
  // For simplicity, we'll prepend a system-like instruction to the main prompt if no history, or let it be part of the flow.
  const fullPrompt = `You are a helpful assistant that drafts professional and engaging emails for influencer marketing campaigns. Your tone should be friendly yet professional. When asked to reply to an email, maintain the context of the ongoing conversation accurately.\n\n${prompt}`;

  try {
    let result;
    if (conversationHistory && conversationHistory.length > 0) {
      const chat = model.startChat({ history: conversationHistory });
      result = await chat.sendMessage(prompt); // Send the current user prompt
    } else {
      result = await model.generateContent(fullPrompt); // For a single turn generation without prior history
    }
    
    const response = result.response;
    const generatedText = response.text().trim();

    if (!generatedText) {
      throw new Error('AI (Gemini) did not return any content.');
    }
    console.log('AI (Gemini) generated content:', generatedText);
    return generatedText;
  } catch (error) {
    console.error('Error generating email content with AI (Gemini):', error);
    throw new Error(`Failed to generate email content with AI (Gemini): ${error.message}`);
  }
};

/**
 * Analyzes an email reply and suggests a response or action using Gemini.
 * @param {object} params
 * @param {string} params.emailContent - The content of the received email.
 * @param {Array<object>} params.conversationHistory - History of the conversation { role: 'user'|'model', parts: [{text: string}] }.
 * @param {object} params.campaignDetails - Details of the current campaign.
 * @param {object} params.creatorDetails - Details of the creator.
 * @param {string} [params.modelName] - The AI model to use (e.g., 'gemini-pro' or a more advanced one for JSON).
 * @returns {Promise<object>} - An object containing { summaryOfReply, negotiationPoints, suggestedReplyDraft, requiresHumanAction, humanActionPrompt, nextStep }.
 */
const analyzeAndSuggestReply = async ({ emailContent, conversationHistory, campaignDetails, creatorDetails, modelName = 'gemini-pro' }) => {
  if (!genAI) {
    throw new Error('Gemini AI service is not configured. API key missing.');
  }
  
  // Construct the prompt for Gemini to output structured JSON
  const systemInstruction = "You are an AI assistant managing influencer collaborations. Analyze the influencer's reply in context and provide a structured JSON response.";
  
  const userPrompt = `
    An influencer has replied to our email. Analyze their reply based on our conversation and campaign goals, then suggest a response.

    Campaign Details:
    - Name: ${campaignDetails.name}
    - Key Deliverables: ${JSON.stringify(campaignDetails.deliverables)}
    - Goal: ${campaignDetails.description}

    Creator Details:
    - Name: ${creatorDetails.channel_name || creatorDetails.name}
    - Contact: ${creatorDetails.contact_email}
    
    Latest Influencer Reply:
    """
    ${emailContent}
    """

    Task:
    1. Summarize the influencer's key points from their latest reply.
    2. Assess if their reply requires negotiation or clarification based on campaign goals.
    3. If negotiation is needed (e.g., they propose changes to deliverables, timelines, or compensation), identify the negotiation points.
    4. Draft a polite and professional reply. If the influencer's request is reasonable, you can agree. If it deviates significantly, politely state our position or suggest alternatives. If a specific point needs human approval (e.g., budget changes, significant deliverable changes), state that you will get back to them and then flag it for human review.
    5. Determine if this situation requires human intervention from the campaign manager.
    6. If human intervention is needed, provide a concise summary/prompt for the campaign manager about what decision or input is required.

    Output ONLY a valid JSON object (no surrounding text or explanations) with the following fields:
    - "summaryOfReply": string (brief summary of influencer's email)
    - "negotiationPoints": array of strings (e.g., ["Wants to change video length from 15 to 10 mins", "Requests higher compensation"] or empty if none)
    - "suggestedReplyDraft": string (the email draft to send back)
    - "requiresHumanAction": boolean (true if the campaign manager needs to review or decide something)
    - "humanActionPrompt": string (e.g., "Influencer wants to do a 10 min video instead of 15. Is this acceptable?" or empty if no human action needed)
    - "nextStep": string (e.g., 'send_reply', 'escalate_to_human', 'clarify_internally')
  `;

  // Gemini's chat history format: [{role: "user", parts: [{text: "..."}]}, {role: "model", parts: [{text: "..."}]}]
  // Prepend system instruction to the conversation history or initial prompt.
  const currentTurn = { role: "user", parts: [{ text: userPrompt }] };
  let fullConversationHistory = [...conversationHistory];
  if (fullConversationHistory.length === 0) {
    fullConversationHistory.push({ role: "user", parts: [{text: systemInstruction}]});
    fullConversationHistory.push({ role: "model", parts: [{text: "Okay, I understand. I will provide a JSON response based on the user's request."}]}); // Priming the model for JSON output
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: modelName, safetySettings: defaultSafetySettings, generationConfig: {...defaultGenerationConfig, responseMimeType: "application/json"} });
    const chat = model.startChat({ history: fullConversationHistory });
    const result = await chat.sendMessage(userPrompt); // Send the detailed user prompt for this turn
    const response = result.response;
    const aiResponseText = response.text().trim();

    try {
      const parsedResponse = JSON.parse(aiResponseText);
      // Basic validation of the parsed response structure
      if (typeof parsedResponse.suggestedReplyDraft !== 'string' || 
          typeof parsedResponse.requiresHumanAction !== 'boolean') {
            console.error('AI (Gemini) response did not match expected JSON structure:', aiResponseText);
            throw new Error('AI (Gemini) response format error. Defaulting to needing human review.');
      }
      return parsedResponse;
    } catch (parseError) {
      console.error('Failed to parse AI (Gemini) response as JSON:', aiResponseText, parseError);
      return {
        summaryOfReply: "Could not parse AI (Gemini) analysis from text: " + aiResponseText.substring(0, 100),
        negotiationPoints: [],
        suggestedReplyDraft: "I need to review this with my manager and will get back to you shortly.",
        requiresHumanAction: true,
        humanActionPrompt: "AI (Gemini) failed to provide a structured JSON response. Please review the latest email and the AI's raw text output if available, then decide on the next steps.",
        nextStep: 'escalate_to_human'
      };
    }
  } catch (error) {
    console.error('Error in analyzeAndSuggestReply with AI (Gemini):', error.message);
    return {
      summaryOfReply: "Error during AI (Gemini) analysis.",
      negotiationPoints: [],
      suggestedReplyDraft: "I need to review this with my manager and will get back to you shortly.",
      requiresHumanAction: true,
      humanActionPrompt: `AI (Gemini) service encountered an error: ${error.message}. Please review the latest email.`,
      nextStep: 'escalate_to_human'
    };
  }
};

module.exports = {
  generateEmailContent,
  analyzeAndSuggestReply,
}; 