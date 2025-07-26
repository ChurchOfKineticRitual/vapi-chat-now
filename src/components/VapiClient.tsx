import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Vapi Configuration - easily accessible constants
const VAPI_PUBLIC_KEY = 'your_vapi_public_key_here';
const ASSISTANT_ID = 'your_assistant_id_here';

type CallStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'error';

const VapiClient = () => {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [isCallActive, setIsCallActive] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    // Initialize Vapi
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    // Set up event listeners
    vapi.on('call-start', () => {
      console.log('Call started');
      setStatus('connecting');
      setIsCallActive(true);
    });

    vapi.on('call-end', () => {
      console.log('Call ended');
      setStatus('idle');
      setIsCallActive(false);
    });

    vapi.on('speech-start', () => {
      console.log('Speech started');
      setStatus('listening');
    });

    vapi.on('speech-end', () => {
      console.log('Speech ended');
      setStatus('thinking');
    });

    vapi.on('error', (error) => {
      console.error('Vapi error:', error);
      setStatus('error');
      setIsCallActive(false);
    });

    // Cleanup on unmount
    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = async () => {
    if (!vapiRef.current || isCallActive) return;

    try {
      setStatus('connecting');
      await vapiRef.current.start(ASSISTANT_ID);
    } catch (error) {
      console.error('Failed to start call:', error);
      setStatus('error');
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to connect';
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'error':
        return 'Connection error';
      default:
        return 'Ready to connect';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-muted-foreground';
      case 'connecting':
        return 'text-primary text-glow-cyan';
      case 'listening':
        return 'text-primary text-glow-cyan animate-pulse';
      case 'thinking':
        return 'text-accent text-glow-pink';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 glow-subtle">
        <CardContent className="p-8 text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary">
              Nutrition
            </h1>
          </div>

          {/* Start Button */}
          <Button
            onClick={startCall}
            disabled={isCallActive}
            size="lg"
            className={`w-full h-16 text-lg font-semibold transition-all duration-300 ${
              isCallActive 
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : 'bg-gradient-cyber hover:glow-cyan border border-primary/30'
            }`}
          >
            {isCallActive ? 'Call Active' : 'Begin'}
          </Button>

          {/* Status Display */}
          <div className="pt-4 border-t border-border/30">
            <p className={`text-sm font-medium transition-all duration-300 ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VapiClient;