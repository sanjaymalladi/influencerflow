import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageCircle, 
  X, 
  Minimize2, 
  Phone,
  PhoneCall,
  User,
  Bot,
  Languages,
  Settings,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioConverter } from '@/utils/audioConverter';

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  audioUrl?: string;
  language?: string;
}

// Enhanced language support with complete Vidya voice coverage
const SUPPORTED_LANGUAGES = {
  'en-IN': { name: 'English', nativeName: 'English', code: 'en-IN' },
  'hi-IN': { name: 'Hindi', nativeName: 'हिन्दी', code: 'hi-IN' },
  'bn-IN': { name: 'Bengali', nativeName: 'বাংলা', code: 'bn-IN' },
  'ta-IN': { name: 'Tamil', nativeName: 'தமிழ்', code: 'ta-IN' },
  'te-IN': { name: 'Telugu', nativeName: 'తెలుగు', code: 'te-IN' },
  'ml-IN': { name: 'Malayalam', nativeName: 'മലയാളം', code: 'ml-IN' },
  'gu-IN': { name: 'Gujarati', nativeName: 'ગુજરાતી', code: 'gu-IN' },
  'kn-IN': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', code: 'kn-IN' },
  'or-IN': { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', code: 'or-IN' },
  'pa-IN': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', code: 'pa-IN' }
};

// Fixed to only use Vidya speaker across all languages
const getVoiceForLanguage = (languageCode: string) => {
  return `${languageCode}-vidya`;
};

interface VoiceAssistantProps {
  creatorName?: string;
  campaignTitle?: string;
  negotiationContext?: {
    budget: number;
    deliverables: string[];
    timeline: string;
  };
  // Enhanced campaign context for better negotiations
  campaignData?: {
    campaignId?: string;
    briefSummary?: string;
    targetAudience?: string;
    keyTalkingPoints?: string[];
    budget?: number;
    timeline?: string;
  };
  selectedCreators?: Array<{
    id: string;
    name: string;
    platform: string;
    followers: number;
    engagement: string;
    pricing?: number;
    email?: string;
  }>;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  creatorName = "Creator",
  campaignTitle = "Campaign",
  negotiationContext,
  campaignData,
  selectedCreators = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [negotiationId, setNegotiationId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [optimizedMode, setOptimizedMode] = useState(true);
  
  // Silence detection state
  const [silenceDetection, setSilenceDetection] = useState(true);
  const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgResponseTime: 0,
    totalRequests: 0,
    successRate: 100,
    lastResponseTime: 0
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceThreshold = 30; // Lower threshold for silence detection
  const maxSilenceDuration = 2000; // 2 seconds of silence before auto-processing
  
  const { toast } = useToast();

  // API configuration
  const isDevelopment = import.meta.env.DEV;
  const API_BASE_URL = isDevelopment ? '/api' : 'https://influencerflow.onrender.com/api';

  // Enhanced welcome messages for all languages
  const getWelcomeMessage = useCallback((language: string, campaignTitle: string, creatorName: string, isCallingMode = false) => {
    if (isCallingMode) {
      // Calling mode messages - casual and conversational like a real phone call
      const callingMessages = {
        'en-IN': `Hello ${creatorName}! This is Vidya calling about the ${campaignTitle} campaign. Do you have 2 minutes to discuss a collaboration opportunity?`,
        'hi-IN': `नमस्ते ${creatorName}! मैं विद्या बोल रही हूं ${campaignTitle} कैंपेन के बारे में। क्या आपके पास 2 मिनट का समय है collaboration के बारे में बात करने के लिए?`,
        'bn-IN': `নমস্কার ${creatorName}! আমি বিদ্যা বলছি ${campaignTitle} ক্যাম্পেইনের ব্যাপারে। ২ মিনিট সময় আছে কোলাবরেশন নিয়ে কথা বলার জন্য?`,
        'ta-IN': `வணக்கம் ${creatorName}! நான் வித்யா, ${campaignTitle} campaign பத்தி பேசறதுக்கு கூப்பிட்டேன். 2 நிமிஷம் இருக்கா collaboration discuss பண்ணலாமா?`,
        'te-IN': `నమస్కారం ${creatorName}! నేను విద్య మాట్లాడుతున్నాను ${campaignTitle} campaign గురించి। 2 నిమిషాలు సమయం ఉందా collaboration గురించి మాట్లాడుకోవడానికి?`,
        'ml-IN': `ഹലോ ${creatorName}! ഞാൻ വിദ്യ സംസാരിക്കുന്നു ${campaignTitle} campaign നെ കുറിച്ച്. 2 മിനിറ്റ് സമയം ഉണ്ടോ collaboration നെ കുറിച്ച് സംസാരിക്കാൻ?`,
        'gu-IN': `નમસ્તે ${creatorName}! હું વિદ્યા બોલું છું ${campaignTitle} campaign વિશે। ૨ મિનિટ સમય છે collaboration વિશે વાત કરવા માટે?`,
        'kn-IN': `ನಮಸ್ತೆ ${creatorName}! ನಾನು ವಿದ್ಯಾ ಮಾತಾಡುತ್ತಿದ್ದೇನೆ ${campaignTitle} campaign ಬಗ್ಗೆ। 2 ನಿಮಿಷ ಸಮಯ ಇದೆಯಾ collaboration ಬಗ್ಗೆ ಮಾತನಾಡಲು?`,
        'or-IN': `ନମସ୍କାର ${creatorName}! ମୁଁ ବିଦ୍ୟା କହୁଛି ${campaignTitle} campaign ବିଷୟରେ। ୨ ମିନିଟ୍ ସମୟ ଅଛି କି collaboration ବିଷୟରେ କଥା ହେବାକୁ?`,
        'pa-IN': `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${creatorName}! ਮੈਂ ਵਿਦਿਆ ਬੋਲ ਰਹੀ ਹਾਂ ${campaignTitle} campaign ਬਾਰੇ। ਕੀ ਤੁਹਾਡੇ ਕੋਲ 2 ਮਿੰਟ ਦਾ ਸਮਾਂ ਹੈ collaboration ਬਾਰੇ ਗੱਲ ਕਰਨ ਲਈ?`
      };
      return callingMessages[language as keyof typeof callingMessages] || callingMessages['en-IN'];
    } else {
      // Regular welcome messages (for non-calling mode)
      const welcomeMessages = {
        'en-IN': `Hello! I'm Vidya, your AI negotiation assistant powered by Sarvam AI. I'm here to help you negotiate the ${campaignTitle} campaign with ${creatorName}. I have access to campaign details, creator analytics, and market rates to ensure the best deal. How can I assist you today?`,
        'hi-IN': `नमस्ते! मैं विद्या हूं, Sarvam AI द्वारा संचालित आपकी AI वार्ता सहायक। मैं ${creatorName} के साथ ${campaignTitle} अभियान की बातचीत में आपकी सहायता करने के लिए यहां हूं। मेरे पास अभियान विवरण, निर्माता विश्लेषण और बाजार दरों तक पहुंच है ताकि सबसे अच्छा सौदा सुनिश्चित हो सके। आज मैं आपकी कैसे सहायता कर सकती हूं?`,
        'bn-IN': `হ্যালো! আমি বিদ্যা, Sarvam AI দ্বারা চালিত আপনার AI আলোচনা সহায়ক। আমি ${creatorName} এর সাথে ${campaignTitle} প্রচারাভিযানের আলোচনায় আপনাকে সাহায্য করতে এখানে আছি। সেরা চুক্তি নিশ্চিত করতে আমার প্রচারাভিযানের বিবরণ, নির্মাতা বিশ্লেষণ এবং বাজার হারের অ্যাক্সেস রয়েছে। আজ আমি কীভাবে আপনাকে সহায় করতে পারি?`,
        'ta-IN': `வணக்கம்! நான் வித்யா, Sarvam AI ஆல் இயக்கப்படும் உங்கள் AI பேச்சுவார்த்தை உதவியாளர். ${creatorName} உடன் ${campaignTitle} பிரச்சாரத்தை பேச்சுவார்த்தை நடத்த உதவ நான் இங்கே இருக்கிறேன். சிறந்த ஒப்பந்தம் கிடைக்க பிரச்சார விவரங்கள், படைப்பாளர் பகுப்பாய்வு மற்றும் சந்தை விலைகளுக்கான அணுகல் என்னிடம் உள்ளது। இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?`,
        'te-IN': `నమస్కారం! నేను విద్య, Sarvam AI చే శక్తివంతం చేయబడిన మీ AI చర్చల సహాయకురాలిని। ${creatorName} తో ${campaignTitle} ప్రచారం చర్చలలో మీకు సహాయం చేయడానికి నేను ఇక్కడ ఉన్నాను। ఉత్తమ ఒప్పందం అందించడానికి ప్రచార వివరాలు, సృష్టికర్త విశ్లేషణలు మరియు మార్కెట్ రేట్లకు నా దగ్గర ప్రవేశనముంటు। ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?`,
        'ml-IN': `ഹലോ! ഞാൻ വിദ്യ, നിങ്ങളുടെ AI ചർച്ചാ സഹായിയാണ്। ${creatorName} നോടൊപ്പം ${campaignTitle} കാമ്പെയ്‌നിന്റെ പേരിൽ സഹകരണ അവസരത്തെക്കുറിച്ച് ചർച്ച ചെയ്യാൻ സഹായിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്। മികച്ച ഇടപാട് ഉറപ്പാക്കാൻ കാമ്പെയ്‌ൻ വിവരങ്ങളുമുണ്ട്, ഈ പങ്കാളിത്തത്തിനായി മികച്ച നിബന്ധനകൾ ചർച്ച ചെയ്യാൻ കഴിയും. നമുക്ക് ചർച്ച ആരംഭിക്കാമോ?`,
        'gu-IN': `નમસ્તે ${creatorName}! હું વિદ્યા બોલું છું ${campaignTitle} campaign વિશે। ૨ મિનિટ સમય છે collaboration વિશે વાત કરવા માટે?`,
        'kn-IN': `ನಮಸ್ತೆ ${creatorName}! ನಾನು ವಿದ್ಯಾ ಮಾತಾಡುತ್ತಿದ್ದೇನೆ ${campaignTitle} campaign ಬಗ್ಗೆ। 2 ನಿಮಿಷ ಸಮಯ ಇದೆಯಾ collaboration ಬಗ್ಗೆ ಮಾತನಾಡಲು?`,
        'or-IN': `ନମସ୍କାର ${creatorName}! ମୁଁ ବିଦ୍ୟା କହୁଛି ${campaignTitle} campaign ବିଷୟରେ। ୨ ମିନିଟ୍ ସମୟ ଅଛି କି collaboration ବିଷୟରେ କଥା ହେବାକୁ?`,
        'pa-IN': `ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${creatorName}! ਮੈਂ ਵਿਦਿਆ ਬੋਲ ਰਹੀ ਹਾਂ ${campaignTitle} campaign ਬਾਰੇ। ਕੀ ਤੁਹਾਡੇ ਕੋਲ 2 ਮਿੰਟ ਦਾ ਸਮਾਂ ਹੈ collaboration ਬਾਰੇ ਗੱਲ ਕਰਨ ਲਈ?`
      };
      return welcomeMessages[language as keyof typeof welcomeMessages] || welcomeMessages['en-IN'];
    }
  }, []);

  // Enhanced audio context initialization with optimizations
  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      try {
        // Create AudioContext without forcing sample rate - let browser choose
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive'
        });
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        console.log('AudioContext initialized with sample rate:', audioContextRef.current.sampleRate);
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        toast({
          title: 'Audio Initialization Failed',
          description: 'Could not initialize audio system. Voice features may not work properly.',
          variant: 'destructive',
        });
      }
    }
  };

  // Silence detection using audio analysis with better error handling
  const setupSilenceDetection = useCallback((stream: MediaStream) => {
    if (!audioContextRef.current || !silenceDetection) return;

    try {
      // Check if AudioContext is in the right state
      if (audioContextRef.current.state !== 'running') {
        console.log('AudioContext not running, skipping silence detection');
        return;
      }

      // Create a new AudioContext specifically for this stream if needed
      let audioContext = audioContextRef.current;
      
      // Get the stream's sample rate
      const track = stream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log('Stream settings:', settings);
        
        // If sample rates don't match, create a compatible context
        if (settings.sampleRate && settings.sampleRate !== audioContext.sampleRate) {
          console.log(`Sample rate mismatch: Context=${audioContext.sampleRate}, Stream=${settings.sampleRate}`);
          // For now, skip silence detection to avoid the error
          console.log('Skipping silence detection due to sample rate mismatch');
          return;
        }
      }

      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      source.connect(analyserRef.current);
      
      const checkSilence = () => {
        if (!analyserRef.current || !dataArrayRef.current || !isRecording) return;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate average volume
        const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
        
        if (average < silenceThreshold && isRecording) {
          if (!silenceTimeout) {
            const timeout = setTimeout(() => {
              if (isRecording) {
                console.log('Auto-stopping due to silence detection');
                stopRecording();
              }
            }, maxSilenceDuration);
            setSilenceTimeout(timeout);
          }
        } else {
          // Clear silence timeout if audio detected
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            setSilenceTimeout(null);
          }
        }
        
        if (isRecording) {
          requestAnimationFrame(checkSilence);
        }
      };
      
      checkSilence();
    } catch (error) {
      console.error('Failed to setup silence detection:', error);
      // Don't show user error, just log it and continue without silence detection
    }
  }, [silenceDetection, isRecording, silenceTimeout]);

  // Enhanced negotiation initialization with campaign context
  const initializeNegotiation = async () => {
    try {
      await initializeAudioContext();
      
      setConnectionStatus('connecting');
      
      // Build enhanced context for better negotiations
      const enhancedContext = {
        creatorName,
        campaignTitle,
        negotiationContext,
        campaignData,
        selectedCreators,
        strategy: 'collaborative',
        mode: 'voice_chat',
        voiceKey: getVoiceForLanguage(selectedLanguage),
        languageCode: selectedLanguage,
        optimizedMode,
        silenceDetection,
        // Enhanced campaign context
        campaignContext: {
          budget: campaignData?.budget || negotiationContext?.budget || 2075000,
          timeline: campaignData?.timeline || negotiationContext?.timeline || '2 weeks',
          deliverables: negotiationContext?.deliverables || ['Instagram Posts', 'Stories'],
          keyTalkingPoints: campaignData?.keyTalkingPoints || [],
          targetAudience: campaignData?.targetAudience || '',
          briefSummary: campaignData?.briefSummary || campaignTitle,
          creatorMetrics: selectedCreators.length > 0 ? selectedCreators[0] : null
        }
      };

      const response = await fetch(`${API_BASE_URL}/calling/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedContext),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize negotiation');
      }

      const data = await response.json();
      setNegotiationId(data.negotiationId);
      setConnectionStatus('connected');
      
      // Add contextual welcome message
      const welcomeMessage: VoiceMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        text: getWelcomeMessage(selectedLanguage, campaignTitle, creatorName, true),
        timestamp: new Date(),
        language: selectedLanguage
      };
      setMessages([welcomeMessage]);
      
      // Speak the welcome message
      await speakText(welcomeMessage.text);
      
      toast({
        title: 'Vidya Assistant Ready',
        description: `Connected in ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].nativeName} with optimized performance.`,
      });
    } catch (error) {
      console.error('Failed to initialize negotiation:', error);
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to voice assistant. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Optimized recording with enhanced audio settings
  const startRecording = async () => {
    try {
      await initializeAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
          // Removed sampleRate constraint to let browser choose compatible rate
        } 
      });
      
      streamRef.current = stream;
      
      // Use optimal recording configuration for Sarvam AI compatibility
      const options = AudioConverter.getOptimalRecordingConfig();
      
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const originalMimeType = options.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: originalMimeType });
        await processAudioInput(audioBlob, originalMimeType);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Setup silence detection
      if (silenceDetection) {
        try {
          setupSilenceDetection(stream);
        } catch (error) {
          console.warn('Silence detection setup failed, continuing without it:', error);
          // Continue without silence detection
        }
      }

      mediaRecorder.start(100); // Collect data every 100ms for responsive processing
      setIsRecording(true);
      setIsListening(true);
      
      toast({
        title: 'Recording Started',
        description: `Speak in ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].nativeName}. Auto-detection enabled.`,
      });

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Recording Failed',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
      
      // Clear silence timeout
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
        setSilenceTimeout(null);
      }
    }
  };

  // Enhanced audio processing with performance tracking
  const processAudioInput = async (audioBlob: Blob, originalMimeType?: string) => {
    const startTime = Date.now();
    try {
      setIsProcessing(true);
      
      // Use proper audio conversion for Sarvam AI compatibility
      let processedBlob = audioBlob;
      let finalMimeType = originalMimeType || 'audio/webm';
      
      console.log('🎤 [STT] Converting audio for Sarvam AI compatibility');
      console.log('🎤 [STT] Original:', audioBlob.size, 'bytes,', finalMimeType);
      
      // Convert WebM to WAV for Sarvam AI compatibility
      if (AudioConverter.isConversionSupported() && (finalMimeType.includes('webm') || finalMimeType.includes('mp4'))) {
        try {
          processedBlob = await AudioConverter.webmToWav(audioBlob);
          finalMimeType = 'audio/wav';
          console.log('🎤 [STT] Converted to WAV:', processedBlob.size, 'bytes');
        } catch (error) {
          console.warn('🎤 [STT] Audio conversion failed, using original:', error);
          // Continue with original blob
        }
      }
      
      console.log('🎤 [STT] Sending to backend:', finalMimeType, processedBlob.size, 'bytes');
      
      // Convert audio blob to base64 for Sarvam AI
      const arrayBuffer = await processedBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const response = await fetch(`${API_BASE_URL}/calling/process-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          languageCode: selectedLanguage,
          negotiationId,
          mimeType: finalMimeType,
          optimizedMode,
          campaignContext: {
            budget: campaignData?.budget || negotiationContext?.budget,
            timeline: campaignData?.timeline || negotiationContext?.timeline,
            deliverables: negotiationContext?.deliverables,
            keyTalkingPoints: campaignData?.keyTalkingPoints,
            targetAudience: campaignData?.targetAudience,
            creatorMetrics: selectedCreators.length > 0 ? selectedCreators[0] : null
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      console.log('🎤 [STT] Response:', data.provider, data.fallback ? '(Fallback)' : '(Real)');

      // Add user message
      const userMessage: VoiceMessage = {
        id: Date.now().toString(),
        type: 'user',
        text: data.transcript,
        timestamp: new Date(),
        language: selectedLanguage
      };
      
      // Add AI response  
      const aiMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: data.aiResponse,
        timestamp: new Date(),
        language: selectedLanguage
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Enhanced notification system
      if (data.fallback) {
        toast({
          title: 'Using Mock STT',
          description: `Voice recognition not working properly. Showing example response instead.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Voice Processed Successfully! 🎤',
          description: `Real STT working - Response in ${Date.now() - startTime}ms`,
        });
      }
      
      // Play AI response
      if (data.audioResponse) {
        await playAudioResponse(data.audioResponse);
      } else {
        await speakText(data.aiResponse);
      }

      // Update performance metrics
      const responseTime = Date.now() - startTime;
      setPerformanceMetrics(prev => ({
        avgResponseTime: (prev.avgResponseTime * prev.totalRequests + responseTime) / (prev.totalRequests + 1),
        totalRequests: prev.totalRequests + 1,
        successRate: (prev.totalRequests * prev.successRate + 100) / (prev.totalRequests + 1),
        lastResponseTime: responseTime
      }));

    } catch (error) {
      console.error('Failed to process audio:', error);
      
      // Update error metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        successRate: (prev.totalRequests * prev.successRate) / Math.max(prev.totalRequests + 1, 1),
        totalRequests: prev.totalRequests + 1
      }));
      
      toast({
        title: 'Processing Failed',
        description: 'Could not process your voice message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced TTS with language consistency
  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      const response = await fetch(`${API_BASE_URL}/calling/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          languageCode: selectedLanguage,
          speaker: 'vidya', // Always use Vidya
          negotiationId,
          optimizedMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await response.json();
      
      if (data.success && data.audioData) {
        await playAudioResponse(data.audioData);
      } else {
        console.warn('TTS failed, no audio generated');
      }

    } catch (error) {
      console.error('Failed to speak text:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Optimized audio playback
  const playAudioResponse = async (audioBase64: string) => {
    try {
      await initializeAudioContext();
      
      const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.playbackRate = optimizedMode ? 1.1 : 1.0; // Slightly faster in optimized mode
      
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback failed');
      };
      
      await audio.play();

    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsSpeaking(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const closeAssistant = () => {
    if (isRecording) {
      stopRecording();
    }
    setIsOpen(false);
    setMessages([]);
    setNegotiationId(null);
    setConnectionStatus('disconnected');
    
    // Clean up streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }
    };
  }, [silenceTimeout]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 bg-white/95 backdrop-blur-sm border shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bot className="h-8 w-8 text-blue-600" />
                  {connectionStatus === 'connected' && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Vidya AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">
                    {connectionStatus === 'connected' ? `📞 On call with ${creatorName}` : 'Click to connect'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(false)}
                  className="h-8 w-8 p-0"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeAssistant}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[700px] bg-white/95 backdrop-blur-sm border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bot className="h-8 w-8 text-blue-600" />
              {connectionStatus === 'connected' && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">Vidya AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                {connectionStatus === 'connected' ? `📞 Calling: ${creatorName}` : 'Click to connect'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeAssistant}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Language Selection Only */}
        <div className="p-3 border-b bg-gray-50/50 space-y-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-blue-600" />
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                  <SelectItem key={code} value={code}>
                    {lang.nativeName} ({lang.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optimization Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Optimized Mode</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptimizedMode(!optimizedMode)}
              className={optimizedMode ? 'bg-yellow-100 border-yellow-300' : ''}
            >
              {optimizedMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        {connectionStatus === 'connected' && optimizedMode && (
          <div className="p-2 border-b bg-green-50/50">
            <div className="flex justify-between text-xs text-green-700">
              <span>Avg: {Math.round(performanceMetrics.avgResponseTime)}ms</span>
              <span>Success: {Math.round(performanceMetrics.successRate)}%</span>
              <span>Last: {Math.round(performanceMetrics.lastResponseTime)}ms</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'assistant' && (
                      <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                    )}
                    {message.type === 'user' && (
                      <User className="h-4 w-4 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                        {message.language && (
                          <span className="ml-2">
                            • {SUPPORTED_LANGUAGES[message.language as keyof typeof SUPPORTED_LANGUAGES]?.nativeName}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Controls */}
        <div className="p-4 border-t bg-gray-50/50">
          {connectionStatus !== 'connected' ? (
            <Button 
              onClick={initializeNegotiation}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? (
                <>
                  <PhoneCall className="mr-2 h-4 w-4 animate-pulse" />
                  Connecting to {creatorName}...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Call {creatorName}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Status indicators */}
              <div className="flex justify-center gap-2 flex-wrap">
                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse">
                    {isListening ? '🎤 Listening...' : 'Recording...'}
                  </Badge>
                )}
                {isProcessing && (
                  <Badge variant="secondary" className="animate-pulse">
                    Processing...
                  </Badge>
                )}
                {isSpeaking && (
                  <Badge variant="outline" className="animate-pulse">
                    <Volume2 className="mr-1 h-3 w-3" />
                    Vidya Speaking
                  </Badge>
                )}
                {silenceDetection && isRecording && (
                  <Badge variant="outline" className="text-xs">
                    Auto-detect ON
                  </Badge>
                )}
              </div>

              {/* Recording button */}
              <Button
                onClick={toggleRecording}
                disabled={isProcessing || isSpeaking}
                className={`w-full transition-all duration-200 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Vidya Voice • {SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].nativeName}
                {optimizedMode && ' • ⚡ Optimized'}
                {silenceDetection && ' • 🤫 Auto-detect'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VoiceAssistant;