import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  variant?: 'incoming' | 'outgoing';
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ audioUrl, variant = 'incoming' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isOutgoing = variant === 'outgoing';

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        setDuration(audio.duration);
        setCurrentTime(audio.currentTime);
        setIsLoading(false);
      };

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      const handleEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      const handleCanPlay = () => {
        setIsLoading(false);
      };

      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', handleEnd);
      audio.addEventListener('canplay', handleCanPlay);
      
      if (audio.readyState >= 2) {
        setAudioData();
      }

      return () => {
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', handleEnd);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (audioRef.current && !isLoading) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => {
    setPlaybackRate(current => {
        if (current === 1) return 1.5;
        if (current === 1.5) return 2;
        return 1;
    });
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-[210px] xs:max-w-[240px] sm:max-w-xs">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <Button 
        onClick={togglePlay} 
        size="icon" 
        variant="ghost" 
        className={cn(
          "flex-shrink-0 h-8 w-8 transition-colors",
          isOutgoing 
            ? "text-primary-foreground hover:bg-white/20 hover:text-white" 
            : "text-foreground hover:bg-black/5"
        )} 
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </Button>
      
      <div className="flex-grow flex items-center gap-2 min-w-0">
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSliderChange}
          className={cn(
            "flex-1",
            "[&>span:first-child]:h-1",
            isOutgoing 
              ? "[&>span:first-child]:bg-black/20" 
              : "[&>span:first-child]:bg-muted-foreground/20",
            "[&>span:first-child>span]:bg-current",
            isOutgoing ? "text-white" : "text-primary",
            "[&>span[role=slider]]:h-3 [&>span[role=slider]]:w-3 [&>span[role=slider]]:border-0 [&>span[role=slider]]:shadow-sm",
            isOutgoing
               ? "[&>span[role=slider]]:bg-white"
               : "[&>span[role=slider]]:bg-primary"
          )}
          disabled={isLoading || duration === 0}
        />
        
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleSpeed}
            disabled={isLoading}
            className={cn(
                "h-6 px-1 text-[9px] font-medium rounded-full flex-shrink-0 min-w-[2rem] transition-all",
                isOutgoing
                    ? "bg-black/20 text-white hover:bg-black/30 hover:text-white" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
        >
            {playbackRate}x
        </Button>

        <span className={cn(
            "text-[9px] font-mono w-7 text-right flex-shrink-0 tabular-nums",
            isOutgoing ? "text-white/80" : "text-muted-foreground"
        )}>
            {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}