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

    // Language mappings for Sarvam AI API
    this.languageMappings = {
      'en-IN': 'en',
      'hi-IN': 'hi',
      'bn-IN': 'bn',
      'ta-IN': 'ta',
      'te-IN': 'te',
      'ml-IN': 'ml',
      'gu-IN': 'gu',
      'kn-IN': 'kn',
      'or-IN': 'or',
      'pa-IN': 'pa'
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

  // Convert language code to Sarvam API format
  mapLanguageCode(languageCode) {
    return this.languageMappings[languageCode] || 'en';
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
      this.addLog(`Processing STT for ${audioBuffer.length} bytes, language: ${languageCode}`);
      
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: mimeType
      });
      formData.append('model', 'saarika:v2.5');
      
      // Map language code to Sarvam format
      const sarvamLang = this.mapLanguageCode(languageCode);
      if (sarvamLang !== 'en') {
        formData.append('language_code', sarvamLang);
      }

      const response = await axios.post(`${this.baseUrl}/speech-to-text`, formData, {
        headers: {
          'api-subscription-key': this.apiKey,
          ...formData.getHeaders()
        },
        timeout: 30000
      });

      if (response.data && response.data.transcript) {
        this.addLog(`STT successful: "${response.data.transcript}"`);
        return {
          success: true,
          transcript: response.data.transcript,
          confidence: response.data.confidence || 0.9,
          language: languageCode,
          provider: 'Sarvam AI'
        };
      } else {
        throw new Error('No transcript in response');
      }

    } catch (error) {
      this.addLog(`STT failed: ${error.message}`, 'error');
      
      // Fallback mock response
      const mockResponses = {
        'en-IN': "I'd like to discuss the terms of this collaboration.",
        'hi-IN': "मैं इस सहयोग की शर्तों पर चर्चा करना चाहूंगा।",
        'bn-IN': "আমি এই সহযোগিতার শর্তাদি নিয়ে আলোচনা করতে চাই।",
        'ta-IN': "இந்த ஒத்துழைப்பின் நிபந்தனைகளைப் பற்றி விவாதிக்க விரும்புகிறேன்।"
      };
      
      return {
        success: true,
        transcript: mockResponses[languageCode] || mockResponses['en-IN'],
        confidence: 0.85,
        language: languageCode,
        provider: 'Sarvam AI (Fallback)',
        fallback: true
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
      
      // Map language code to Sarvam format
      const sarvamLang = this.mapLanguageCode(voiceConfig.lang);
      
      const requestData = {
        inputs: [text],
        target_language_code: sarvamLang,
        speaker: voiceConfig.speaker,
        model: 'bulbul:v2',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 16000,
        enable_preprocessing: true,
        model_version: "v2"
      };

      const response = await axios.post(`${this.baseUrl}/text-to-speech`, requestData, {
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.audios && response.data.audios[0]) {
        this.addLog(`TTS successful, generated ${response.data.audios[0].length} bytes`);
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
   * Chat Completion using Sarvam AI
   * @param {Array} messages - Array of message objects with role and content
   * @param {string} languageCode - Language code (e.g., 'en-IN', 'hi-IN')
   * @param {Object} context - Context for the conversation
   * @returns {Promise<Object>} Chat completion response
   */
  async chatCompletion(messages, languageCode = 'en-IN', context = null) {
    if (!this.isConfigured) {
      this.addLog('Sarvam AI not configured, returning mock chat response', 'warn');
      
      const mockResponses = {
        'en-IN': "Thank you for your message. I understand you'd like to discuss the campaign terms. Let's work together to find a mutually beneficial agreement.",
        'hi-IN': "आपके संदेश के लिए धन्यवाद। मैं समझता हूं कि आप अभियान की शर्तों पर चर्चा करना चाहते हैं। आइए मिलकर एक पारस्परिक रूप से लाभकारी समझौता खोजें।",
        'bn-IN': "আপনার বার্তার জন্য ধন্যবাদ। আমি বুঝতে পারি যে আপনি ক্যাম্পেইনের শর্তাদি নিয়ে আলোচনা করতে চান। আসুন একসাথে একটি পারস্পরিক উপকারী চুক্তি খুঁজে বের করি।",
        'ta-IN': "உங்கள் செய்திக்கு நன்றி. பிரச்சார விதிமுறைகளைப் பற்றி நீங்கள் விவாதிக்க விரும்புகிறீர்கள் என்பதை நான் புரிந்துகொள்கிறேன். பரஸ்பர நன்மை பயக்கும் ஒப்பந்தத்தைக் கண்டறிய ஒன்றாக வேலை செய்வோம்."
      };
      
      return {
        success: true,
        response: mockResponses[languageCode] || mockResponses['en-IN'],
        provider: 'Sarvam AI (Mock)',
        language: languageCode
      };
    }

    try {
      this.addLog(`Processing chat completion with ${messages.length} messages`);
      
      // Format messages for Sarvam AI
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add context-aware system message based on language
      const systemMessages = {
        'en-IN': "You are a professional AI negotiation assistant helping with influencer marketing campaigns. Be collaborative, understanding, and focused on finding mutually beneficial solutions.",
        'hi-IN': "आप एक पेशेवर AI बातचीत सहायक हैं जो प्रभावशाली मार्केटिंग अभियानों में सहायता करते हैं। सहयोगी, समझदार बनें और पारस्परिक रूप से लाभकारी समाधान खोजने पर ध्यान दें।",
        'bn-IN': "আপনি একজন পেশাদার AI আলোচনা সহায়ক যিনি প্রভাবশালী মার্কেটিং প্রচারাভিযানে সহায়তা করেন। সহযোগিতামূলক, বোধগম্য হন এবং পারস্পরিক উপকারী সমাধান খোঁজার উপর মনোনিবেশ করুন।"
      };

      const systemMessage = systemMessages[languageCode] || systemMessages['en-IN'];
      
      const requestData = {
        model: 'sarvam-m',
        messages: [
          { role: 'system', content: systemMessage },
          ...conversationHistory
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9
      };

      const response = await axios.post(`${this.baseUrl}/chat/completions`, requestData, {
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        this.addLog(`Chat completion successful`);
        
        return {
          success: true,
          response: aiResponse,
          provider: 'Sarvam AI',
          language: languageCode,
          usage: response.data.usage
        };
      } else {
        throw new Error('No response received from Sarvam AI chat completion');
      }

    } catch (error) {
      this.addLog(`Chat completion failed: ${error.message}`, 'error');
      
      // Fallback responses in different languages
      const fallbackResponses = {
        'en-IN': "I appreciate your input on this campaign. Let's discuss how we can create a successful partnership that works for everyone involved.",
        'hi-IN': "इस अभियान पर आपके इनपुट की मैं सराहना करता हूं। आइए चर्चा करें कि हम एक सफल साझेदारी कैसे बना सकते हैं जो सभी शामिल लोगों के लिए काम करे।",
        'bn-IN': "এই প্রচারণায় আপনার ইনপুটের জন্য আমি কৃতজ্ঞ। আসুন আলোচনা করি যে আমরা কীভাবে একটি সফল অংশীদারিত্ব তৈরি করতে পারি যা জড়িত সবার জন্য কাজ করে।",
        'ta-IN': "இந்த பிரச்சாரத்தில் உங்கள் உள்ளீட்டை நான் பாராட்டுகிறேன். சம்பந்தப்பட்ட அனைவருக்கும் பயனுள்ள ஒரு வெற்றிகரமான கூட்டாண்மையை எவ்வாறு உருவாக்குவது என்பதைப் பற்றி விவாதிக்கலாம்."
      };
      
      return {
        success: true,
        response: fallbackResponses[languageCode] || fallbackResponses['en-IN'],
        provider: 'Sarvam AI (Fallback)',
        language: languageCode,
        fallback: true
      };
    }
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