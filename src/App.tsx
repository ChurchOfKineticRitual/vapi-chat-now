import React, { useState, useEffect, useRef } from 'react';

// Import Vapi - we know this works
let Vapi: any = null;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}

function App() {
  // Core state
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'user' | 'assistant' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const vapiRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setIsCallActive(true);
      setIsStartingCall(false);
      setCurrentSpeaker(null);
      setMessages([]);
    });

    vapi.on('call-end', () => {
      setIsCallActive(false);
      setIsStartingCall(false);
      setIsSpeaking(false);
      setCurrentSpeaker(null);
       // Finalize any pending messages
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

      if (message.type === 'transcript') {
        handleTranscript(message);
      }
    });

    vapi.on('error', (error: any) => {
      console.error('❌ Vapi error:', error);
    });
  };

  const handleTranscript = (message: any) => {
    const { role, transcript, transcriptType } = message;
    const isFinal = transcriptType === 'final';

    console.log(`🎯 ${role} | ${transcriptType} | "${transcript}"`);

    if (transcriptType === 'partial') {
      setCurrentSpeaker(role);
    } else if (transcriptType === 'final') {
      setCurrentSpeaker(null);
    }

    setMessages(prevMessages => {
      const lastMessage = prevMessages[prevMessages.length - 1];

      // Check if the last message is from the same role and is not final
      if (lastMessage && lastMessage.role === role && !lastMessage.isFinal) {
        console.log(`🔄 Continue ${role} message`);
        // Update the last message
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          text: transcript,
          isFinal: isFinal,
        };
        return updatedMessages;
      } else {
        console.log(`🆕 New ${role} message`);
        // Create a new message
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
    if (!vapiRef.current) return;

    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
    if (!assistantId) return;

    try {
      setIsStartingCall(true);
      await vapiRef.current.start(assistantId);
    } catch (error) {
      console.error('Failed to start call:', error);
      setIsStartingCall(false);
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Keyframes for waveform animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes wave {
            0% { transform: scaleY(0.5); }
            100% { transform: scaleY(1.5); }
          }
        `
      }} />

      {/* Header - Fixed Height */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <h1 className="text-xl font-bold text-white">NUTRITION</h1>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? 'bg-green-900 text-green-200 border border-green-700'
              : 'bg-red-900 text-red-200 border border-red-700'
          }`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </div>
          {isCallActive && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
              isSpeaking
                ? 'bg-blue-900 text-blue-200 border border-blue-700 animate-pulse'
                : 'bg-gray-700 text-gray-300 border border-gray-600'
            }`}>
              {isSpeaking ? '🎤 Speaking...' : '👂 Listening'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Fixed Layout with CSS Grid */}
      <div className="flex-1 grid grid-rows-[auto_1fr] gap-4 p-6 min-h-0 overflow-hidden">

        {/* Audio Waveform Display - Fixed Height */}
        <div className="h-16 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden relative flex-shrink-0">
          {isCallActive && currentSpeaker && (
            <div className={`absolute inset-0 flex items-center px-4 ${
              currentSpeaker === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`flex items-center space-x-1 transition-all duration-300 ${
                currentSpeaker === 'user'
                  ? 'animate-pulse'
                  : 'animate-pulse'
              }`}>
                {/* Waveform bars */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      currentSpeaker === 'user'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      height: `${Math.random() * 30 + 10}px`,
                      animationDelay: `${i * 50}ms`,
                      animation: 'wave 0.6s ease-in-out infinite alternate'
                    }}
                  />
                ))}
              </div>

              {/* Speaker label */}
              <div className={`ml-3 text-xs font-medium ${
                currentSpeaker === 'user'
                  ? 'text-green-400'
                  : 'text-blue-400'
              }`}>
                {currentSpeaker === 'user' ? '👤 You' : '🤖 Assistant'}
              </div>
            </div>
          )}

          {/* Idle state */}
          {(!isCallActive || !currentSpeaker) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-500 text-sm">
                {isCallActive ? 'Listening...' : 'Audio levels will appear here during conversation'}
              </div>
            </div>
          )}
        </div>

        {/* Conversation Panel - Fixed Height with Internal Scrolling */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-300">
              Conversation
            </h2>
          </div>

          {/* Messages Container - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">💬</div>
                <p>Start a conversation to see messages appear here.</p>
                <p className="text-sm">Messages will stream in real-time as you speak.</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm transition-all duration-200 ${
                      message.role === 'user'
                        ? message.isFinal
                          ? 'bg-green-600 text-white rounded-br-sm'
                          : 'bg-green-600/70 text-white rounded-br-sm border-2 border-dashed border-green-400'
                        : message.isFinal
                          ? 'bg-blue-600 text-white rounded-bl-sm'
                          : 'bg-blue-600/70 text-white rounded-bl-sm border-2 border-dashed border-blue-400'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.text}</p>

                      {/* Typing cursor for partial messages */}
                      {!message.isFinal && (
                        <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse"></span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Auto-scroll target */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel - Fixed Height */}
      <div className="bg-gray-800 p-6 border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-center">
          {!isCallActive ? (
            <button
              onClick={startCall}
              disabled={!isConnected || isStartingCall}
              className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-3 ${
                isConnected && !isStartingCall
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30 hover:shadow-green-600/50 transform hover:scale-105'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <div className="text-xl">
                {isStartingCall ? '⏳' : '🎤'}
              </div>
              <span>
                {isStartingCall
                  ? 'Connecting...'
                  : isConnected
                    ? 'Start Voice Call'
                    : 'Connecting...'
                }
              </span>
            </button>
          ) : (
            <button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-3 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transform hover:scale-105"
            >
              <div className="text-xl">📞</div>
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
