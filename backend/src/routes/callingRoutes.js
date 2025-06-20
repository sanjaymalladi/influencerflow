const express = require('express');
const VoiceAgent = require('../agents/VoiceAgent');
const { SUPPORTED_VOICES, DEFAULT_VOICE_CONFIG, SUPPORTED_LANGUAGES } = require('../constants');

const router = express.Router();
const voiceAgent = new VoiceAgent();

// Store active negotiations
const activeNegotiations = new Map();

// Initialize negotiation session
router.post('/initiate', async (req, res) => {
  try {
    const {
      creatorName = 'Creator',
      campaignTitle = 'Campaign',
      negotiationContext = {},
      campaignData = {},
      selectedCreators = [],
      strategy = 'collaborative',
      mode = 'voice_chat',
      voiceKey = DEFAULT_VOICE_CONFIG.voiceKey, // Default to Vidya
      languageCode = DEFAULT_VOICE_CONFIG.languageCode,
      optimizedMode = true,
      silenceDetection = true,
      campaignContext = {}
    } = req.body;

    console.log(`[VoiceAgent] Initiating negotiation with voice: ${voiceKey}, language: ${languageCode}, optimized: ${optimizedMode}`);

    // Validate voice selection - always use Vidya for consistency
    const actualVoiceKey = `${languageCode}-vidya`;
    const selectedVoice = SUPPORTED_VOICES[actualVoiceKey];
    if (!selectedVoice) {
      // Fallback to default Vidya voice
      const fallbackVoiceKey = DEFAULT_VOICE_CONFIG.voiceKey;
      console.warn(`Voice ${actualVoiceKey} not found, using fallback: ${fallbackVoiceKey}`);
    }

    // Generate unique negotiation ID
    const negotiationId = `nego_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced negotiation context with campaign data
    const enhancedContext = {
      ...negotiationContext,
      ...campaignContext,
      campaignData,
      selectedCreators,
      optimizedMode,
      silenceDetection
    };
    
    // Store negotiation context
    const negotiationData = {
      id: negotiationId,
      creatorName,
      campaignTitle,
      negotiationContext: enhancedContext,
      campaignData,
      selectedCreators,
      strategy,
      mode,
      voiceKey: actualVoiceKey,
      languageCode,
      voice: selectedVoice || SUPPORTED_VOICES[DEFAULT_VOICE_CONFIG.voiceKey],
      optimizedMode,
      silenceDetection,
      status: 'active',
      startTime: new Date(),
      messageHistory: [],
      lastActivity: new Date(),
      performanceMetrics: {
        avgResponseTime: 0,
        totalRequests: 0,
        successRate: 100
      }
    };
    
    activeNegotiations.set(negotiationId, negotiationData);

    // Initialize voice agent session with enhanced context
    const initResult = await voiceAgent.initializeNegotiation({
      negotiationId,
      creatorName,
      campaignTitle,
      negotiationContext: enhancedContext,
      campaignData,
      selectedCreators,
      strategy,
      voiceKey: actualVoiceKey,
      languageCode,
      optimizedMode
    });

    res.json({
      success: true,
      negotiationId,
      voice: selectedVoice || SUPPORTED_VOICES[DEFAULT_VOICE_CONFIG.voiceKey],
      language: SUPPORTED_LANGUAGES[languageCode],
      optimizedMode,
      silenceDetection,
      config: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        optimizedLatency: optimizedMode
      },
      campaignContext: {
        hasCampaignData: !!campaignData.briefSummary,
        hasSelectedCreators: selectedCreators.length > 0,
        hasKeyTalkingPoints: !!(campaignData.keyTalkingPoints && campaignData.keyTalkingPoints.length > 0)
      },
      message: `Negotiation session started with Vidya voice in ${SUPPORTED_LANGUAGES[languageCode]?.nativeName || 'English'}`
    });

  } catch (error) {
    console.error('[CallingRoutes] Initiation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize negotiation session'
    });
  }
});

// Process audio input (STT + AI + TTS)
router.post('/process-audio', async (req, res) => {
  const startTime = Date.now();
  try {
    const { 
      audioData, 
      languageCode = 'en-IN', 
      negotiationId, 
      mimeType = 'audio/webm',
      optimizedMode = true,
      campaignContext = {}
    } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: 'Audio data is required'
      });
    }

    if (!negotiationId) {
      return res.status(400).json({
        success: false,
        error: 'Negotiation ID is required'
      });
    }

    // Get negotiation context
    const negotiation = activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation session not found'
      });
    }

    console.log(`[CallingRoutes] Processing audio for negotiation: ${negotiationId}, language: ${languageCode}, optimized: ${optimizedMode}`);

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Enhanced context with campaign data
    const enhancedContext = {
      ...negotiation,
      campaignContext: {
        ...negotiation.negotiationContext,
        ...campaignContext,
        campaignData: negotiation.campaignData,
        selectedCreators: negotiation.selectedCreators
      },
      optimizedMode: optimizedMode || negotiation.optimizedMode
    };
    
    // Process with voice agent
    const result = await voiceAgent.processVoiceInput({
      audioBuffer,
      languageCode,
      negotiationId,
      context: enhancedContext,
      mimeType,
      optimizedMode: optimizedMode || negotiation.optimizedMode
    });

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Update negotiation activity and performance metrics
    negotiation.lastActivity = new Date();
    negotiation.messageHistory.push({
      timestamp: new Date(),
      type: 'voice_interaction',
      userInput: result.transcript,
      aiResponse: result.aiResponse,
      languageCode,
      responseTime,
      optimized: optimizedMode || negotiation.optimizedMode
    });

    // Update performance metrics
    const metrics = negotiation.performanceMetrics;
    metrics.avgResponseTime = (metrics.avgResponseTime * metrics.totalRequests + responseTime) / (metrics.totalRequests + 1);
    metrics.totalRequests += 1;
    metrics.successRate = (metrics.totalRequests * metrics.successRate + 100) / metrics.totalRequests;

    res.json({
      success: true,
      transcript: result.transcript,
      aiResponse: result.aiResponse,
      audioResponse: result.audioResponse,
      negotiationId,
      language: languageCode,
      voice: negotiation.voice.name,
      optimizedMode: optimizedMode || negotiation.optimizedMode,
      processing: {
        sttTime: result.timing?.stt || 0,
        aiTime: result.timing?.ai || 0,
        ttsTime: result.timing?.tts || 0,
        totalTime: result.timing?.total || responseTime,
        optimized: optimizedMode || negotiation.optimizedMode
      },
      performance: {
        responseTime,
        avgResponseTime: Math.round(metrics.avgResponseTime),
        successRate: Math.round(metrics.successRate),
        totalRequests: metrics.totalRequests
      },
      campaignContext: {
        hasContext: !!(campaignContext.budget || campaignContext.deliverables),
        contextUsed: result.contextUsed || false
      }
    });

  } catch (error) {
    console.error('[CallingRoutes] Audio processing failed:', error);
    
    // Update error metrics if negotiation exists
    const negotiation = activeNegotiations.get(req.body.negotiationId);
    if (negotiation) {
      const metrics = negotiation.performanceMetrics;
      metrics.successRate = (metrics.totalRequests * metrics.successRate) / Math.max(metrics.totalRequests + 1, 1);
      metrics.totalRequests += 1;
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process audio input',
      responseTime: Date.now() - startTime
    });
  }
});

// Text-to-Speech endpoint
router.post('/text-to-speech', async (req, res) => {
  try {
    const { 
      text, 
      languageCode = 'en-IN', 
      speaker = 'vidya', // Always default to Vidya
      negotiationId,
      optimizedMode = true
    } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    console.log(`[CallingRoutes] TTS request: "${text.substring(0, 50)}..." with Vidya voice, language: ${languageCode}, optimized: ${optimizedMode}`);

    // Always use Vidya voice for consistency
    const voiceKey = `${languageCode}-vidya`;
    const voiceConfig = SUPPORTED_VOICES[voiceKey];
    
    if (!voiceConfig) {
      // Fallback to default Vidya voice
      const fallbackVoiceKey = DEFAULT_VOICE_CONFIG.voiceKey;
      console.log(`[CallingRoutes] Voice ${voiceKey} not found, using fallback: ${fallbackVoiceKey}`);
    }

    const result = await voiceAgent.textToSpeech(
      text, 
      voiceKey || DEFAULT_VOICE_CONFIG.voiceKey, 
      languageCode,
      { optimizedMode }
    );

    res.json({
      success: true,
      audioData: result.audioData,
      voice: result.voice || 'Vidya',
      text: text,
      languageCode,
      speaker: 'vidya',
      optimizedMode,
      provider: result.provider || 'Sarvam AI',
      processing: {
        ttsTime: result.timing?.tts || 0,
        optimized: optimizedMode
      }
    });

  } catch (error) {
    console.error('[CallingRoutes] TTS failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate speech'
    });
  }
});

// Get conversation transcript
router.get('/transcript/:negotiationId', async (req, res) => {
  try {
    const { negotiationId } = req.params;
    
    const negotiation = activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation session not found'
      });
    }

    res.json({
      success: true,
      negotiationId,
      transcript: negotiation.messageHistory,
      metadata: {
        creatorName: negotiation.creatorName,
        campaignTitle: negotiation.campaignTitle,
        voice: negotiation.voice,
        language: SUPPORTED_LANGUAGES[negotiation.languageCode],
        startTime: negotiation.startTime,
        lastActivity: negotiation.lastActivity,
        totalMessages: negotiation.messageHistory.length
      }
    });

  } catch (error) {
    console.error('[CallingRoutes] Transcript retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve transcript'
    });
  }
});

// End negotiation session
router.post('/end/:negotiationId', async (req, res) => {
  try {
    const { negotiationId } = req.params;
    
    const negotiation = activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation session not found'
      });
    }

    // Mark as ended
    negotiation.status = 'ended';
    negotiation.endTime = new Date();
    
    console.log(`[CallingRoutes] Ended negotiation session: ${negotiationId}`);

    // Clean up after 1 hour
    setTimeout(() => {
      activeNegotiations.delete(negotiationId);
      console.log(`[CallingRoutes] Cleaned up negotiation session: ${negotiationId}`);
    }, 3600000);

    res.json({
      success: true,
      negotiationId,
      summary: {
        duration: negotiation.endTime - negotiation.startTime,
        totalMessages: negotiation.messageHistory.length,
        voice: negotiation.voice.name,
        language: SUPPORTED_LANGUAGES[negotiation.languageCode]?.name
      }
    });

  } catch (error) {
    console.error('[CallingRoutes] Session end failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end session'
    });
  }
});

// Get voice assistant status
router.get('/status', async (req, res) => {
  try {
    const isConfigured = voiceAgent.isSarvamConfigured();
    const supportedVoices = voiceAgent.getSupportedVoices();
    
    res.json({
      success: true,
      status: 'operational',
      sarvamConfigured: isConfigured,
      capabilities: [
        'Speech-to-Text (Sarvam AI)',
        'Text-to-Speech (Sarvam AI)',
        'Chat Completion (Sarvam AI)',
        'Language Detection',
        'Voice Negotiation'
      ],
      supportedLanguages: Object.keys(SUPPORTED_LANGUAGES).length,
      supportedVoices: Object.keys(supportedVoices).length,
      defaultVoice: DEFAULT_VOICE_CONFIG,
      activeNegotiations: activeNegotiations.size,
      provider: 'Sarvam AI'
    });

  } catch (error) {
    console.error('[CallingRoutes] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status'
    });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    const { language } = req.query;
    
    let voices = SUPPORTED_VOICES;
    
    // Filter by language if specified
    if (language) {
      voices = Object.entries(SUPPORTED_VOICES)
        .filter(([key, voice]) => voice.lang === language)
        .reduce((acc, [key, voice]) => {
          acc[key] = voice;
          return acc;
        }, {});
    }

    // Convert to array format for frontend
    const voicesArray = Object.entries(voices).map(([key, voice]) => ({
      id: key,
      name: voice.name,
      language: voice.lang,
      languageName: SUPPORTED_LANGUAGES[voice.lang]?.name || voice.lang,
      speaker: voice.speaker,
      gender: voice.gender,
      provider: voice.provider || 'Sarvam AI',
      isDefault: key === DEFAULT_VOICE_CONFIG.voiceKey
    }));

    res.json({
      success: true,
      voices: voicesArray,
      totalVoices: voicesArray.length,
      defaultVoice: DEFAULT_VOICE_CONFIG,
      supportedLanguages: SUPPORTED_LANGUAGES,
      filteredByLanguage: !!language
    });

  } catch (error) {
    console.error('[CallingRoutes] Voice listing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get voices'
    });
  }
});

// Get supported languages
router.get('/languages', async (req, res) => {
  try {
    const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => ({
      code,
      name: lang.name,
      nativeName: lang.nativeName,
      voiceCount: Object.values(SUPPORTED_VOICES).filter(voice => voice.lang === code).length
    }));

    res.json({
      success: true,
      languages,
      totalLanguages: languages.length,
      defaultLanguage: DEFAULT_VOICE_CONFIG.languageCode
    });

  } catch (error) {
    console.error('[CallingRoutes] Language listing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get languages'
    });
  }
});

module.exports = router; 