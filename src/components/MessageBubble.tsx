import React from 'react';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  role, 
  text, 
  timestamp, 
  isFinal 
}) => {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 max-w-xs lg:max-w-md`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-green-600' 
            : 'bg-blue-600'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Message Bubble */}
        <div className={`${isUser ? 'mr-2' : 'ml-2'}`}>
          <div
            className={`px-4 py-2 rounded-lg shadow-sm ${
              isUser
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-100'
            } ${
              !isFinal 
                ? 'opacity-75 border-2 border-dashed border-gray-500' 
                : ''
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </p>
            
            {/* Typing indicator for partial transcripts */}
            {!isFinal && (
              <div className="flex items-center mt-1">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            )}
          </div>

          {/* Timestamp - only show for final messages */}
          {isFinal && (
            <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;