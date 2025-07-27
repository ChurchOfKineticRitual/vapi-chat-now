import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone } from 'lucide-react';
import Vapi from '@vapi-ai/web'; // 1. Import Vapi directly

const VAPI_PUBLIC_KEY = "9a3cbf9c-d1df-476f-984c-ce78100189f9";
const ASSISTANT_ID = "a9cafb7c-3874-433d-b697-9edeb3445575";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapi, setVapi] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 2. Initialize Vapi in a useEffect hook
  useEffect(() => {
    const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);

    vapiInstance.on('call-start', () => {
      console.log('Call started');
      setIsConnected(true);
      setIsLoading(false);
    });

    vapiInstance.on('call-end', () => {
      console.log('Call ended');
      setIsConnected(false);
      setIsLoading(false);
    });

    vapiInstance.on('error', (error: any) => {
      console.error('Vapi error:', error);
      setError(error.message || 'An error occurred');
      setIsLoading(false);
    });

    // 3. Cleanup function to remove listeners
    return () => {
      vapiInstance.removeAllListeners();
    };
  }, []); // The empty dependency array ensures this runs only once

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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 w-full max-w-md border">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Voice Assistant</h1>
            <p className="text-muted-foreground">
              Click the button below to start talking with your AI assistant
            </p>
          </div>

          <div className="flex justify-center">
            <div className={`rounded-full p-6 transition-all duration-300 ${
              isConnected 
                ? 'bg-green-500/20 animate-pulse' 
                : 'bg-primary/10'
            }`}>
              {isConnected ? (
                <Mic className="w-12 h-12 text-green-500" />
              ) : (
                <MicOff className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-4">
            {!isConnected ? (
              <Button 
                onClick={startCall}
                disabled={isLoading || !vapi}
                className="w-full py-6 text-lg"
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
                    Start Call
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
                End Call
              </Button>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Status: {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
