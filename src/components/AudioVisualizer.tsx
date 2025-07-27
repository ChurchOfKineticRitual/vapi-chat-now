import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  volumeLevel: number;
  isActive: boolean;
}

export function AudioVisualizer({ volumeLevel, isActive }: AudioVisualizerProps) {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const height = Math.max(20, volumeLevel * 100 * (0.5 + Math.random() * 0.5));
    const delay = i * 0.1;
    
    return (
      <div
        key={i}
        className={cn(
          "w-1 bg-accent rounded-full transition-all duration-150",
          isActive ? "animate-pulse" : "opacity-30"
        )}
        style={{
          height: `${isActive ? height : 20}px`,
          animationDelay: `${delay}s`
        }}
      />
    );
  });

  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {bars}
    </div>
  );
}