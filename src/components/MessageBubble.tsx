import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'transcript' | 'final' | 'function-call';
}

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

export function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <div className={cn(
      "flex w-full mb-3",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] px-4 py-2 rounded-2xl transition-all duration-200",
        isUser && "bg-accent text-accent-foreground ml-auto",
        message.role === 'assistant' && "bg-secondary text-secondary-foreground",
        isSystem && "bg-muted text-muted-foreground text-sm italic",
        message.type === 'transcript' && !isUser && "opacity-70",
        isLatest && isUser && message.type === 'transcript' && "typing-indicator",
        isLatest && !isUser && message.type === 'transcript' && "streaming-assistant"
      )}>
        <p className="text-sm leading-relaxed break-words">
          {message.content}
        </p>
        <div className={cn(
          "text-xs mt-1 opacity-60",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}