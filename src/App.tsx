import React, { useState, useEffect, useRef } from 'react';
import { useSpring, useTrail, animated, config } from '@react-spring/web';

// Import Vapi - we know this works
let Vapi: any = null;

// Simplified app states
type AppState = 'idle' | 'connecting' | 'conversation' | 'end';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}

// Cascading Text Component with proper useTrail implementation
const CascadingText = ({ 
  text, 
  isVisible 
}: { 
  text: string; 
  isVisible: boolean;
}) => {
  const lines = Array.from({ length: 25 }, (_, i) => ({ text, id: i }));
  
  // Use useTrail with API for proper control
  const [trail, api] = useTrail(
    lines.length,
    () => ({
      opacity: 0,
      transform: 'translateY(50px)',
      config: { 
        mass: 1, 
        tension: 200, 
        friction: 50,
      },
    }),
    []
  );

  // Trigger animation when isVisible changes
  useEffect(() => {
    if (isVisible) {
      api.start((index) => ({
        opacity: 1,
        transform: 'translateY(0px)',
        delay: index * 50, // Staggered cascade effect
      }));
    } else {
      api.start(() => ({
        opacity: 0,
        transform: 'translateY(50px)',
      }));
    }
  }, [isVisible, api]);

  const glowSpring = useSpring({
    loop: { reverse: true },
    from: { brightness: 0.8 },
    to: { brightness: 1.2 },
    config: { duration: 1500 },
    pause: !isVisible,
  });

  return (
    <div className="flex flex-col space-y-1 overflow-hidden h-full items-center">
      {trail.map((style, index) => (
        <animated.div
          key={lines[index].id}
          className="text-4xl sm:text-6xl md:text-8xl font-bold text-black select-none whitespace-nowrap text-center"
          style={{
            ...style,
            filter: glowSpring.brightness.to(b => `brightness(${b})`),
          }}
        >
          {text}
        </animated.div>
      ))}
    </div>
  );
};

