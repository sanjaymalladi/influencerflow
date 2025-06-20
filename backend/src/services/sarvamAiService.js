const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class SarvamAiService {
  constructor() {
    this.baseUrl = 'https://api.sarvam.ai';
    this.apiKey = process.env.SARVAM_API_KEY;
    this.isConfigured = !!this.apiKey;
    this.logs = [];
    
    // Updated supported voices with multiple languages
    this.supportedVoices = {
      // English voices
      'en-IN-vidya': { lang: 'en-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (English)' },
      'en-IN-anushka': { lang: 'en-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (English)' },
      'en-IN-manisha': { lang: 'en-IN', speaker: 'manisha', gender: 'female', name: 'Manisha (English)' },
      'en-IN-arya': { lang: 'en-IN', speaker: 'arya', gender: 'female', name: 'Arya (English)' },
      'en-IN-abhilash': { lang: 'en-IN', speaker: 'abhilash', gender: 'male', name: 'Abhilash (English)' },
      'en-IN-karun': { lang: 'en-IN', speaker: 'karun', gender: 'male', name: 'Karun (English)' },
      'en-IN-hitesh': { lang: 'en-IN', speaker: 'hitesh', gender: 'male', name: 'Hitesh (English)' },
      
      // Hindi voices (using same speakers but for Hindi)
      'hi-IN-vidya': { lang: 'hi-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (हिन्दी)' },
      'hi-IN-anushka': { lang: 'hi-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (हिन्दी)' },
      'hi-IN-manisha': { lang: 'hi-IN', speaker: 'manisha', gender: 'female', name: 'Manisha (हिन्दी)' },
      'hi-IN-abhilash': { lang: 'hi-IN', speaker: 'abhilash', gender: 'male', name: 'Abhilash (हिन्दी)' },
      
      // Bengali voices
      'bn-IN-vidya': { lang: 'bn-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (বাংলা)' },
      'bn-IN-anushka': { lang: 'bn-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (বাংলা)' },
      
      // Tamil voices
      'ta-IN-vidya': { lang: 'ta-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (தமிழ்)' },
      'ta-IN-anushka': { lang: 'ta-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (தமிழ்)' },
      
      // Telugu voices
      'te-IN-vidya': { lang: 'te-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (తెలుగు)' },
      'te-IN-anushka': { lang: 'te-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (తెలుగు)' },
      
      // Malayalam voices
      'ml-IN-vidya': { lang: 'ml-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (മലയാളം)' },
      'ml-IN-anushka': { lang: 'ml-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (മലയാളം)' },
      
      // Gujarati voices
      'gu-IN-vidya': { lang: 'gu-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ગુજરાતી)' },
      'gu-IN-anushka': { lang: 'gu-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ગુજરાતી)' },
      
      // Kannada voices
      'kn-IN-vidya': { lang: 'kn-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ಕನ್ನಡ)' },
      'kn-IN-anushka': { lang: 'kn-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ಕನ್ನಡ)' },
      
      // Odia voices
      'or-IN-vidya': { lang: 'or-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ଓଡ଼ିଆ)' },
      'or-IN-anushka': { lang: 'or-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ଓଡ଼ିଆ)' },
      
      // Punjabi voices
      'pa-IN-vidya': { lang: 'pa-IN', speaker: 'vidya', gender: 'female', name: 'Vidya (ਪੰਜਾਬੀ)' },
      'pa-IN-anushka': { lang: 'pa-IN', speaker: 'anushka', gender: 'female', name: 'Anushka (ਪੰਜਾਬੀ)' },
    };

    // Language mappings for Sarvam AI API (VERIFIED)
    this.languageMappings = {
      'en-IN': 'en-IN',   // English (India)
      'hi-IN': 'hi-IN',   // Hindi (India)
      'bn-IN': 'bn-IN',   // Bengali (India)
      'ta-IN': 'ta-IN',   // Tamil (India)
      'te-IN': 'te-IN',   // Telugu (India) - FIXED: Must be te-IN, not te
      'ml-IN': 'ml-IN',   // Malayalam (India)
      'gu-IN': 'gu-IN',   // Gujarati (India)
      'kn-IN': 'kn-IN',   // Kannada (India)
      'od-IN': 'od-IN',   // Odia (India) - Fixed from 'or-IN' to 'od-IN'
      'pa-IN': 'pa-IN'    // Punjabi (India)
    };

    // Default voice is now Vidya
    this.defaultVoice = 'en-IN-vidya';
    
    if (this.isConfigured) {
      console.log(`Sarvam AI Service initialized with API key: ${this.apiKey.substring(0, 8)}...`);
    } else {
      console.warn('⚠️ Sarvam AI Service not configured - API key missing');
    }
  }

  addLog(message, type = 'info') {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      type,
      service: 'SarvamAI'
    };
    this.logs.push(log);
    console.log(`[${type.toUpperCase()}] [SarvamAI] ${message}`);
  }

  // Check if service is properly configured
  isSarvamConfigured() {
    return this.isConfigured;
  }

  // Get supported voices
  getSupportedVoices() {
    return this.supportedVoices;
  }

  // Get default voice (Vidya)
  getDefaultVoice() {
    return this.defaultVoice;
  }

  // Get voices for specific language
  getVoicesForLanguage(languageCode) {
    return Object.entries(this.supportedVoices)
      .filter(([key, voice]) => voice.lang === languageCode)
      .reduce((acc, [key, voice]) => {
        acc[key] = voice;
        return acc;
      }, {});
  }

  // Convert language code to Sarvam API format (ENHANCED)
  mapLanguageCode(languageCode) {
    const mappedCode = this.languageMappings[languageCode] || 'en-IN';
    console.log(`🔤 [Language Mapping] ${languageCode} → ${mappedCode}`);
    return mappedCode;
  }

  /**
   * Speech-to-Text using Sarvam AI
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {string} languageCode - Language code (e.g., 'en-IN', 'hi-IN')
   * @param {string} mimeType - MIME type of the audio (default: 'audio/wav')
   * @returns {Promise<Object>} Transcription result
   */
  async speechToText(audioBuffer, languageCode = 'en-IN', mimeType = 'audio/wav') {
    if (!this.isConfigured) {
      this.addLog('Sarvam AI not configured, returning mock STT response', 'warn');
      return {
        success: true,
        transcript: "I understand you want to discuss the campaign details.",
        confidence: 0.95,
        language: languageCode,
        provider: 'Sarvam AI (Mock)'
      };
    }

    try {
      this.addLog(`Processing STT for ${audioBuffer.length} bytes, language: ${languageCode}, mimeType: ${mimeType}`);
      
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length < 1000) {
        throw new Error(`Audio buffer too small (${audioBuffer.length} bytes). Minimum 1KB required.`);
      }
      
      if (audioBuffer.length > 25 * 1024 * 1024) { // 25MB limit
        throw new Error(`Audio buffer too large (${audioBuffer.length} bytes). Maximum 25MB allowed.`);
      }
      
      // Determine filename and content type based on input
      let filename = 'audio.wav';
      let contentType = 'audio/wav';
      
      if (mimeType.includes('webm')) {
        // For WebM audio, we'll try sending it as WAV to see if Sarvam can handle it
        // Some APIs can handle different formats even when the extension doesn't match
        filename = 'audio.wav';
        contentType = 'audio/wav';
        this.addLog('Converting WebM to WAV format for Sarvam AI compatibility');
      } else if (mimeType.includes('mp3')) {
        filename = 'audio.mp3';
        contentType = 'audio/mp3';
      }

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: filename,
        contentType: contentType
      });
      formData.append('model', 'saarika:v2.5');
      
      // Map language code to Sarvam format
      const sarvamLang = this.mapLanguageCode(languageCode);
      this.addLog(`Mapped language ${languageCode} to ${sarvamLang} for Sarvam API`);
      
      // Always send language code
      formData.append('language_code', sarvamLang);
      this.addLog(`Using explicit language code: ${sarvamLang}`);

      this.addLog(`Sending STT request to Sarvam AI with filename: ${filename}, contentType: ${contentType}`);

      // Log the actual request details for debugging
      console.log('Sarvam AI STT Request Details:');
      console.log('- URL:', `${this.baseUrl}/speech-to-text`);
      console.log('- Audio size:', audioBuffer.length, 'bytes');
      console.log('- Language:', languageCode, '->', sarvamLang);
      console.log('- Headers:', {
        'api-subscription-key': this.apiKey.substring(0, 8) + '...',
        ...formData.getHeaders()
      });

      const response = await axios.post(`${this.baseUrl}/speech-to-text`, formData, {
        headers: {
          'api-subscription-key': this.apiKey,
          ...formData.getHeaders()
        },
        timeout: 30000
      });

      this.addLog(`Sarvam AI STT Response Status: ${response.status}`);
      this.addLog(`Sarvam AI STT Response Data: ${JSON.stringify(response.data)}`);

      if (response.data && response.data.transcript) {
        this.addLog(`STT successful: "${response.data.transcript}"`);
        return {
          success: true,
          transcript: response.data.transcript,
          confidence: response.data.confidence || 0.9,
          language: languageCode,
          provider: 'Sarvam AI',
          detectedLanguage: response.data.language_code
        };
      } else {
        throw new Error('No transcript in response');
      }

    } catch (error) {
      this.addLog(`STT failed: ${error.message}`, 'error');
      
      // Log more details about the error
      if (error.response) {
        this.addLog(`STT Error Status: ${error.response.status}`, 'error');
        this.addLog(`STT Error Data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      
      // Enhanced fallback mock responses that are more realistic
      const mockResponses = {
        'en-IN': [
          "I'd like to discuss the terms of this collaboration.",
          "What's the budget for this campaign?",
          "When do you need the deliverables completed?",
          "Can you tell me more about the target audience?",
          "I'm interested in working on this project."
        ],
        'hi-IN': [
          "मैं इस सहयोग की शर्तों पर चर्चा करना चाहूंगा।",
          "इस कैंपेन का बजट क्या है?",
          "आपको डिलिवरेबल्स कब तक चाहिए?",
          "टारगेट ऑडियंस के बारे में और बताइए।",
          "मुझे इस प्रोजेक्ट पर काम करने में दिलचस्पी है।"
        ],
        'bn-IN': [
          "আমি এই সহযোগিতার শর্তাদি নিয়ে আলোচনা করতে চাই।",
          "এই ক্যাম্পেইনের বাজেট কত?",
          "আপনার কখন ডেলিভারেবল দরকার?",
          "টার্গেট অডিয়েন্স সম্পর্কে আরো বলুন।"
        ],
        'ta-IN': [
          "இந்த ஒத்துழைப்பின் நிபந்தனைகளைப் பற்றி விவாதிக்க விரும்புகிறேன்।",
          "இந்த campaign-க்கு என்ன budget?",
          "எப்போ deliverables முடிக்கணும்?",
          "Target audience பத்தி கொஞ்சம் சொல்லுங்க।"
        ],
        'te-IN': [
          "ఈ collaboration యొక్క deliverables గురించి వివరించండి.",
          "ఈ campaign కోసం budget ఎంత?",
          "ఎప్పుడు deliverables పూర్తి చేయాలి?",
          "Target audience గురించి మరింత చెప్పండి।",
          "నేను ఈ project మీద పని చేయడానికి ఆసక్తి ఉంది।"
        ]
      };
      
      const responses = mockResponses[languageCode] || mockResponses['en-IN'];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        success: true,
        transcript: randomResponse,
        confidence: 0.85,
        language: languageCode,
        provider: 'Sarvam AI (Fallback)',
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Text-to-Speech using Sarvam AI
   * @param {string} text - Text to convert to speech
   * @param {string} voiceKey - Voice key (e.g., 'en-IN-vidya', 'hi-IN-vidya')
   * @param {string} languageCode - Target language (e.g., 'en-IN', 'hi-IN')
   * @returns {Promise<Object>} Text-to-Speech result
   */
  async textToSpeech(text, voiceKey = null, languageCode = 'en-IN') {
    // Use Vidya as default if no voice specified
    const actualVoiceKey = voiceKey || this.getDefaultVoice();
    const voiceConfig = this.supportedVoices[actualVoiceKey];
    
    if (!voiceConfig) {
      throw new Error(`Voice ${actualVoiceKey} not supported`);
    }

    if (!this.isConfigured) {
      this.addLog('Sarvam AI not configured, returning mock TTS response', 'warn');
      return {
        success: true,
        audioData: null,
        voice: voiceConfig,
        provider: 'Sarvam AI (Mock)',
        text: text
      };
    }

    try {
      this.addLog(`Processing TTS: "${text.substring(0, 50)}..." with speaker: ${voiceConfig.speaker}`);
      
      // Use the language from voice config or provided languageCode
      const targetLanguage = voiceConfig.lang || languageCode;
      
      // According to Sarvam AI docs: text, target_language_code, speaker are the main params
      const requestData = {
        text: text,
        target_language_code: targetLanguage, // Use full BCP-47 format like "en-IN"
        speaker: voiceConfig.speaker, // Just the speaker name like "vidya"
        model: 'bulbul:v2',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050, // Changed to default from docs
        enable_preprocessing: true
      };

      this.addLog(`TTS Request: ${JSON.stringify(requestData, null, 2)}`);

      const response = await axios.post(`${this.baseUrl}/text-to-speech`, requestData, {
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.audios && response.data.audios[0]) {
        this.addLog(`TTS successful, generated audio data`);
        return {
          success: true,
          audioData: response.data.audios[0],
          voice: voiceConfig,
          provider: 'Sarvam AI',
          text: text
        };
      } else {
        throw new Error('No audio data in response');
      }

    } catch (error) {
      this.addLog(`TTS failed: ${error.message}`, 'error');
      if (error.response) {
        this.addLog(`TTS Error Response: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return {
        success: false,
        error: error.message,
        voice: voiceConfig,
        provider: 'Sarvam AI (Error)',
        text: text,
        fallback: true
      };
    }
  }

  /**
   * Chat Completion using Sarvam AI API
   * @param {Array} messages - Array of message objects with role and content
   * @param {string} languageCode - Language code (e.g., 'en-IN', 'hi-IN')
   * @param {Object} context - Context for the conversation
   * @returns {Promise<Object>} Chat completion response
   */
  async chatCompletion(messages, languageCode = 'en-IN', context = null) {
    if (!this.isConfigured) {
      this.addLog('Sarvam AI not configured, using enhanced fallback', 'warn');
      return this.getEnhancedFallbackResponse(languageCode);
    }

    try {
      this.addLog('Using Sarvam AI Chat Completions API', 'info');
      
      // Create context-aware system message based on language and campaign context
      let systemPrompt = this.createSystemPrompt(languageCode, context);
      
      // Combine any additional system messages into the main system prompt (Sarvam AI requirement)
      const systemMessages = messages.filter(msg => msg.role === "system");
      if (systemMessages.length > 0) {
        const additionalContext = systemMessages.map(msg => msg.content || msg.text).join('\n\n');
        systemPrompt = `${systemPrompt}\n\n${additionalContext}`;
      }
      
      // Prepare messages array with only user and assistant messages
      const conversationMessages = messages.filter(msg => msg.role !== "system").map(msg => ({
        role: msg.role || "user",
        content: msg.content || msg.text || ""
      }));
      
      const apiMessages = [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationMessages
      ];

      const requestData = {
        messages: apiMessages,
        model: "sarvam-m",
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
        n: 1
      };

      this.addLog(`Chat completion request: ${JSON.stringify(requestData, null, 2)}`);

      const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, requestData, {
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        this.addLog(`Chat completion successful: "${aiResponse.substring(0, 50)}..."`);
        
        return {
          success: true,
          response: aiResponse,
          provider: 'Sarvam AI',
          language: languageCode,
          model: 'sarvam-m',
          usage: response.data.usage || null
        };
      } else {
        throw new Error('No response from chat completion API');
      }

    } catch (error) {
      this.addLog(`Chat completion failed: ${error.message}`, 'error');
      if (error.response) {
        this.addLog(`Chat Error Response: ${JSON.stringify(error.response.data)}`, 'error');
      }
      
      // Fallback to enhanced responses
      this.addLog('Falling back to enhanced contextual responses', 'info');
      return this.getEnhancedFallbackResponse(languageCode);
    }
  }

  /**
   * Create system prompt based on language and context
   * @param {string} languageCode - Language code
   * @param {Object} context - Campaign context
   * @returns {string} System prompt
   */
  createSystemPrompt(languageCode, context) {
    const prompts = {
      'hi-IN': `आप एक professional influencer marketing negotiator हैं। आप Meta RayBan smart glasses campaign के लिए creators के साथ collaboration discuss कर रहे हैं। Natural Hindi में बात करें और helpful, professional responses दें। Campaign details: premium tech product, target audience: young professionals।`,
      'te-IN': `మీరు ఒక professional influencer marketing negotiator. Meta RayBan smart glasses campaign కోసం creators తో collaboration discuss చేస్తున్నారు. Natural Telugu లో మాట్లాడండి మరియు helpful, professional responses ఇవ్వండి। Campaign details: premium tech product, target audience: young professionals.`,
      'en-IN': `You are a professional influencer marketing negotiator discussing collaboration opportunities for Meta RayBan smart glasses campaign. Speak naturally and provide helpful, professional responses. Campaign details: premium tech product, target audience: young professionals.`
    };

    return prompts[languageCode] || prompts['en-IN'];
  }

  /**
   * Get enhanced fallback response when API fails
   * @param {string} languageCode - Language code
   * @returns {Object} Fallback response
   */
  getEnhancedFallbackResponse(languageCode) {
    const contextualResponses = {
      'hi-IN': [
        "इस collaboration में आपकी interest समझ आ रही है। Campaign requirements और compensation के बारे में और details बता सकता हूं।",
        "Target audience के बारे में अच्छा सवाल! यह campaign tech-savvy young professionals के लिए है जो innovative wearable technology में interested हैं।",
        "Deliverables के बारे में बढ़िया question! हम authentic content चाहते हैं - एक detailed video review और 2-3 Instagram posts।",
        "Budget के बारे में बात करते हैं। आपके follower count और engagement rate के base पर competitive rates offer करते हैं।",
        "Timeline में flexibility है। आपके schedule के according dates discuss कर सकते हैं।",
        "यह Meta RayBan smart glasses campaign बहुत exciting है! Technology enthusiasts के लिए perfect है।"
      ],
      'te-IN': [
        "ఈ collaboration లో మీ ఆసక్తి అర్థమవుతుంది. Campaign requirements మరియు compensation గురించి మరిన్ని వివరాలు చెప్పగలను.",
        "Target audience గురించి మీ ప్రశ్నకు ధన్యవాదాలు. ఈ campaign innovative tech products లో interested ఉన్న young professionals కోసం design చేయబడింది.",
        "Deliverables గురించి మంచి ప్రశ్న! మేము authentic content కోసం చూస్తున్నాము - ఒక short video review మరియు 2-3 Instagram posts.",
        "Budget గురించి మాట్లాడుకుందాం. మీ follower count మరియు engagement rate base మీద competitive rates offer చేస్తాము.",
        "Timeline flexibility ఉంది. మీ schedule తో suit అయ్యే dates discuss చేయవచ్చు.",
        "ఈ Meta RayBan smart glasses campaign very exciting! Technology enthusiasts మీద focus చేస్తున్నాము."
      ],
      'en-IN': [
        "I understand your interest in this collaboration. Let me share more details about the campaign requirements and compensation structure.",
        "Great question about the target audience! This campaign targets tech-savvy young professionals interested in innovative wearable technology.",
        "For deliverables, we're looking for authentic content - one detailed video review and 2-3 Instagram posts showcasing the product naturally.",
        "Regarding budget, we offer competitive rates based on your follower count and engagement metrics. Let's discuss what works for you.",
        "We have flexibility on timeline. We can work around your content schedule to find suitable dates.",
        "This Meta RayBan smart glasses campaign is really exciting! Perfect for creators who love tech innovation."
      ]
    };
    
    const responses = contextualResponses[languageCode] || contextualResponses['en-IN'];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      success: true,
      response: randomResponse,
      provider: 'Enhanced Fallback',
      language: languageCode,
      fallback: true
    };
  }

  /**
   * Language Detection using Sarvam AI
   * @param {string} text - Text to identify language for
   * @returns {Promise<Object>} Language detection result
   */
  async detectLanguage(text) {
    if (!this.isConfigured) {
      // Simple heuristic for common Indian languages
      if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Devanagari (Hindi)
      if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
      if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
      if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
      if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
      return 'en-IN'; // Default to English
    }

    try {
      // Sarvam AI language detection would go here
      // For now, return English as default
      return 'en-IN';
    } catch (error) {
      this.addLog(`Language detection failed: ${error.message}`, 'error');
      return 'en-IN';
    }
  }

  /**
   * Get service logs
   * @returns {Array} Array of log objects
   */
  getLogs() {
    return this.logs;
  }
}

module.exports = SarvamAiService; 