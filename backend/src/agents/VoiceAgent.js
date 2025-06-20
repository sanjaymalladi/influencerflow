const { EventEmitter } = require('events');
const SarvamAiService = require('../services/sarvamAiService');

// Enhanced caching for optimized responses
const responseCache = new Map();
const commonPhrases = new Map([
  ['hello', 'Hi! I\'m Vidya, here to help you make a great deal.'],
  ['hi', 'Hey! How can I help you today?'],
  ['thank you', 'No problem! Need anything else?'],
  ['goodbye', 'Bye! Hope we got you a good deal!'],
  ['help', 'I\'m here to help you get the best deal. What do you want to know?']
]);

// Constants for Sarvam AI configuration
const SUPPORTED_VOICES = {
  '1': { lang: 'en-IN', speaker: 'vidya', gender: 'female', greeting: 'Hello' },
  '2': { lang: 'hi-IN', speaker: 'vidya', gender: 'female', greeting: 'नमस्ते' },
  '3': { lang: 'te-IN', speaker: 'vidya', gender: 'female', greeting: 'నమస్కారం' },
  '4': { lang: 'ta-IN', speaker: 'vidya', gender: 'female', greeting: 'வணக்கம்' },
};

class VoiceAgent extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this.activeNegotiations = new Map();
    this.performanceMetrics = {
      totalRequests: 0,
      avgResponseTime: 0,
      cacheHits: 0,
      optimizedRequests: 0
    };

    // Initialize Sarvam AI service
    this.sarvamAI = new SarvamAiService();

    this.addLog('VoiceAgent initialized with Sarvam AI integration and optimization features.');
  }

  addLog(message, type = 'info') {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      type,
      service: 'VoiceAgent'
    };
    this.logs.push(log);
    console.log(`[${type.toUpperCase()}] [VoiceAgent] ${message}`);
  }

  // Enhanced negotiation initialization with campaign context
  async initializeNegotiation(config) {
    try {
      const {
        negotiationId,
        creatorName,
        campaignTitle,
        negotiationContext,
        campaignData,
        selectedCreators,
        strategy,
        voiceKey,
        languageCode,
        optimizedMode = true
      } = config;

      this.addLog(`Initializing negotiation ${negotiationId} with enhanced context`);

      // Build comprehensive context for AI
      const enhancedContext = {
        negotiationId,
        creatorName,
        campaignTitle,
        strategy,
        voiceKey,
        languageCode,
        optimizedMode,
        campaignData: {
          briefSummary: campaignData?.briefSummary || campaignTitle,
          targetAudience: campaignData?.targetAudience || 'General audience',
          keyTalkingPoints: campaignData?.keyTalkingPoints || [],
          budget: campaignData?.budget || negotiationContext?.budget || 25000,
          timeline: campaignData?.timeline || negotiationContext?.timeline || '2 weeks',
          deliverables: negotiationContext?.deliverables || ['Instagram Posts', 'Stories']
        },
        creatorContext: selectedCreators?.length > 0 ? {
          name: selectedCreators[0].name,
          platform: selectedCreators[0].platform,
          followers: selectedCreators[0].followers,
          engagement: selectedCreators[0].engagement,
          pricing: selectedCreators[0].pricing
        } : null,
        startTime: new Date(),
        conversationHistory: []
      };

      this.activeNegotiations.set(negotiationId, enhancedContext);

      // Pre-generate common responses for faster interactions
      if (optimizedMode) {
        await this.preGenerateResponses(languageCode, enhancedContext);
      }

      this.addLog(`Negotiation ${negotiationId} initialized successfully with optimization`);
      
      return {
        success: true,
        negotiationId,
        context: enhancedContext,
        optimizedMode
      };

    } catch (error) {
      this.addLog(`Failed to initialize negotiation: ${error.message}`, 'error');
      throw error;
    }
  }

  // Pre-generate common responses for optimized mode
  async preGenerateResponses(languageCode, context) {
    try {
      const commonQueries = [
        'What is the budget for this campaign?',
        'When do you need this completed?',
        'What deliverables are you looking for?',
        'Can you tell me about the target audience?'
      ];

      for (const query of commonQueries) {
        try {
          const cacheKey = `${languageCode}_${query}`;
          if (!responseCache.has(cacheKey)) {
            const response = await this.generateContextualResponse(query, context, languageCode);
            responseCache.set(cacheKey, {
              response,
              timestamp: Date.now(),
              language: languageCode
            });
          }
        } catch (error) {
          console.warn(`Failed to pre-generate response for: ${query}`);
        }
      }

      this.addLog(`Pre-generated responses for ${languageCode}`);
    } catch (error) {
      console.warn(`Failed to pre-generate responses: ${error.message}`);
    }
  }

  // Enhanced voice input processing with optimization
  async processVoiceInput(config) {
    const startTime = Date.now();
    try {
      const {
        audioBuffer,
        languageCode,
        negotiationId,
        context,
        mimeType,
        optimizedMode = true
      } = config;

      this.addLog(`Processing voice input for ${negotiationId}, optimized: ${optimizedMode}`);

      // Get negotiation context
      const negotiationContext = this.activeNegotiations.get(negotiationId) || context;
      if (!negotiationContext) {
        throw new Error('Negotiation context not found');
      }

      let timing = { stt: 0, ai: 0, tts: 0 };
      let transcript, aiResponse, audioResponse;

      // Step 1: Speech-to-Text
      const sttStart = Date.now();
      const sttResult = await this.sarvamAI.speechToText(audioBuffer, languageCode, mimeType);
      timing.stt = Date.now() - sttStart;

      if (!sttResult.success) {
        throw new Error(`STT failed: ${sttResult.error}`);
      }

      transcript = sttResult.transcript;
      this.addLog(`STT completed in ${timing.stt}ms: "${transcript}"`);

      // Step 2: Check cache for optimized responses
      let contextUsed = false;
      if (optimizedMode) {
        const cachedResponse = this.getCachedResponse(transcript, languageCode);
        if (cachedResponse) {
          aiResponse = cachedResponse;
          this.performanceMetrics.cacheHits++;
          this.addLog(`Using cached response for optimization`);
        }
      }

      // Step 3: Generate AI response if not cached
      if (!aiResponse) {
        const aiStart = Date.now();
        aiResponse = await this.generateContextualResponse(transcript, negotiationContext, languageCode);
        timing.ai = Date.now() - aiStart;
        contextUsed = true;
      }

      this.addLog(`AI response generated in ${timing.ai}ms`);

      // Step 4: Text-to-Speech
      const ttsStart = Date.now();
      const ttsResult = await this.sarvamAI.textToSpeech(
        aiResponse, 
        `${languageCode}-vidya`, 
        languageCode,
        { optimizedMode }
      );
      timing.tts = Date.now() - ttsStart;

      if (ttsResult.success) {
        audioResponse = ttsResult.audioData;
        this.addLog(`TTS completed in ${timing.tts}ms`);
      }

      // Update conversation history
      if (negotiationContext.conversationHistory) {
        negotiationContext.conversationHistory.push({
          timestamp: new Date(),
          userInput: transcript,
          aiResponse,
          language: languageCode
        });
      }

      // Update performance metrics
      const totalTime = Date.now() - startTime;
      timing.total = totalTime;
      this.updatePerformanceMetrics(totalTime, optimizedMode);

      return {
        success: true,
        transcript,
        aiResponse,
        audioResponse,
        timing,
        contextUsed,
        optimized: optimizedMode
      };

    } catch (error) {
      this.addLog(`Voice processing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Generate contextual response using campaign data
  async generateContextualResponse(userInput, context, languageCode) {
    try {
      // Build context-aware prompt
      const campaignInfo = context.campaignData || {};
      const creatorInfo = context.creatorContext || {};
      
      const systemPrompt = this.buildSystemPrompt(languageCode, campaignInfo, creatorInfo, context.creatorName);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ];

      // Add conversation history for context
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-3); // Last 3 exchanges
        for (const exchange of recentHistory) {
          messages.splice(-1, 0, 
            { role: 'user', content: exchange.userInput },
            { role: 'assistant', content: exchange.aiResponse }
          );
        }
      }

      const response = await this.sarvamAI.chatCompletion(messages, languageCode, {
        maxTokens: 80, // Shorter responses for faster processing
        temperature: 0.7,
        campaignContext: campaignInfo,
        creatorContext: creatorInfo
      });

      return response.content || response.message || 'Got it! What do you want to do next?';

    } catch (error) {
      this.addLog(`AI response generation failed: ${error.message}`, 'error');
      
      // Fallback responses by language
      const fallbackResponses = {
        'en-IN': 'Got it! I can help you work out a good deal. What do you want to talk about?',
        'hi-IN': 'समझ गया! मैं आपको अच्छा deal बनाने में मदद कर सकती हूं। आप क्या बात करना चाहते हैं?',
        'te-IN': 'అర్థమైంది! మంచి deal చేయడంలో మీకు సహాయం చేస్తాను. మీరు ఏమి మాట్లాడాలని అనుకుంటున్నారు?',
        'ta-IN': 'புரிந்தது! நல்ல deal செய்ய உங்களுக்கு உதவ முடியும். நீங்கள் எதைப் பற்றி பேச விரும்புகிறீர்கள்?'
      };
      
      return fallbackResponses[languageCode] || fallbackResponses['en-IN'];
    }
  }

  // Build language-specific system prompt with campaign context
  buildSystemPrompt(languageCode, campaignInfo, creatorInfo, creatorName) {
    const basePrompts = {
      'en-IN': `You are Vidya, a friendly AI helper for brand deals. You're helping ${creatorName} and a brand work out a good campaign deal together.

About this campaign:
- What it's about: ${campaignInfo.briefSummary || 'Not mentioned yet'}
- Who it's for: ${campaignInfo.targetAudience || 'General people'}
- Budget: ₹${(campaignInfo.budget * 83) || 'Not mentioned yet'}
- When needed: ${campaignInfo.timeline || 'Not mentioned yet'}
- What's needed: ${campaignInfo.deliverables?.join(', ') || 'Not mentioned yet'}
- Main points: ${campaignInfo.keyTalkingPoints?.join(', ') || 'None mentioned'}

${creatorInfo ? `About ${creatorInfo.name}:
- Platform: ${creatorInfo.platform}
- Followers: ${creatorInfo.followers?.toLocaleString()}
- How active fans are: ${creatorInfo.engagement}
- Usual rate: ₹${creatorInfo.pricing || 'Not mentioned'}` : ''}

Talk like a normal person. Be friendly and helpful. Try to make both sides happy. Keep it short and simple. No fancy words!`,

      'hi-IN': `आप विद्या हैं, एक मित्रवत AI सहायक। आप ${creatorName} और ब्रांड के बीच अच्छा deal बनाने में मदद कर रही हैं।

इस campaign के बारे में:
- यह किस बारे में है: ${campaignInfo.briefSummary || 'अभी तक नहीं बताया'}
- किसके लिए है: ${campaignInfo.targetAudience || 'आम लोग'}
- बजट: ₹${(campaignInfo.budget * 83) || 'अभी तक नहीं बताया'}
- कब चाहिए: ${campaignInfo.timeline || 'अभी तक नहीं बताया'}
- क्या चाहिए: ${campaignInfo.deliverables?.join(', ') || 'अभी तक नहीं बताया'}

आसान भाषा में बात करें। दोस्ताना और helpful रहें। दोनों को खुश करने की कोशिश करें। छोटे और सरल जवाब दें!`,

      'te-IN': `మీరు విద్య, ఒక స్నేహపూర్వక AI సహాయకురాలు. మీరు బ్రాండ్ మరియు ${creatorName} మధ్య ప్రచార ఒప్పందం చర్చలలో సహాయం చేస్తున్నారు।

ఈ campaign గురించి:
- ఇది దేని గురించి: ${campaignInfo.briefSummary || 'ఇంకా చెప్పలేదు'}
- ఎవరికోసం: ${campaignInfo.targetAudience || 'సాధారణ ప్రజలు'}
- బడ్జెట్: ₹${(campaignInfo.budget * 83) || 'ఇంకా చెప్పలేదు'}
- ఎప్పుడు కావాలి: ${campaignInfo.timeline || 'ఇంకా చెప్పలేదు'}

సాధారణ భాషలో మాట్లాడండి. స్నేహపూర్వకంగా మరియు helpful గా ఉండండి. రెండు వైపులా సంతోషపెట్టే ప్రయత్నం చేయండి. చిన్న మరియు సరళమైన జవాబులు ఇవ్వండి!`
    };

    return basePrompts[languageCode] || basePrompts['en-IN'];
  }

  // Get cached response for optimization
  getCachedResponse(input, languageCode) {
    const normalizedInput = input.toLowerCase().trim();
    
    // Check common phrases
    for (const [phrase, response] of commonPhrases) {
      if (normalizedInput.includes(phrase)) {
        return response;
      }
    }

    // Check response cache
    const cacheKey = `${languageCode}_${normalizedInput}`;
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutes cache
      return cached.response;
    }

    return null;
  }

  // Enhanced TTS with optimization
  async textToSpeech(text, voiceKey, languageCode, options = {}) {
    try {
      const { optimizedMode = true } = options;
      
      this.addLog(`TTS request for "${text.substring(0, 30)}..." with ${voiceKey}, optimized: ${optimizedMode}`);
      
      const result = await this.sarvamAI.textToSpeech(text, voiceKey, languageCode);
      
      if (optimizedMode) {
        this.performanceMetrics.optimizedRequests++;
      }
      
      return {
        ...result,
        timing: { tts: result.timing || 0 },
        optimized: optimizedMode
      };
      
    } catch (error) {
      this.addLog(`TTS failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Update performance metrics
  updatePerformanceMetrics(responseTime, optimized = false) {
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.avgResponseTime = 
      (this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) / 
      this.performanceMetrics.totalRequests;
    
    if (optimized) {
      this.performanceMetrics.optimizedRequests++;
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalRequests > 0 
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100 
        : 0,
      optimizationRate: this.performanceMetrics.totalRequests > 0
        ? (this.performanceMetrics.optimizedRequests / this.performanceMetrics.totalRequests) * 100
        : 0
    };
  }

  // Check if Sarvam AI is configured
  isSarvamConfigured() {
    return this.sarvamAI.isSarvamConfigured();
  }

  // Get supported voices
  getSupportedVoices() {
    return this.sarvamAI.getSupportedVoices();
  }

  // Get logs
  getLogs() {
    return this.logs;
  }

  // Cleanup method
  cleanup() {
    // Clear old cache entries
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > 600000) { // 10 minutes
        responseCache.delete(key);
      }
    }
    
    // Clear old negotiations
    for (const [id, context] of this.activeNegotiations.entries()) {
      if (now - context.startTime > 3600000) { // 1 hour
        this.activeNegotiations.delete(id);
      }
    }
  }
}

// Cleanup interval
setInterval(() => {
  if (global.voiceAgent) {
    global.voiceAgent.cleanup();
  }
}, 300000); // 5 minutes

module.exports = VoiceAgent; 