function App() {
  // Simplified state management
  const [appState, setAppState] = useState<AppState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'user' | 'assistant' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const vapiRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, [messages]);

  // Auto-return to idle after "Ciao for Now"
  useEffect(() => {
    if (appState === 'end') {
      const timer = setTimeout(() => {
        setAppState('idle');
        setMessages([]);
        setIsEnding(false);
      }, 1000); // 1 second as requested
      return () => clearTimeout(timer);
    }
  }, [appState]);

  useEffect(() => {
    const initVapi = async () => {
      try {
        const VapiModule = await import('@vapi-ai/web');
        Vapi = VapiModule.default;

        const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
        if (!publicKey) return;

        vapiRef.current = new Vapi(publicKey);
        setIsConnected(true);
        setupEventListeners();
      } catch (error) {
        console.error('Failed to initialize Vapi:', error);
      }
    };

    initVapi();

    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (error) {
          console.log('Cleanup error (normal):', error);
        }
      }
    };
  }, []);

  const setupEventListeners = () => {
    if (!vapiRef.current) return;

    const vapi = vapiRef.current;

    vapi.on('call-start', () => {
      setAppState('conversation');
      setCurrentSpeaker(null);
      setMessages([]);
    });

    vapi.on('call-end', () => {
      setAppState('end');
      setIsSpeaking(false);
      setCurrentSpeaker(null);
      setMessages(prev => prev.map(msg => ({ ...msg, isFinal: true })));
    });

    vapi.on('speech-start', () => {
      console.log('Assistant started speaking');
      setIsSpeaking(true);
    });

    vapi.on('speech-end', () => {
      console.log('Assistant stopped speaking');
      setIsSpeaking(false);
    });

    vapi.on('message', (message: any) => {
      console.log('📩 Message:', message);
      console.log('📩 Message Type:', message.type);
      console.log('📩 Message Keys:', Object.keys(message));
      
      // Handle different possible transcript message types
      if (message.type === 'transcript' || 
          message.type === 'conversation-update' || 
          message.type === 'status-update' ||
          message.transcript || 
          message.transcriptType) {
        console.log('🎯 Processing as transcript:', message);
        handleTranscript(message);
      } else {
        console.log('❌ Not processing message type:', message.type);
      }
    });

    vapi.on('error', (error: any) => {
      console.error('❌ Vapi error:', error);
      setAppState('idle'); // Return to idle on error
    });
  };

  const handleTranscript = (message: any) => {
    console.log('🔍 Full message object:', JSON.stringify(message, null, 2));
    
    // Try different possible field structures based on various Vapi message formats
    let role = message.role || message.transcript?.role || message.user || message.assistant;
    let transcript = message.transcript || message.text || message.transcription || message.content;
    let transcriptType = message.transcriptType || message.type || message.transcript?.type;
    
    // Handle conversation-update format
    if (message.type === 'conversation-update' && message.conversation) {
      const lastMessage = message.conversation[message.conversation.length - 1];
      if (lastMessage) {
        role = lastMessage.role;
        transcript = lastMessage.content || lastMessage.text;
        transcriptType = lastMessage.transcriptType || 'final';
      }
    }
    
    // Handle status-update format (which might contain transcript data)
    if (message.type === 'status-update') {
      // Check if this status update contains transcript information
      if (Array.isArray(message) && message.length > 0) {
        // Look through the array for transcript-like data
        const transcriptData = message.find(item => 
          item && (item.transcript || item.text || item.content || item.role)
        );
        if (transcriptData) {
          role = transcriptData.role;
          transcript = transcriptData.transcript || transcriptData.text || transcriptData.content;
          transcriptType = transcriptData.transcriptType || 'final';
        }
      }
      
      // Also check if the message itself has nested transcript properties
      if (message.status && message.status.transcript) {
        role = message.status.role || role;
        transcript = message.status.transcript || transcript;
        transcriptType = message.status.transcriptType || transcriptType;
      }
    }
    
    // Handle nested transcript objects
    if (message.transcript && typeof message.transcript === 'object') {
      role = role || message.transcript.role;
      transcript = transcript || message.transcript.text || message.transcript.content;
      transcriptType = transcriptType || message.transcript.transcriptType;
    }
    
    // If we still don't have the essential fields, try to extract from any available field
    if (!role && (message.user || message.assistant)) {
      role = message.user ? 'user' : 'assistant';
    }
    
    if (!transcript) {
      // Look for any field that might contain the actual text
      const possibleTextFields = ['transcript', 'text', 'content', 'transcription', 'message'];
      for (const field of possibleTextFields) {
        if (message[field] && typeof message[field] === 'string') {
          transcript = message[field];
          break;
        }
      }
    }
    
    // If we still don't have the essential fields, log and return
    if (!role || !transcript) {
      console.warn('⚠️ Missing essential transcript fields:', { 
        role, 
        transcript, 
        transcriptType, 
        messageType: message.type,
        allKeys: Object.keys(message),
        fullMessage: message 
      });
      return;
    }
    
    const isFinal = transcriptType === 'final' || transcriptType === 'complete' || !transcriptType;

    console.log(`🎯 ${role} | ${transcriptType} | "${transcript}"`);

    if (transcriptType === 'partial' || transcriptType === 'interim') {
      setCurrentSpeaker(role);
    } else {
      setCurrentSpeaker(null);
    }

    setMessages(prevMessages => {
      const lastMessage = prevMessages[prevMessages.length - 1];

      if (lastMessage && lastMessage.role === role && !lastMessage.isFinal) {
        console.log(`🔄 Continue ${role} message`);
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          text: transcript,
          isFinal: isFinal,
        };
        return updatedMessages;
      } else {
        console.log(`🆕 New ${role} message`);
        const newMessage: Message = {
          id: `${Date.now()}-${Math.random()}`,
          role: role,
          text: transcript,
          isFinal: isFinal,
        };
        return [...prevMessages, newMessage];
      }
    });
  };

  const startCall = async () => {
    if (!vapiRef.current || !isConnected) return;

    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
    if (!assistantId) return;

    try {
      setAppState('connecting');
      await vapiRef.current.start(assistantId);
    } catch (error) {
      console.error('Failed to start call:', error);
      setAppState('idle');
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      setIsEnding(true);
      // Add a small delay to show the visual feedback before ending
      setTimeout(() => {
        vapiRef.current.stop();
      }, 300);
    }
  };

  const toggleMute = () => {
    if (!vapiRef.current) return;
    
    try {
      const newMutedState = !isMuted;
      vapiRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);
      
      console.log(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error('Mute toggle error:', error);
    }
  };

  // Render based on app state
  const renderContent = () => {
    console.log('Rendering state:', appState);
    
    switch (appState) {
      case 'idle':
        return (
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={startCall}
              disabled={!isConnected}
              className={`px-12 py-6 rounded-2xl font-bold transition-all duration-300 relative overflow-hidden ${
                isConnected
                  ? 'bg-white text-black subtle-pulse'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="text-4xl">TALK</span>
            </button>
          </div>
        );

      case 'connecting':
        return (
          <div className="flex-1 bg-gray-300 p-8 overflow-hidden">
            <CascadingText text="CONNECTING" isVisible={true} />
          </div>
        );

      case 'conversation':
        return (
          <div className="flex flex-col h-full">
            {/* Conversation Container - 4:5 aspect ratio with original positioning */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6 overflow-hidden mb-4" 
                 style={{ aspectRatio: '4/5' }}>
              <div className="h-full overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <p className="text-xl sm:text-2xl font-mono tracking-wider">{'>>> INCOMING <<<'}</p>
                  </div>
                ) : (
                  <div className="min-h-full flex flex-col justify-center">
                    {/* Add top padding to center first messages */}
                    <div className="flex-grow min-h-0" style={{ minHeight: messages.length <= 2 ? '30%' : '0' }}></div>
                    
                    <div className="space-y-3">
                      {messages.map((message, index) => (
                        <div key={message.id}>
                          <div className={`${
                            message.role === 'user' ? 'text-right' : 'text-left'
                          } max-w-xs lg:max-w-md ${
                            message.role === 'user' ? 'ml-auto' : 'mr-auto'
                          }`}>
                            <span className={`text-base sm:text-lg leading-relaxed block ${
                              message.role === 'user' 
                                ? 'text-teal-400' 
                                : 'text-green-400'
                            } ${!message.isFinal ? 'opacity-70' : ''} ${
                              currentSpeaker === message.role ? 'animate-pulse' : ''
                            }`}>
                              {message.text}
                              {!message.isFinal && (
                                <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse"></span>
                              )}
                            </span>
                          </div>
                          
                          {/* Add spacing between different speakers */}
                          {index < messages.length - 1 && 
                           messages[index + 1].role !== message.role && (
                            <div className="h-3 sm:h-4"></div>
                          )}
                        </div>
                      ))}
                      
                      {/* Invisible element for auto-scroll target */}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Add bottom padding to ensure last message doesn't get cut off */}
                    <div className="h-6 sm:h-8"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons - Positioned directly below conversation box */}
            <div className="flex justify-center space-x-4 sm:space-x-6 flex-shrink-0">
              <button
                onClick={endCall}
                disabled={isEnding}
                className={`px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all duration-200 border-2 active:scale-95 text-sm sm:text-base ${
                  isEnding 
                    ? 'border-red-400 bg-red-500 text-white animate-pulse' 
                    : 'border-white bg-transparent text-white active:bg-white active:text-black'
                }`}
              >
                {isEnding ? 'ENDING...' : 'END'}
              </button>
              <button
                onClick={toggleMute}
                className={`px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all duration-200 border-2 active:scale-95 text-sm sm:text-base ${
                  isMuted
                    ? 'border-white bg-white text-black'
                    : 'border-white bg-transparent text-white active:bg-white active:text-black'
                }`}
              >
                {isMuted ? 'MUTED' : 'MUTE'}
              </button>
            </div>
          </div>
        );

      case 'end':
        return (
          <div className="flex-1 bg-gray-300 p-8 overflow-hidden">
            <CascadingText text="CIAO FOR NOW" isVisible={true} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col p-6 overflow-hidden">
      {renderContent()}
    </div>
  );
}

export default App;