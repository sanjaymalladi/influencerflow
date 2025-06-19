// Constants for InfluencerFlow backend services

// Gemini AI Model Configuration
const GEMINI_MODEL_TEXT = 'gemini-1.5-flash';

// System Instructions for AI
const SYSTEM_INSTRUCTION_EMAIL_DRAFTER = `
You are a professional email drafter for influencer marketing campaigns. 
Your role is to create engaging, personalized, and professional emails that help build relationships with content creators.

Guidelines:
- Maintain a friendly yet professional tone
- Personalize emails using provided contact and campaign information
- Be clear about expectations and deliverables
- Always include next steps or calls to action
- Use proper email formatting and structure
- Replace placeholders appropriately or leave them for manual completion if context is missing
`;

const SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT = `
You are an AI assistant helping with influencer marketing negotiations. 
Your role is to analyze email replies and assist in the negotiation process.

Guidelines:
- Analyze replies objectively and identify key points
- Determine if you can respond autonomously or if human input is needed
- For minor clarifications or standard terms, you can respond directly
- For significant changes to budget, deliverables, or strategic decisions, escalate to humans
- Always maintain professionalism and positive relationship building
- Provide clear, actionable analysis and suggestions
- When drafting replies, be diplomatic and solution-oriented
`;

// Sanjay Simulation Data for Testing
const SANJAY_ID = 'sanjay_malladi_sim';

const SANJAY_SIMULATED_REPLIES = [
  {
    subject: "Re: Exciting Collaboration Opportunity with [Brand Name]",
    content: `Hi Alex,

Thank you for reaching out! I'm definitely interested in learning more about this collaboration opportunity.

I checked out your campaign details and it looks really interesting. I'd love to discuss the terms further.

A few questions:
- What's the timeline for content creation?
- Are you flexible on the deliverables format?
- What's the compensation structure you have in mind?

Looking forward to hearing from you!

Best regards,
Sanjay Malladi`,
    triggersHumanInput: false
  },
  {
    subject: "Re: Campaign Details and Next Steps",
    content: `Hi Alex,

Thanks for the detailed information! I'm excited about this collaboration.

I have a few thoughts on the terms:
- The timeline works well for me
- I'd like to propose creating 2 videos instead of 3, with higher production value
- For compensation, I was hoping for something closer to $2500 given my audience size

Let me know if these adjustments work for your campaign goals.

Best,
Sanjay`,
    triggersHumanInput: true,
    changeRequested: "Wants 2 videos instead of 3, and $2500 compensation"
  },
  {
    subject: "Re: Updated Terms Discussion",
    content: `Hi Alex,

Perfect! Those terms work great for me. 

I'm happy to proceed with:
- 2 high-quality video posts
- $2200 compensation 
- 4-week timeline for delivery
- 2 rounds of revisions included

When can we get the contract started? I'm excited to create some amazing content for your brand!

Best regards,
Sanjay Malladi`,
    triggersAgreement: true
  },
  {
    subject: "Re: Contract for Review",
    content: `Hi Alex,

I've reviewed the contract and everything looks good! 

I've signed and sent it back. Looking forward to getting started on this collaboration.

Could you please confirm the content brief and brand guidelines when you have a chance? I want to make sure I capture exactly what you're looking for.

Thanks!
Sanjay`,
    isSignedContract: true
  }
];

// Email Templates and Configuration
const DEFAULT_EMAIL_SETTINGS = {
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
  timeout: 30000, // 30 seconds
};

// AI Configuration
const AI_CONFIG = {
  maxTokens: 2048,
  temperature: 0.7,
  topP: 1,
  topK: 40,
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH', 
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
};

// Status Constants
const NEGOTIATION_STATUS = {
  INITIATED: 'initiated',
  IN_PROGRESS: 'in_progress',
  PENDING_HUMAN: 'pending_human',
  AGREEMENT_REACHED: 'agreement_reached',
  CONTRACT_SENT: 'contract_sent',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const EMAIL_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  REPLIED: 'replied',
  BOUNCED: 'bounced',
  FAILED: 'failed'
};

// API Configuration
const API_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ldlugxlfqcnbqiwfnzii.supabase.co',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbHVneGxmcWNuYnFpd2ZuemlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyNDM5MzQsImV4cCI6MjA0ODgxOTkzNH0._K_umuSZU2UepRd2LQzrMlvEhJDr5TnVlHyNSILsStY',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
};

