const { EventEmitter } = require('events');
const SarvamAiService = require('../services/sarvamAiService');

// Constants for Sarvam AI configuration
const SUPPORTED_VOICES = {
  '1': { lang: 'en-IN', speaker: 'anushka', gender: 'female', greeting: 'Hello' },
  '2': { lang: 'hi-IN', speaker: 'sunita', gender: 'female', greeting: 'नमस्ते' },
  '3': { lang: 'en-IN', speaker: 'vivek', gender: 'male', greeting: 'Hello' },
  '4': { lang: 'hi-IN', speaker: 'sanjeev', gender: 'male', greeting: 'नमस्ते' },
};

class VoiceAgent extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this.activeNegotiations = new Map();

    // Initialize Sarvam AI service
    this.sarvamAI = new SarvamAiService();

    this.addLog('VoiceAgent initialized with Sarvam AI integration for web-based voice chat.');
  }

  addLog(message, type = 'info') {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      type,
      agent: 'VoiceAgent',
    };
    this.logs.push(log);
    console.log(`[${type.toUpperCase()}] [VoiceAgent] ${message}`);
  }

  // Process speech-to-text using Sarvam AI
  async processSpeechToText(audioBuffer, languageCode = 'en-IN') {
    try {
      this.addLog(`Processing STT for audio buffer of size: ${audioBuffer.length} bytes`);
      
      const result = await this.sarvamAI.speechToText(audioBuffer, languageCode);
      
      if (result && result.transcript) {
        this.addLog(`STT successful: "${result.transcript}"`);
        return result.transcript;
      } else {
        this.addLog('STT failed - no transcript returned', 'warn');
        return null;
      }
    } catch (error) {
      this.addLog(`STT error: ${error.message}`, 'error');
      return null;
    }
  }

  // Generate AI response for negotiation using Sarvam AI chat completion
  async generateNegotiationReply(negotiation, userInput = '') {
    try {
      this.addLog(`Generating negotiation response for ${negotiation.negotiationId}`);

      // Build conversation history for context
      const conversationHistory = negotiation.transcript.slice(-5).map(t => ({
        role: t.speaker === 'user' ? 'user' : 'assistant',
        content: t.text
      }));

      // System prompt for negotiation context
      const systemPrompt = {
        role: 'system',
        content: `You are an AI negotiation specialist for InfluencerFlow, helping to negotiate influencer collaborations.

NEGOTIATION CONTEXT:
- Creator: ${negotiation.creatorName}
- Campaign: ${negotiation.campaignTitle}
- Budget: $${negotiation.negotiationContext?.budget || 'Not specified'}
- Deliverables: ${negotiation.negotiationContext?.deliverables?.join(', ') || 'Not specified'}
- Timeline: ${negotiation.negotiationContext?.timeline || 'Not specified'}
- Strategy: ${negotiation.strategy}

INSTRUCTIONS:
- Be professional, friendly, and collaborative
- Focus on finding mutually beneficial solutions
- Ask clarifying questions when needed
- Suggest specific terms and conditions
- Keep responses conversational and under 100 words
- Use the creator's name naturally in conversation
- Address pricing, deliverables, timeline, and creative freedom as appropriate
- Help negotiate fair terms for both parties`
      };

      // Add user's latest message
      if (userInput) {
        conversationHistory.push({
          role: 'user',
          content: userInput
        });
      }

      // Prepare messages for chat completion
      const messages = [systemPrompt, ...conversationHistory];

      // Call Sarvam AI chat completion
      const result = await this.sarvamAI.chatCompletion(messages, {
        temperature: 0.7,
        maxTokens: 150,
        reasoningEffort: 'medium'
      });

      if (result && result.choices && result.choices.length > 0) {
        const aiReply = result.choices[0].message.content;
        this.addLog(`Generated AI negotiation response for ${negotiation.negotiationId}`);
        return aiReply;
      } else {
        throw new Error('No response from chat completion');
      }

    } catch (error) {
      this.addLog(`Chat completion failed for negotiation ${negotiation.negotiationId}: ${error.message}`, 'error');
      return this.generateFallbackResponse(negotiation, userInput);
    }
  }

  generateFallbackResponse(negotiation, userInput) {
    const fallbackResponses = [
      `Thanks for sharing that, ${negotiation.creatorName}. Let me make sure I understand your requirements correctly for the ${negotiation.campaignTitle} campaign.`,
      `That's a great point about the collaboration terms. For this ${negotiation.campaignTitle} project, we want to ensure both creative freedom and campaign objectives are met.`,
      `I appreciate you bringing that up. Let's work together to find the best approach for this ${negotiation.campaignTitle} partnership.`,
      `Thank you for the feedback. Can you tell me more about your preferences for this collaboration?`,
      `That's an important consideration for our ${negotiation.campaignTitle} campaign. What would work best for your content creation process?`
    ];

    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    this.addLog(`Using fallback response for ${negotiation.negotiationId}`, 'warn');
    return randomResponse;
  }

  // Generate speech from text using Sarvam AI
  async processTextToSpeech(text, languageCode, speaker) {
    try {
      this.addLog(`Processing TTS for text: "${text.substring(0, 50)}..."`);

      const audioBuffer = await this.sarvamAI.textToSpeech(text, languageCode, speaker, {
        pitch: 0,
        pace: 1,
        loudness: 1,
        sampleRate: 22050
      });

      if (audioBuffer) {
        this.addLog(`TTS successful for speaker: ${speaker}, generated ${audioBuffer.length} bytes`);
        return audioBuffer;
      } else {
        this.addLog('TTS failed - no audio buffer returned', 'warn');
        return null;
      }

    } catch (error) {
      this.addLog(`TTS error: ${error.message}`, 'error');
      return null;
    }
  }

  // Detect language of input text
  async detectLanguage(text) {
    try {
      const result = await this.sarvamAI.detectLanguage(text);
      this.addLog(`Language detected: ${result.language_code} (confidence: ${result.confidence})`);
      return result;
    } catch (error) {
      this.addLog(`Language detection failed: ${error.message}`, 'error');
      return { language_code: 'en-IN', confidence: 0.5 };
    }
  }

  // Get supported voices
  getSupportedVoices() {
    return this.sarvamAI.getSupportedVoices();
  }

  // Check if Sarvam AI is properly configured
  isSarvamConfigured() {
    return this.sarvamAI.isConfigured();
  }

  // End negotiation session
  async endNegotiationSession(negotiationId, reason) {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (negotiation) {
      negotiation.status = 'ENDED';
      negotiation.endReason = reason;
      negotiation.endedAt = new Date();
      this.addLog(`Negotiation session ${negotiationId} ended: ${reason}`);
    }
  }

  getLogs() {
    return this.logs;
  }

  getActiveNegotiations() {
    return Array.from(this.activeNegotiations.values());
  }

  // Get combined logs from both VoiceAgent and SarvamAI service
  getAllLogs() {
    const voiceLogs = this.getLogs();
    const sarvamLogs = this.sarvamAI.getLogs();
    
    // Combine and sort by timestamp
    const allLogs = [...voiceLogs, ...sarvamLogs].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    return allLogs;
  }

  // Initialize negotiation session
  async initializeNegotiation({ negotiationId, creatorName, campaignTitle, negotiationContext, strategy, voiceKey, languageCode }) {
    try {
      this.addLog(`Initializing negotiation session: ${negotiationId} for creator: ${creatorName}`);

      // Create negotiation context
      const negotiation = {
        negotiationId,
        creatorName,
        campaignTitle,
        negotiationContext,
        strategy,
        voiceKey,
        languageCode,
        transcript: [],
        status: 'ACTIVE',
        startedAt: new Date()
      };

      // Store in active negotiations
      this.activeNegotiations.set(negotiationId, negotiation);

      // Generate initial greeting
      const greetingText = `Hello ${creatorName}! I'm excited to discuss the ${campaignTitle} collaboration opportunity with you. How are you feeling about this partnership?`;
      
      this.addLog(`Negotiation session ${negotiationId} initialized successfully`);
      
      return {
        success: true,
        negotiationId,
        greetingText,
        context: negotiation
      };

    } catch (error) {
      this.addLog(`Failed to initialize negotiation ${negotiationId}: ${error.message}`, 'error');
      throw error;
    }
  }

  // Process voice input (STT + AI + TTS pipeline)
  async processVoiceInput({ audioBuffer, languageCode, negotiationId, context, mimeType }) {
    try {
      const startTime = Date.now();
      this.addLog(`Processing voice input for negotiation: ${negotiationId}`);

      // Step 1: Speech to Text
      const sttStart = Date.now();
      const transcript = await this.processSpeechToText(audioBuffer, languageCode);
      const sttTime = Date.now() - sttStart;

      if (!transcript) {
        throw new Error('Failed to transcribe audio');
      }

      // Step 2: Generate AI response
      const aiStart = Date.now();
      const negotiation = this.activeNegotiations.get(negotiationId) || context;
      const aiResponse = await this.generateNegotiationReply(negotiation, transcript);
      const aiTime = Date.now() - aiStart;

      // Step 3: Text to Speech
      const ttsStart = Date.now();
      const speaker = negotiation.voiceKey || 'en-IN-vidya';
      const audioResponse = await this.processTextToSpeech(aiResponse, languageCode, speaker);
      const ttsTime = Date.now() - ttsStart;

      // Update negotiation transcript
      if (negotiation) {
        negotiation.transcript.push(
          { speaker: 'user', text: transcript, timestamp: new Date() },
          { speaker: 'assistant', text: aiResponse, timestamp: new Date() }
        );
        this.activeNegotiations.set(negotiationId, negotiation);
      }

      const totalTime = Date.now() - startTime;

      this.addLog(`Voice processing completed for ${negotiationId} in ${totalTime}ms`);

      return {
        success: true,
        transcript,
        aiResponse,
        audioResponse: audioResponse ? audioResponse.toString('base64') : null,
        timing: {
          stt: sttTime,
          ai: aiTime,
          tts: ttsTime,
          total: totalTime
        }
      };

    } catch (error) {
      this.addLog(`Voice processing failed for ${negotiationId}: ${error.message}`, 'error');
      throw error;
    }
  }

  // Text to Speech wrapper
  async textToSpeech(text, voiceKey, languageCode) {
    try {
      const audioBuffer = await this.processTextToSpeech(text, languageCode, voiceKey);
      
      return {
        success: true,
        audioData: audioBuffer ? audioBuffer.toString('base64') : null,
        voice: voiceKey,
        provider: 'Sarvam AI'
      };
    } catch (error) {
      this.addLog(`TTS wrapper failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

module.exports = VoiceAgent; 