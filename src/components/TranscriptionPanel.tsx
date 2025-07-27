import { useEffect, useRef } from 'react';
import { MessageBubble, type Message } from './MessageBubble';
import { AudioVisualizer } from './AudioVisualizer';
import { cn } from '@/lib/utils';

interface TranscriptionPanelProps {
  messages: Message[];
  currentTranscript: string;
  currentAssistantMessage: string;
  isListening: boolean;
  isSpeaking: boolean;
  volumeLevel: number;
}

export function TranscriptionPanel({ 
  messages, 
  currentTranscript, 
  currentAssistantMessage,
  isListening, 
  isSpeaking,
  volumeLevel 
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript, currentAssistantMessage]);

  // Create temporary messages for current transcript and streaming assistant
  const tempUserMessage: Message | null = currentTranscript ? {
    id: 'temp-user',
    role: 'user',
    content: currentTranscript,
    timestamp: new Date(),
    type: 'transcript'
  } : null;

  const tempAssistantMessage: Message | null = currentAssistantMessage ? {
    id: 'temp-assistant',
    role: 'assistant',
    content: currentAssistantMessage,
    timestamp: new Date(),
    type: 'transcript'
  } : null;

  return (
    <div className="h-80 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            Conversation
          </h3>
          <div className="flex items-center gap-3">
            <AudioVisualizer volumeLevel={volumeLevel} isActive={isListening || isSpeaking} />
            <div className={cn(
              "flex items-center gap-2 text-xs px-2 py-1 rounded-full",
              isListening && "bg-accent/20 text-accent",
              isSpeaking && "bg-primary/20 text-primary",
              !isListening && !isSpeaking && "bg-muted text-muted-foreground"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isListening && "bg-accent pulse-green",
                isSpeaking && "bg-primary animate-pulse",
                !isListening && !isSpeaking && "bg-muted-foreground"
              )} />
              {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Idle'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2 op-art-pattern opacity-5"
        style={{ backgroundAttachment: 'local' }}
      >
        <div className="relative z-10">
          {messages.length === 0 && !currentTranscript && !currentAssistantMessage && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Start speaking to see the conversation...</p>
            </div>
          )}
          
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {tempUserMessage && (
            <MessageBubble message={tempUserMessage} isLatest={true} />
          )}
          
          {tempAssistantMessage && (
            <MessageBubble message={tempAssistantMessage} isLatest={true} />
          )}
        </div>
      </div>
    </div>
  );
}