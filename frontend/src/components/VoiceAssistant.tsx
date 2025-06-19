import React, { useState, useRef, useEffect } from 'react';
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
  Languages
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  audioUrl?: string;
}

// Updated voices with multiple languages based on Sarvam AI
const SUPPORTED_LANGUAGES = {
  'en-IN': { name: 'English (India)', code: 'en-IN' },
  'hi-IN': { name: 'हिन्दी (Hindi)', code: 'hi-IN' },
  'bn-IN': { name: 'বাংলা (Bengali)', code: 'bn-IN' },
  'ta-IN': { name: 'தமிழ் (Tamil)', code: 'ta-IN' },
  'te-IN': { name: 'తెలుగు (Telugu)', code: 'te-IN' },
  'ml-IN': { name: 'മലയാളം (Malayalam)', code: 'ml-IN' },
  'gu-IN': { name: 'ગુજરાતી (Gujarati)', code: 'gu-IN' },
  'kn-IN': { name: 'ಕನ್ನಡ (Kannada)', code: 'kn-IN' },
  'or-IN': { name: 'ଓଡ଼ିଆ (Odia)', code: 'or-IN' },
  'pa-IN': { name: 'ਪੰਜਾਬੀ (Punjabi)', code: 'pa-IN' }
};

const SUPPORTED_VOICES: Record<string, { lang: string; speaker: string; gender: string; name: string; }> = {
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
};

