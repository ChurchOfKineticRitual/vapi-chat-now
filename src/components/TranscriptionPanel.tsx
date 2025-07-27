import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

interface PartialTranscript {
  role: 'user' | 'assistant';
  text: string;
}

interface TranscriptionPanelProps {
  messages: Message[];
  partialTranscript: PartialTranscript | null;
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ 
  messages, 
  partialTranscript 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partialTranscript]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200">Conversation</h2>
        <p className="text-sm text-gray-400">Real-time transcription</p>
      </div>

      {/* Messages Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && !partialTranscript && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation to see transcripts appear here.</p>
          </div>
        )}

        {/* Final Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            text={message.text}
            timestamp={message.timestamp}
            isFinal={true}
          />
        ))}

        {/* Partial Transcript (Streaming) */}
        {partialTranscript && (
          <div className="relative">
            <MessageBubble
              role={partialTranscript.role}
              text={partialTranscript.text}
              timestamp={new Date()}
              isFinal={false}
            />
          </div>
        )}
      </div>

      {/* Footer with message count */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
          {partialTranscript && ' • Transcribing...'}
        </p>
      </div>
    </div>
  );
};

export default TranscriptionPanel;