// Updated Voice Configuration with Vidya as default
const SUPPORTED_VOICES = {
  // English voices (Vidya first as default)
  'en-IN-vidya': { lang: 'en-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (English)', provider: 'Sarvam AI' },
  'en-IN-anushka': { lang: 'en-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (English)', provider: 'Sarvam AI' },
  'en-IN-manisha': { lang: 'en-IN', speaker: 'manisha', gender: 'female', name: 'Manisha (English)', provider: 'Sarvam AI' },
  'en-IN-arya': { lang: 'en-IN', speaker: 'arya', gender: 'female', name: 'Arya (English)', provider: 'Sarvam AI' },
  'en-IN-abhilash': { lang: 'en-IN', speaker: 'abhilash', gender: 'male', name: 'Abhilash (English)', provider: 'Sarvam AI' },
  'en-IN-karun': { lang: 'en-IN', speaker: 'karun', gender: 'male', name: 'Karun (English)', provider: 'Sarvam AI' },
  'en-IN-hitesh': { lang: 'en-IN', speaker: 'hitesh', gender: 'male', name: 'Hitesh (English)', provider: 'Sarvam AI' },
  
  // Hindi voices (Vidya first as default)
  'hi-IN-vidya': { lang: 'hi-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (हिन्दी)', provider: 'Sarvam AI' },
  'hi-IN-anushka': { lang: 'hi-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (हिन्दी)', provider: 'Sarvam AI' },
  'hi-IN-manisha': { lang: 'hi-IN', speaker: 'manisha', gender: 'female', name: 'Manisha (हिन्दी)', provider: 'Sarvam AI' },
  'hi-IN-abhilash': { lang: 'hi-IN', speaker: 'abhilash', gender: 'male', name: 'Abhilash (हिन्दी)', provider: 'Sarvam AI' },
  
  // Bengali voices
  'bn-IN-vidya': { lang: 'bn-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (বাংলা)', provider: 'Sarvam AI' },
  'bn-IN-anushka': { lang: 'bn-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (বাংলা)', provider: 'Sarvam AI' },
  
  // Tamil voices
  'ta-IN-vidya': { lang: 'ta-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (தமிழ்)', provider: 'Sarvam AI' },
  'ta-IN-anushka': { lang: 'ta-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (தமிழ்)', provider: 'Sarvam AI' },
  
  // Telugu voices
  'te-IN-vidya': { lang: 'te-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (తెలుగు)', provider: 'Sarvam AI' },
  'te-IN-anushka': { lang: 'te-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (తెలుగు)', provider: 'Sarvam AI' },
  
  // Malayalam voices
  'ml-IN-vidya': { lang: 'ml-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (മലയാളം)', provider: 'Sarvam AI' },
  'ml-IN-anushka': { lang: 'ml-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (മലയാളം)', provider: 'Sarvam AI' },
  
  // Gujarati voices
  'gu-IN-vidya': { lang: 'gu-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ગુજરાતી)', provider: 'Sarvam AI' },
  'gu-IN-anushka': { lang: 'gu-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ગુજરાતી)', provider: 'Sarvam AI' },
  
  // Kannada voices
  'kn-IN-vidya': { lang: 'kn-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ಕನ್ನಡ)', provider: 'Sarvam AI' },
  'kn-IN-anushka': { lang: 'kn-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ಕನ್ನಡ)', provider: 'Sarvam AI' },
  
  // Odia voices
  'or-IN-vidya': { lang: 'or-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ଓଡ଼ିଆ)', provider: 'Sarvam AI' },
  'or-IN-anushka': { lang: 'or-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ଓଡ଼ିଆ)', provider: 'Sarvam AI' },
  
  // Punjabi voices
  'pa-IN-vidya': { lang: 'pa-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ਪੰਜਾਬੀ)', provider: 'Sarvam AI' },
  'pa-IN-anushka': { lang: 'pa-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ਪੰਜਾਬੀ)', provider: 'Sarvam AI' },
};

// Default voice configuration (Vidya)
const DEFAULT_VOICE_CONFIG = {
  voiceKey: 'en-IN-vidya',
  languageCode: 'en-IN',
  speaker: 'vidya',
  provider: 'Sarvam AI'
};

// Supported languages with Sarvam AI
const SUPPORTED_LANGUAGES = {
  'en-IN': { name: 'English (India)', code: 'en-IN', nativeName: 'English' },
  'hi-IN': { name: 'Hindi', code: 'hi-IN', nativeName: 'हिन्दी' },
  'bn-IN': { name: 'Bengali', code: 'bn-IN', nativeName: 'বাংলা' },
  'ta-IN': { name: 'Tamil', code: 'ta-IN', nativeName: 'தமிழ்' },
  'te-IN': { name: 'Telugu', code: 'te-IN', nativeName: 'తెలుగు' },
  'ml-IN': { name: 'Malayalam', code: 'ml-IN', nativeName: 'മലയാളം' },
  'gu-IN': { name: 'Gujarati', code: 'gu-IN', nativeName: 'ગુજરાતી' },
  'kn-IN': { name: 'Kannada', code: 'kn-IN', nativeName: 'ಕನ್ನಡ' },
  'or-IN': { name: 'Odia', code: 'or-IN', nativeName: 'ଓଡ଼ିଆ' },
  'pa-IN': { name: 'Punjabi', code: 'pa-IN', nativeName: 'ਪੰਜਾਬੀ' }
};

// Voice Assistant Configuration
const VOICE_ASSISTANT_CONFIG = {
  DEFAULT_VOICE: DEFAULT_VOICE_CONFIG,
  SUPPORTED_VOICES: SUPPORTED_VOICES,
  SUPPORTED_LANGUAGES: SUPPORTED_LANGUAGES,
  AUDIO_CONFIG: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  PROCESSING_TIMEOUT: 30000,
  RECORDING_MAX_DURATION: 60000
};

// Campaign Types
const CAMPAIGN_TYPES = {
  SPONSORED_POST: 'sponsored_post',
  PRODUCT_REVIEW: 'product_review',
  BRAND_AMBASSADOR: 'brand_ambassador',
  EVENT_COVERAGE: 'event_coverage',
  TUTORIAL: 'tutorial',
  UNBOXING: 'unboxing'
};

module.exports = {
  // AI Models and Instructions
  GEMINI_MODEL_TEXT,
  SYSTEM_INSTRUCTION_EMAIL_DRAFTER,
  SYSTEM_INSTRUCTION_NEGOTIATION_ASSISTANT,
  
  // Simulation Data
  SANJAY_ID,
  SANJAY_SIMULATED_REPLIES,
  
  // Configuration
  DEFAULT_EMAIL_SETTINGS,
  AI_CONFIG,
  
  // Status Constants
  NEGOTIATION_STATUS,
  EMAIL_STATUS,

  API_CONFIG,
  VOICE_ASSISTANT_CONFIG,
  DEFAULT_VOICE_CONFIG,
  SUPPORTED_VOICES,
  SUPPORTED_LANGUAGES,
  CAMPAIGN_TYPES,
}; 