interface VoiceAssistantProps {
  creatorName?: string;
  campaignTitle?: string;
  negotiationContext?: {
    budget: number;
    deliverables: string[];
    timeline: string;
  };
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  creatorName = "Creator",
  campaignTitle = "Campaign",
  negotiationContext
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [negotiationId, setNegotiationId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-IN-vidya'); // Default to Vidya
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN'); // Default language
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  // API configuration
  const isDevelopment = import.meta.env.DEV;
  const API_BASE_URL = isDevelopment ? '/api' : 'https://influencerflow.onrender.com/api';

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Filter voices by selected language
  const getVoicesForLanguage = (languageCode: string) => {
    return Object.entries(SUPPORTED_VOICES)
      .filter(([key, voice]) => voice.lang === languageCode)
      .reduce((acc, [key, voice]) => {
        acc[key] = voice;
        return acc;
      }, {} as Record<string, typeof SUPPORTED_VOICES[string]>);
  };

  // Update voice when language changes
  useEffect(() => {
    const voicesForLanguage = getVoicesForLanguage(selectedLanguage);
    const voiceKeys = Object.keys(voicesForLanguage);
    
    if (voiceKeys.length > 0) {
      // Try to keep Vidya if available in the new language, otherwise pick first voice
      const vidyaVoice = voiceKeys.find(key => key.includes('vidya'));
      const newVoice = vidyaVoice || voiceKeys[0];
      setSelectedVoice(newVoice);
    }
  }, [selectedLanguage]);

  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
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

  const initializeNegotiation = async () => {
    try {
      await initializeAudioContext();
      
      setConnectionStatus('connecting');
      
      const response = await fetch(`${API_BASE_URL}/calling/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorName,
          campaignTitle,
          negotiationContext,
          strategy: 'collaborative',
          mode: 'voice_chat',
          voiceKey: selectedVoice,
          languageCode: selectedLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize negotiation');
      }

      const data = await response.json();
      setNegotiationId(data.negotiationId);
      setConnectionStatus('connected');
      
      // Add welcome message in selected language
      const welcomeMessages = {
        'en-IN': `Hello! I'm your AI negotiation assistant powered by Sarvam AI for the ${campaignTitle} campaign with ${creatorName}. I can help you negotiate terms, discuss pricing, and handle contract details using advanced speech recognition and natural language processing. How can I assist you today?`,
        'hi-IN': `नमस्ते! मैं ${creatorName} के साथ ${campaignTitle} अभियान के लिए Sarvam AI द्वारा संचालित आपका AI बातचीत सहायक हूं। मैं उन्नत भाषण पहचान और प्राकृतिक भाषा प्रसंस्करण का उपयोग करके शर्तों पर बातचीत करने, मूल्य निर्धारण पर चर्चा करने और अनुबंध विवरण संभालने में आपकी सहायता कर सकता हूं। आज मैं आपकी कैसे सहायता कर सकता हूं?`,
      };
      
      const welcomeMessage: VoiceMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        text: welcomeMessages[selectedLanguage as keyof typeof welcomeMessages] || welcomeMessages['en-IN'],
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      
      // Speak the welcome message using Sarvam AI TTS
      await speakText(welcomeMessage.text);
      
      toast({
        title: 'Voice Assistant Ready',
        description: `Connected with ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].name} support using Sarvam AI.`,
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

  const startRecording = async () => {
    try {
      await initializeAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Sarvam AI works best with 16kHz
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioInput(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: 'Recording Started',
        description: `Speak now in ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].name}. Using Sarvam AI speech recognition.`,
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
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      
      // Convert audio blob to base64 for Sarvam AI
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const selectedVoiceConfig = SUPPORTED_VOICES[selectedVoice];
      
      const response = await fetch(`${API_BASE_URL}/calling/process-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          languageCode: selectedVoiceConfig.lang,
          negotiationId,
          mimeType: 'audio/webm'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      // Add user message
      const userMessage: VoiceMessage = {
        id: Date.now().toString(),
        type: 'user',
        text: data.transcript,
        timestamp: new Date()
      };
      
      // Add AI response
      const aiMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: data.aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Play AI response if audio is available
      if (data.audioResponse) {
        await playAudioResponse(data.audioResponse);
      } else {
        // Fallback to text-to-speech if no audio returned
        await speakText(data.aiResponse);
      }

      toast({
        title: 'Message Processed',
        description: `Voice message processed successfully in ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].name}.`,
      });

    } catch (error) {
      console.error('Failed to process audio:', error);
      toast({
        title: 'Processing Failed',
        description: 'Could not process your voice message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      const selectedVoiceConfig = SUPPORTED_VOICES[selectedVoice];
      
      const response = await fetch(`${API_BASE_URL}/calling/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          languageCode: selectedVoiceConfig.lang,
          speaker: selectedVoiceConfig.speaker,
          negotiationId
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

  const playAudioResponse = async (audioBase64: string) => {
    try {
      await initializeAudioContext();
      
      const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
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
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
                  <h3 className="font-semibold text-sm">Sarvam AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">
                    {connectionStatus === 'connected' ? `${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].name} • Vidya` : 'Click to connect'}
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
      <Card className="w-96 h-[650px] bg-white/95 backdrop-blur-sm border shadow-2xl flex flex-col">
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
              <h3 className="font-semibold">Sarvam AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                {connectionStatus === 'connected' ? `Negotiating: ${campaignTitle}` : 'Click to connect'}
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

        {/* Language and Voice Selection */}
        <div className="p-3 border-b bg-gray-50/50 space-y-3">
          {/* Language Selection */}
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-blue-600" />
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                  <SelectItem key={code} value={code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Selection */}
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Voice" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(getVoicesForLanguage(selectedLanguage)).map(([key, voice]) => (
                <SelectItem key={key} value={key}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Status and Controls */}
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
                  Connecting to Sarvam AI...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Start Voice Negotiation
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Status indicators */}
              <div className="flex justify-center gap-4">
                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse">
                    Recording...
                  </Badge>
                )}
                {isProcessing && (
                  <Badge variant="secondary" className="animate-pulse">
                    Processing with Sarvam AI...
                  </Badge>
                )}
                {isSpeaking && (
                  <Badge variant="outline" className="animate-pulse">
                    <Volume2 className="mr-1 h-3 w-3" />
                    Speaking
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
                Powered by Sarvam AI • {SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES].name} • Vidya voice
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VoiceAssistant;