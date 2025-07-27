import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import type { Message } from './components/MessageBubble';

const VAPI_PUBLIC_KEY = "9a3cbf9c-d1df-476f-984c-ce78100189f9";
const ASSISTANT_ID = "a9cafb7c-3874-433d-b697-9edeb3445575";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapi, setVapi] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New state for transcriptions
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Initialize Vapi with enhanced event listeners
  useEffect(() => {
    const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);

    // Call state events
    vapiInstance.on('call-start', () => {
      console.log('Call started');
      setIsConnected(true);
      setIsLoading(false);
      setMessages([]);
      setCurrentTranscript('');
      setCurrentAssistantMessage('');
    });

    vapiInstance.on('call-end', () => {
      console.log('Call ended');
      setIsConnected(false);
      setIsLoading(false);
      setIsListening(false);
      setIsSpeaking(false);
      setCurrentTranscript('');
      setCurrentAssistantMessage('');
    });

    // Speech events
    vapiInstance.on('speech-start', () => {
      console.log('Speech started');
      setIsListening(true);
      setIsSpeaking(false);
    });

    vapiInstance.on('speech-end', () => {
      console.log('Speech ended');
      setIsListening(false);
    });

    // Volume level for visualization
    vapiInstance.on('volume-level', (volume: number) => {
      setVolumeLevel(volume);
    });

    // Enhanced message handling for actual Vapi message types
    vapiInstance.on('message', (message: any) => {
      console.log('Message received:', message);
      
      // Handle user voice input (transcripts)
      if (message.type === 'voice-input') {
        if (message.isFinal) {
          // Add final user transcript to messages
          const newMessage: Message = {
            id: `voice-${Date.now()}-${Math.random()}`,
            role: 'user',
            content: message.inputText || '',
            timestamp: new Date(),
            type: 'final'
          };
          setMessages(prev => [...prev, newMessage]);
          setCurrentTranscript('');
        } else {
          // Update current transcript for real-time display
          setCurrentTranscript(message.inputText || '');
        }
      }
      
      // Handle assistant model output (responses) - accumulate for live streaming
      else if (message.type === 'model-output') {
        const chunk = message.output || message.text || '';
        setCurrentAssistantMessage(prev => prev + (prev ? ' ' : '') + chunk);
      }
      
      // Handle speech updates for better state management
      else if (message.type === 'speech-update') {
        console.log('Speech update:', message);
        if (message.role === 'user') {
          if (message.status === 'started') {
            setIsListening(true);
            setIsSpeaking(false);
          } else if (message.status === 'stopped') {
            setIsListening(false);
          }
        } else if (message.role === 'assistant') {
          if (message.status === 'started') {
            setIsSpeaking(true);
            setIsListening(false);
          } else if (message.status === 'stopped') {
            setIsSpeaking(false);
            // Finalize the assistant message when speaking stops
            if (currentAssistantMessage.trim()) {
              const newMessage: Message = {
                id: `assistant-${Date.now()}-${Math.random()}`,
                role: 'assistant',
                content: currentAssistantMessage.trim(),
                timestamp: new Date(),
                type: 'final'
              };
              setMessages(prev => [...prev, newMessage]);
              setCurrentAssistantMessage('');
            }
          }
        }
      }
      
      // Handle conversation updates - this seems to be the main message container
      else if (message.type === 'conversation-update') {
        console.log('Conversation update:', message.conversation, message.messages);
        
        // Check if there are messages in the conversation
        const messagesArray = message.messages || message.conversation || [];
        if (Array.isArray(messagesArray) && messagesArray.length > 0) {
          const convertedMessages: Message[] = messagesArray.map((msg: any, index: number) => ({
            id: `conv-${msg.timestamp || Date.now()}-${index}`,
            role: (msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system') as 'user' | 'assistant' | 'system',
            content: msg.content || msg.text || msg.message || '',
            timestamp: new Date(msg.timestamp || Date.now()),
            type: 'final' as const
          })).filter(msg => msg.content.trim() !== ''); // Filter out empty messages
          
          if (convertedMessages.length > 0) {
            setMessages(convertedMessages);
          }
        }
      }
      
      // Handle function calls
      else if (message.type === 'function-call') {
        const newMessage: Message = {
          id: `func-${Date.now()}-${Math.random()}`,
          role: 'system',
          content: `Function called: ${message.functionCall?.name || 'Unknown'}`,
          timestamp: new Date(),
          type: 'function-call'
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
      // Handle legacy transcript messages (fallback)
      else if (message.type === 'transcript') {
        if (message.transcriptType === 'partial') {
          setCurrentTranscript(message.transcript || '');
        } else if (message.transcriptType === 'final') {
          const newMessage: Message = {
            id: `transcript-${Date.now()}-${Math.random()}`,
            role: 'user',
            content: message.transcript || '',
            timestamp: new Date(),
            type: 'final'
          };
          setMessages(prev => [...prev, newMessage]);
          setCurrentTranscript('');
        }
      }
    });

    vapiInstance.on('error', (error: any) => {
      console.error('Vapi error:', error);
      setError(error.message || 'An error occurred');
      setIsLoading(false);
      setIsListening(false);
      setIsSpeaking(false);
    });

    return () => {
      vapiInstance.removeAllListeners();
    };
  }, []);

  const startCall = async () => {
    if (!vapi) {
      setError('Vapi not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await vapi.start(ASSISTANT_ID);
    } catch (error: any) {
      console.error('Failed to start call:', error);
      setError(error.message || 'Failed to start call');
      setIsLoading(false);
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row p-4 gap-6">
      {/* Main Control Panel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-border">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Voice Assistant</h1>
              <p className="text-muted-foreground">
                Experience AI conversation with real-time transcription
              </p>
            </div>

            <div className="flex justify-center">
              <div className={`rounded-full p-6 transition-all duration-300 relative ${
                isConnected 
                  ? 'bg-accent/20' 
                  : 'bg-secondary/50'
              }`}>
                <div className={`absolute inset-0 rounded-full ${
                  isListening ? 'pulse-green' : ''
                }`} />
                {isConnected ? (
                  <Mic className={`w-12 h-12 relative z-10 ${
                    isListening ? 'text-accent' : 'text-primary'
                  }`} />
                ) : (
                  <MicOff className="w-12 h-12 text-muted-foreground relative z-10" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              {!isConnected ? (
                <Button 
                  onClick={startCall}
                  disabled={isLoading || !vapi}
                  className="w-full py-6 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5 mr-2" />
                      Start Conversation
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={endCall}
                  variant="destructive"
                  className="w-full py-6 text-lg"
                  size="lg"
                >
                  <Phone className="w-5 h-5 mr-2 rotate-135" />
                  End Conversation
                </Button>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-accent' : 'bg-muted-foreground'
                }`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcription Panel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <TranscriptionPanel
            messages={messages}
            currentTranscript={currentTranscript}
            currentAssistantMessage={currentAssistantMessage}
            isListening={isListening}
            isSpeaking={isSpeaking}
            volumeLevel={volumeLevel}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
